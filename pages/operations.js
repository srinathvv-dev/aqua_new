import React, { useState, useEffect } from 'react';

export default function Operations() {
  const [depth, setDepth] = useState('');
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [log, setLog] = useState('');  // Store logs here
  const [ws, setWs] = useState(null);  // WebSocket state

  const operations = [
    { id: 1, name: 'Depth Operation', description: 'Perform depth calculation' },
    { id: 2, name: 'Other Operation', description: 'Another operation' },
  ];

  const handleOperationSelect = (operation) => {
    setSelectedOperation(operation);
  };

  const handleStartOperation = async () => {
    if (selectedOperation.name === 'Depth Operation' && depth) {
      // Connect to the SSE endpoint for the Depth Operation
      const eventSource = new EventSource(`/api/depth-operation?depth=${depth}`);

      // Listen for incoming messages from SSE (already existing logic)
      eventSource.onmessage = (event) => {
        console.log('Received SSE message:', event.data);
        setLog((prevLog) => `${prevLog}${event.data}\n`);
      };

      eventSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        eventSource.close();
      };
    } else {
      alert('Please provide a valid depth parameter.');
    }
  };

  // WebSocket connection handling
  useEffect(() => {
    // Open WebSocket connection when component mounts
    const socket = new WebSocket('ws://localhost:9090'); // WebSocket server URL
    setWs(socket); // Save socket connection in state

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.topic === '/bar30/all') {
        // Assuming the WebSocket message contains the PID value or other data you need
        const normalizedPidValue = message.data; // Update based on your ROS topic message format
        console.log('Received WebSocket message:', normalizedPidValue);
        
        // Append the normalized PID value to the log
        setLog((prevLog) => `${prevLog}Normalized PID Value: ${normalizedPidValue}\n`);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    // Cleanup WebSocket connection on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);  // Empty dependency array ensures this effect runs only once when the component mounts

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {operations.map((operation) => (
          <div
            key={operation.id}
            className="card p-4 bg-white shadow-md rounded-md"
            onClick={() => handleOperationSelect(operation)}
          >
            <h3 className="text-xl font-bold">{operation.name}</h3>
            <p>{operation.description}</p>
          </div>
        ))}
      </div>

      {selectedOperation && selectedOperation.name === 'Depth Operation' && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Depth</label>
          <input
            type="number"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
          <button
            onClick={handleStartOperation}
            className="mt-4 p-2 bg-blue-500 text-white rounded-md"
          >
            Start Operation
          </button>
        </div>
      )}

      {/* Display logs */}
      <div className="mt-4">
        <h3 className="text-xl font-bold">Logs</h3>
        <pre className="bg-gray-800 text-white p-4">{log}</pre>
      </div>
    </div>
  );
}
