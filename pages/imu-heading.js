import { useEffect, useState } from 'react'; // Import React hooks for state and lifecycle management.
import dynamic from 'next/dynamic'; // Import Next.js dynamic import to load components lazily.
import { createRosWebSocket } from '../lib/ros-websocket'; // Import the function to create WebSocket connections.

/**
 * Dynamically import the Plotly component for plotting data.
 * This is done to ensure the component is only rendered on the client side.
 * 
 * @type {React.ComponentType}
 */
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

/**
 * IMUHeadingPage component to display and monitor IMU (Inertial Measurement Unit) heading data.
 * 
 * @returns {JSX.Element} The rendered IMU heading data monitoring page.
 */
export default function IMUHeadingPage() {
  /**
   * State for storing IMU heading data.
   * 
   * @type {number[]}
   */
  const [headingData, setHeadingData] = useState([]);

  /**
   * State for storing timestamps of received IMU heading data.
   * 
   * @type {string[]}
   */
  const [timestamps, setTimestamps] = useState([]);

  /**
   * Effect hook to set up WebSocket connection and handle IMU heading data updates.
   * 
   * @returns {void} Cleanup function to close WebSocket connection when the component unmounts.
   */
  useEffect(() => {
    // Create a WebSocket connection to the IMU heading topic.
    const ws = createRosWebSocket((message) => {
      const heading = message.data; // Extract heading data from the message

      // Update state with new IMU heading data and timestamps
      setHeadingData((prev) => [...prev.slice(-49), heading]);
      setTimestamps((prev) => [
        ...prev.slice(-49),
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ]);
    });

    // Cleanup function to close the WebSocket connection
    return () => {
      ws.close(); // Close WebSocket connection on component unmount
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Main container with minimum height, dark background, and padding */}
      <div className="max-w-7xl mx-auto">
        {/* Center container with a maximum width for content */}
        <h1 className="text-4xl font-semibold mb-10 text-center text-teal-400">
          IMU (Heading) Sensor Data
        </h1>
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
          {/* Container for the IMU heading data plot */}
          <h2 className="text-lg font-semibold text-center mb-4 text-blue-400">
            Heading (degrees)
          </h2>
          <Plot
            data={[
              {
                x: timestamps, // X-axis data (timestamps)
                y: headingData, // Y-axis data (IMU heading measurements)
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: '#1D8CF8' }, // Color for data points
              },
            ]}
            layout={{
              paper_bgcolor: 'rgba(0, 0, 0, 0)', // Transparent paper background
              plot_bgcolor: 'rgba(0, 0, 0, 0)',  // Transparent plot background
              xaxis: {
                title: 'Time',
                color: '#ffffff',
                gridcolor: '#666666',
                tickcolor: '#ffffff',
                tickfont: { color: '#ffffff' },
              },
              yaxis: {
                title: 'Heading (degrees)',
                color: '#ffffff',
                gridcolor: '#666666',
                tickcolor: '#ffffff',
                tickfont: { color: '#ffffff' },
              },
              margin: { t: 40, b: 50, l: 60, r: 20 }, // Margins for plot
            }}
            useResizeHandler
            style={{ width: '100%', height: '300px' }} // Style for plot dimensions
          />
        </div>
      </div>
    </div>
  );
}
