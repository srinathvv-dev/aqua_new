// import { useEffect, useState } from 'react';
// import dynamic from 'next/dynamic';
// import { createRosWebSocket } from '../lib/ros-websocket';

// const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// function ErrorBoundary({ children }) {
//   const [hasError, setHasError] = useState(false);

//   useEffect(() => {
//     const errorHandler = (error) => {
//       console.error('Error caught by boundary:', error);
//       setHasError(true);
//     };
//     window.addEventListener('error', errorHandler);
//     return () => window.removeEventListener('error', errorHandler);
//   }, []);

//   if (hasError) {
//     return <div className="text-red-500 p-4">Error displaying DVL data</div>;
//   }

//   return children;
// }

// export default function DvlPage() {
//   // Velocity states
//   const [vx, setVx] = useState([]);
//   const [vy, setVy] = useState([]);
//   const [vz, setVz] = useState([]);
  
//   // Additional DVL metrics
//   const [altitude, setAltitude] = useState([]);
//   const [fom, setFom] = useState([]);
  
//   // Timestamps and raw data
//   const [timestamps, setTimestamps] = useState([]);
//   const [rawData, setRawData] = useState(null);
//   const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  
//   // Complete data history for CSV export
//   const [allData, setAllData] = useState([]);
  
//   // Current values display
//   const [currentValues, setCurrentValues] = useState({
//     vx: null,
//     vy: null,
//     vz: null,
//     altitude: null,
//     fom: null,
//     velocityValid: false,
//     status: null
//   });

//   useEffect(() => {
//     console.log('Initializing DVL WebSocket connection...');
//     setConnectionStatus('Connecting to WebSocket...');

//     const ws = createRosWebSocket('/dvl/data', (message) => {
//       try {
//         console.log('Raw message received:', message);
        
//         // Enhanced data parsing
//         let data;
//         if (typeof message.data === 'string') {
//           try {
//             data = JSON.parse(message.data);
//           } catch (e) {
//             // Handle case where message.data might be a JSON string within a string
//             try {
//               data = JSON.parse(JSON.parse(message.data));
//             } catch (e2) {
//               console.error('Double JSON parse failed, using raw:', message.data);
//               data = message.data;
//             }
//           }
//         } else {
//           data = message.data?.msg || message.data;
//         }

//         console.log('Parsed DVL data:', data);
//         setRawData(JSON.stringify(data, null, 2));
//         setConnectionStatus('Connected - Receiving data');

//         // Current timestamp
//         const currentTime = new Date().toLocaleTimeString([], { 
//           hour: '2-digit', 
//           minute: '2-digit',
//           second: '2-digit',
//           fractionalSecondDigits: 3
//         });

//         // Safely extract values with defaults
//         const velocityX = data.velocity?.x ?? data.velocity?.velocity_x ?? 0;
//         const velocityY = data.velocity?.y ?? data.velocity?.velocity_y ?? 0;
//         const velocityZ = data.velocity?.z ?? data.velocity?.velocity_z ?? 0;
//         const currentAltitude = data.altitude ?? data.distance ?? 0;
//         const currentFom = data.fom ?? data.figure_of_merit ?? 0;
//         const isValid = data.velocity_valid ?? data.valid ?? false;
//         const currentStatus = data.status ?? 0;

//         // Update velocity data (last 50 points)
//         setVx(prev => [...prev.slice(-49), velocityX]);
//         setVy(prev => [...prev.slice(-49), velocityY]);
//         setVz(prev => [...prev.slice(-49), velocityZ]);
        
//         // Update other metrics
//         setAltitude(prev => [...prev.slice(-49), currentAltitude]);
//         setFom(prev => [...prev.slice(-49), currentFom]);
        
//         // Update timestamps
//         setTimestamps(prev => [...prev.slice(-49), currentTime]);
        
//         // Store all data for CSV export
//         setAllData(prev => [...prev, {
//           timestamp: currentTime,
//           vx: velocityX,
//           vy: velocityY,
//           vz: velocityZ,
//           altitude: currentAltitude,
//           fom: currentFom,
//           velocityValid: isValid,
//           status: currentStatus
//         }]);
        
//         // Update current values
//         setCurrentValues({
//           vx: velocityX,
//           vy: velocityY,
//           vz: velocityZ,
//           altitude: currentAltitude,
//           fom: currentFom,
//           velocityValid: isValid,
//           status: currentStatus
//         });

//       } catch (error) {
//         console.error('Error processing DVL data:', error);
//         setConnectionStatus(`Error: ${error.message}`);
//       }
//     });

//     ws.onerror = (error) => {
//       console.error('WebSocket error:', error);
//       setConnectionStatus('WebSocket error - See console');
//     };

//     ws.onclose = () => {
//       console.log('WebSocket closed');
//       setConnectionStatus('Disconnected - Attempting to reconnect...');
//     };

//     return () => {
//       console.log('Cleaning up WebSocket');
//       ws.close();
//     };
//   }, []);

//   // Function to download CSV
//   const downloadCSV = () => {
//     if (allData.length === 0) {
//       alert('No data available to export');
//       return;
//     }

//     const csvHeader = "Timestamp,Vx (m/s),Vy (m/s),Vz (m/s),Altitude (m),FOM,Velocity Valid,Status\n";
//     const csvRows = allData.map(item => {
//       return `"${item.timestamp}",${item.vx?.toExponential(6) || '0'},${item.vy?.toExponential(6) || '0'},${item.vz?.toExponential(6) || '0'},${item.altitude?.toFixed(6) || '0'},${item.fom?.toExponential(6) || '0'},${item.velocityValid},${item.status}`;
//     });

//     const csvContent = csvHeader + csvRows.join("\n");
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `DVL_Data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   // Function to get status color
//   const getStatusColor = (valid) => {
//     return valid ? 'bg-green-500' : 'bg-red-500';
//   };

//   // Function to get connection status color
//   const getConnectionStatusColor = () => {
//     if (connectionStatus.includes('Error') || connectionStatus.includes('Disconnected')) {
//       return 'text-red-500';
//     } else if (connectionStatus.includes('Connected')) {
//       return 'text-green-500';
//     }
//     return 'text-yellow-500';
//   };

//   return (
//     <ErrorBoundary>
//       <div className="min-h-screen bg-gray-900 text-white p-8">
//         <div className="max-w-7xl mx-auto">
//           <h1 className="text-4xl font-semibold mb-2 text-center text-teal-400">
//             DVL Data Monitoring
//           </h1>
//           <div className={`text-center mb-6 ${getConnectionStatusColor()}`}>
//             {connectionStatus}
//           </div>
          
//           {/* Current Values Overview */}
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//             <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
//               <h3 className="text-sm text-gray-400">X Velocity</h3>
//               <p className="text-xl font-mono text-blue-400">
//                 {currentValues.vx !== null ? currentValues.vx.toExponential(4) + ' m/s' : 'N/A'}
//               </p>
//             </div>
//             <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
//               <h3 className="text-sm text-gray-400">Y Velocity</h3>
//               <p className="text-xl font-mono text-green-400">
//                 {currentValues.vy !== null ? currentValues.vy.toExponential(4) + ' m/s' : 'N/A'}
//               </p>
//             </div>
//             <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
//               <h3 className="text-sm text-gray-400">Z Velocity</h3>
//               <p className="text-xl font-mono text-red-400">
//                 {currentValues.vz !== null ? currentValues.vz.toExponential(4) + ' m/s' : 'N/A'}
//               </p>
//             </div>
//             <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
//               <h3 className="text-sm text-gray-400">Status</h3>
//               <div className="flex items-center">
//                 <span className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(currentValues.velocityValid)}`}></span>
//                 <span>{currentValues.velocityValid ? 'Valid' : 'Invalid'}</span>
//                 <span className="ml-2 text-xs opacity-70">(Code: {currentValues.status})</span>
//               </div>
//             </div>
//           </div>

//           {/* Rest of your component remains the same */}
//           {/* Velocity Graphs */}
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//             {/* X Velocity */}
//             <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-lg font-semibold text-blue-400">
//                   X Velocity (m/s)
//                 </h2>
//                 <span className="text-sm text-gray-400">
//                   {timestamps[timestamps.length - 1] || 'No data'}
//                 </span>
//               </div>
//               <Plot
//                 data={[{
//                   x: timestamps,
//                   y: vx,
//                   type: 'scatter',
//                   mode: 'lines+markers',
//                   marker: { color: '#1D8CF8', size: 5 },
//                   line: { color: '#1D8CF8', width: 2 },
//                 }]}
//                 layout={{
//                   paper_bgcolor: 'rgba(0, 0, 0, 0)',
//                   plot_bgcolor: 'rgba(0, 0, 0, 0)',
//                   xaxis: {
//                     title: 'Time',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     tickangle: -45,
//                   },
//                   yaxis: {
//                     title: 'Velocity (m/s)',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     zerolinecolor: '#666666',
//                     type: 'linear',
//                     exponentformat: 'e',
//                   },
//                   margin: { t: 30, b: 70, l: 60, r: 30 },
//                 }}
//                 useResizeHandler
//                 style={{ width: '100%', height: '300px' }}
//               />
//             </div>

//             {/* Y Velocity */}
//             <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-lg font-semibold text-green-400">
//                   Y Velocity (m/s)
//                 </h2>
//                 <span className="text-sm text-gray-400">
//                   {timestamps[timestamps.length - 1] || 'No data'}
//                 </span>
//               </div>
//               <Plot
//                 data={[{
//                   x: timestamps,
//                   y: vy,
//                   type: 'scatter',
//                   mode: 'lines+markers',
//                   marker: { color: '#4ECDC4', size: 5 },
//                   line: { color: '#4ECDC4', width: 2 },
//                 }]}
//                 layout={{
//                   paper_bgcolor: 'rgba(0, 0, 0, 0)',
//                   plot_bgcolor: 'rgba(0, 0, 0, 0)',
//                   xaxis: {
//                     title: 'Time',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     tickangle: -45,
//                   },
//                   yaxis: {
//                     title: 'Velocity (m/s)',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     zerolinecolor: '#666666',
//                     type: 'linear',
//                     exponentformat: 'e',
//                   },
//                   margin: { t: 30, b: 70, l: 60, r: 30 },
//                 }}
//                 useResizeHandler
//                 style={{ width: '100%', height: '300px' }}
//               />
//             </div>

//             {/* Z Velocity */}
//             <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-lg font-semibold text-red-400">
//                   Z Velocity (m/s)
//                 </h2>
//                 <span className="text-sm text-gray-400">
//                   {timestamps[timestamps.length - 1] || 'No data'}
//                 </span>
//               </div>
//               <Plot
//                 data={[{
//                   x: timestamps,
//                   y: vz,
//                   type: 'scatter',
//                   mode: 'lines+markers',
//                   marker: { color: '#FF6B6B', size: 5 },
//                   line: { color: '#FF6B6B', width: 2 },
//                 }]}
//                 layout={{
//                   paper_bgcolor: 'rgba(0, 0, 0, 0)',
//                   plot_bgcolor: 'rgba(0, 0, 0, 0)',
//                   xaxis: {
//                     title: 'Time',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     tickangle: -45,
//                   },
//                   yaxis: {
//                     title: 'Velocity (m/s)',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     zerolinecolor: '#666666',
//                     type: 'linear',
//                     exponentformat: 'e',
//                   },
//                   margin: { t: 30, b: 70, l: 60, r: 30 },
//                 }}
//                 useResizeHandler
//                 style={{ width: '100%', height: '300px' }}
//               />
//             </div>
//           </div>

//           {/* Additional Metrics */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
//             {/* Altitude Graph */}
//             <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
//               <h2 className="text-lg font-semibold mb-4 text-yellow-400">
//                 Altitude (m)
//               </h2>
//               <Plot
//                 data={[{
//                   x: timestamps,
//                   y: altitude,
//                   type: 'scatter',
//                   mode: 'lines+markers',
//                   marker: { color: '#FFD700', size: 5 },
//                   line: { color: '#FFD700', width: 2 },
//                 }]}
//                 layout={{
//                   paper_bgcolor: 'rgba(0, 0, 0, 0)',
//                   plot_bgcolor: 'rgba(0, 0, 0, 0)',
//                   xaxis: {
//                     title: 'Time',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     tickangle: -45,
//                   },
//                   yaxis: {
//                     title: 'Altitude (m)',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                   },
//                   margin: { t: 30, b: 70, l: 60, r: 30 },
//                 }}
//                 useResizeHandler
//                 style={{ width: '100%', height: '300px' }}
//               />
//             </div>

//             {/* Figure of Merit Graph */}
//             <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
//               <h2 className="text-lg font-semibold mb-4 text-purple-400">
//                 Figure of Merit
//               </h2>
//               <Plot
//                 data={[{
//                   x: timestamps,
//                   y: fom,
//                   type: 'scatter',
//                   mode: 'lines+markers',
//                   marker: { color: '#9B59B6', size: 5 },
//                   line: { color: '#9B59B6', width: 2 },
//                 }]}
//                 layout={{
//                   paper_bgcolor: 'rgba(0, 0, 0, 0)',
//                   plot_bgcolor: 'rgba(0, 0, 0, 0)',
//                   xaxis: {
//                     title: 'Time',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                     tickangle: -45,
//                   },
//                   yaxis: {
//                     title: 'FOM',
//                     color: '#ffffff',
//                     gridcolor: '#666666',
//                   },
//                   margin: { t: 30, b: 70, l: 60, r: 30 },
//                 }}
//                 useResizeHandler
//                 style={{ width: '100%', height: '300px' }}
//               />
//             </div>
//           </div>

//           {/* Data Section */}
//           <div className="grid grid-cols-1 gap-6">
//             {/* Controls */}
//             <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 flex justify-center">
//               <button
//                 onClick={downloadCSV}
//                 className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg shadow-md font-medium transition-colors"
//                 disabled={allData.length === 0}
//               >
//                 {allData.length === 0 ? 'No Data to Export' : 'Export Data (CSV)'}
//               </button>
//             </div>

//             {/* Raw Data Display */}
//             <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
//               <div className="flex justify-between items-center mb-4">
//                 <h2 className="text-lg font-semibold text-yellow-400">
//                   Raw DVL Data
//                 </h2>
//                 <span className="text-xs text-gray-400">
//                   Last update: {timestamps[timestamps.length - 1] || 'Never'}
//                 </span>
//               </div>
//               <pre className="text-xs bg-gray-900 p-4 rounded overflow-x-auto text-gray-300 max-h-60">
//                 {rawData || 'Waiting for data...'}
//               </pre>
//             </div>
//           </div>
//         </div>
//       </div>
//     </ErrorBoundary>
//   );
// }

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      console.error('Error caught by boundary:', error);
      setHasError(true);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return <div className="text-red-500 p-4">Error displaying DVL data</div>;
  }

  return children;
}

function createRosWebSocket() {
  return {
    onmessage: null,
    onerror: null,
    onclose: null,
    close: () => {},

    connect: function() {
      console.log('Attempting to connect to WebSocket');
      this.ws = new WebSocket('ws://localhost:3001');

      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(message) });
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
          if (this.onerror) this.onerror(err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (this.onerror) this.onerror(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        if (this.onclose) this.onclose();
      };

      this.close = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    }
  };
}

export default function DvlPage() {
  const [data, setData] = useState({
    dvl: {
      vx: [], vy: [], vz: [],
      altitude: [], fom: [],
      timestamps: [],
      current: {
        vx: 0, vy: 0, vz: 0,
        altitude: 0, fom: 0,
        velocityValid: false,
        status: 0
      }
    },
    ahrs: {
      data: [],
      timestamps: [],
      current: []
    },
    heading: {
      value: 0,
      timestamps: []
    },
    battery: {
      voltage1: 0,
      voltage2: 0,
      timestamps: []
    }
  });
  
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [allData, setAllData] = useState([]);
  const [rawData, setRawData] = useState('Waiting for data...');

  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    setConnectionStatus('Connecting to WebSocket...');

    const ws = createRosWebSocket();
    
    ws.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);
        const topic = parsed.topic;
        const messageData = parsed.data;
        const currentTime = new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3
        });

        setRawData(JSON.stringify(parsed, null, 2));

        // Handle different topics
        switch(topic) {
          case '/dvl/data':
            setData(prev => ({
              ...prev,
              dvl: {
                ...prev.dvl,
                vx: [...prev.dvl.vx.slice(-49), messageData.velocity?.x || 0],
                vy: [...prev.dvl.vy.slice(-49), messageData.velocity?.y || 0],
                vz: [...prev.dvl.vz.slice(-49), messageData.velocity?.z || 0],
                altitude: [...prev.dvl.altitude.slice(-49), messageData.altitude || 0],
                fom: [...prev.dvl.fom.slice(-49), messageData.fom || 0],
                timestamps: [...prev.dvl.timestamps.slice(-49), currentTime],
                current: {
                  vx: messageData.velocity?.x || 0,
                  vy: messageData.velocity?.y || 0,
                  vz: messageData.velocity?.z || 0,
                  altitude: messageData.altitude || 0,
                  fom: messageData.fom || 0,
                  velocityValid: messageData.velocity_valid || false,
                  status: messageData.status || 0
                }
              }
            }));
            break;

          case '/ahrs':
            setData(prev => ({
              ...prev,
              ahrs: {
                data: [...prev.ahrs.data.slice(-49), messageData.data || []],
                timestamps: [...prev.ahrs.timestamps.slice(-49), currentTime],
                current: messageData.data || []
              }
            }));
            break;

          case '/an_device/Heading':
            setData(prev => ({
              ...prev,
              heading: {
                value: messageData.data || 0,
                timestamps: [...prev.heading.timestamps.slice(-49), currentTime]
              }
            }));
            break;

          case '/battery_voltage_1':
          case '/battery_voltage_2':
            setData(prev => ({
              ...prev,
              battery: {
                voltage1: topic === '/battery_voltage_1' ? messageData.data : prev.battery.voltage1,
                voltage2: topic === '/battery_voltage_2' ? messageData.data : prev.battery.voltage2,
                timestamps: [...prev.battery.timestamps.slice(-49), currentTime]
              }
            }));
            break;

          default:
            console.log('Received message from unhandled topic:', topic);
        }

        setConnectionStatus('Connected - Receiving data');
      } catch (error) {
        console.error('Error processing message:', error);
        setConnectionStatus(`Error: ${error.message}`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('WebSocket error - See console');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setConnectionStatus('Disconnected - Attempting to reconnect...');
    };

    ws.connect();

    return () => {
      console.log('Cleaning up WebSocket');
      ws.close();
    };
  }, []);

  const downloadCSV = () => {
    if (allData.length === 0) {
      alert('No data available to export');
      return;
    }

    const csvHeader = "Timestamp,Vx (m/s),Vy (m/s),Vz (m/s),Altitude (m),FOM,Velocity Valid,Status\n";
    const csvRows = allData.map(item => {
      return `"${item.timestamp}",${item.vx?.toExponential(6) || '0'},${item.vy?.toExponential(6) || '0'},${item.vz?.toExponential(6) || '0'},${item.altitude?.toFixed(6) || '0'},${item.fom?.toExponential(6) || '0'},${item.velocityValid},${item.status}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `DVL_Data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (valid) => {
    return valid ? 'bg-green-500' : 'bg-red-500';
  };

  const getConnectionStatusColor = () => {
    if (connectionStatus.includes('Error') || connectionStatus.includes('Disconnected')) {
      return 'text-red-500';
    } else if (connectionStatus.includes('Connected')) {
      return 'text-green-500';
    }
    return 'text-yellow-500';
  };

  const formatValue = (value, unit = '') => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return Math.abs(value) < 0.001 ? 
        `${value.toExponential(2)} ${unit}` : 
        `${value.toFixed(4)} ${unit}`;
    }
    return `${value} ${unit}`;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-semibold mb-2 text-center text-teal-400">
            DVL Data Monitoring
          </h1>
          <div className={`text-center mb-6 ${getConnectionStatusColor()}`}>
            {connectionStatus}
          </div>

          {/* Current Values Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm text-gray-400">X Velocity</h3>
              <p className="text-xl font-mono text-blue-400">
                {formatValue(data.dvl.current.vx, 'm/s')}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm text-gray-400">Y Velocity</h3>
              <p className="text-xl font-mono text-green-400">
                {formatValue(data.dvl.current.vy, 'm/s')}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm text-gray-400">Z Velocity</h3>
              <p className="text-xl font-mono text-red-400">
                {formatValue(data.dvl.current.vz, 'm/s')}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm text-gray-400">Status</h3>
              <div className="flex items-center">
                <span className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(data.dvl.current.velocityValid)}`}></span>
                <span>{data.dvl.current.velocityValid ? 'Valid' : 'Invalid'}</span>
                <span className="ml-2 text-xs opacity-70">(Code: {data.dvl.current.status})</span>
              </div>
            </div>
          </div>

          {/* DVL Data Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* X Velocity */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold text-blue-400">
                  X Velocity
                </h2>
                <div className="text-lg font-mono bg-gray-700 px-2 py-1 rounded">
                  {formatValue(data.dvl.current.vx, 'm/s')}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {data.dvl.timestamps[data.dvl.timestamps.length - 1] || 'No data'}
              </div>
              <Plot
                data={[{
                  x: data.dvl.timestamps,
                  y: data.dvl.vx,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#1D8CF8', size: 5 },
                  line: { color: '#1D8CF8', width: 2 },
                }]}
                layout={{
                  paper_bgcolor: 'rgba(0, 0, 0, 0)',
                  plot_bgcolor: 'rgba(0, 0, 0, 0)',
                  xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666', tickangle: -45 },
                  yaxis: { title: 'Velocity (m/s)', color: '#ffffff', gridcolor: '#666666' },
                  margin: { t: 10, b: 60, l: 60, r: 30 },
                }}
                useResizeHandler
                style={{ width: '100%', height: '250px' }}
              />
            </div>

            {/* Y Velocity */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold text-green-400">
                  Y Velocity
                </h2>
                <div className="text-lg font-mono bg-gray-700 px-2 py-1 rounded">
                  {formatValue(data.dvl.current.vy, 'm/s')}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {data.dvl.timestamps[data.dvl.timestamps.length - 1] || 'No data'}
              </div>
              <Plot
                data={[{
                  x: data.dvl.timestamps,
                  y: data.dvl.vy,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#4ECDC4', size: 5 },
                  line: { color: '#4ECDC4', width: 2 },
                }]}
                layout={{
                  paper_bgcolor: 'rgba(0, 0, 0, 0)',
                  plot_bgcolor: 'rgba(0, 0, 0, 0)',
                  xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666', tickangle: -45 },
                  yaxis: { title: 'Velocity (m/s)', color: '#ffffff', gridcolor: '#666666' },
                  margin: { t: 10, b: 60, l: 60, r: 30 },
                }}
                useResizeHandler
                style={{ width: '100%', height: '250px' }}
              />
            </div>

            {/* Z Velocity */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold text-red-400">
                  Z Velocity
                </h2>
                <div className="text-lg font-mono bg-gray-700 px-2 py-1 rounded">
                  {formatValue(data.dvl.current.vz, 'm/s')}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {data.dvl.timestamps[data.dvl.timestamps.length - 1] || 'No data'}
              </div>
              <Plot
                data={[{
                  x: data.dvl.timestamps,
                  y: data.dvl.vz,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#FF6B6B', size: 5 },
                  line: { color: '#FF6B6B', width: 2 },
                }]}
                layout={{
                  paper_bgcolor: 'rgba(0, 0, 0, 0)',
                  plot_bgcolor: 'rgba(0, 0, 0, 0)',
                  xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666', tickangle: -45 },
                  yaxis: { title: 'Velocity (m/s)', color: '#ffffff', gridcolor: '#666666' },
                  margin: { t: 10, b: 60, l: 60, r: 30 },
                }}
                useResizeHandler
                style={{ width: '100%', height: '250px' }}
              />
            </div>
          </div>

          {/* Additional DVL Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Altitude */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold text-yellow-400">
                  Altitude
                </h2>
                <div className="text-lg font-mono bg-gray-700 px-2 py-1 rounded">
                  {formatValue(data.dvl.current.altitude, 'm')}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {data.dvl.timestamps[data.dvl.timestamps.length - 1] || 'No data'}
              </div>
              <Plot
                data={[{
                  x: data.dvl.timestamps,
                  y: data.dvl.altitude,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#FFD700', size: 5 },
                  line: { color: '#FFD700', width: 2 },
                }]}
                layout={{
                  paper_bgcolor: 'rgba(0, 0, 0, 0)',
                  plot_bgcolor: 'rgba(0, 0, 0, 0)',
                  xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666', tickangle: -45 },
                  yaxis: { title: 'Altitude (m)', color: '#ffffff', gridcolor: '#666666' },
                  margin: { t: 10, b: 60, l: 60, r: 30 },
                }}
                useResizeHandler
                style={{ width: '100%', height: '250px' }}
              />
            </div>

            {/* Figure of Merit */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold text-purple-400">
                  Figure of Merit
                </h2>
                <div className="text-lg font-mono bg-gray-700 px-2 py-1 rounded">
                  {formatValue(data.dvl.current.fom)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {data.dvl.timestamps[data.dvl.timestamps.length - 1] || 'No data'}
              </div>
              <Plot
                data={[{
                  x: data.dvl.timestamps,
                  y: data.dvl.fom,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#9B59B6', size: 5 },
                  line: { color: '#9B59B6', width: 2 },
                }]}
                layout={{
                  paper_bgcolor: 'rgba(0, 0, 0, 0)',
                  plot_bgcolor: 'rgba(0, 0, 0, 0)',
                  xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666', tickangle: -45 },
                  yaxis: { title: 'FOM', color: '#ffffff', gridcolor: '#666666' },
                  margin: { t: 10, b: 60, l: 60, r: 30 },
                }}
                useResizeHandler
                style={{ width: '100%', height: '250px' }}
              />
            </div>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-blue-400">
                AHRS Data
              </h2>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {data.ahrs.current.map((value, i) => (
                  <div key={i} className="text-center">
                    <div className="text-xs text-gray-400">Axis {i}</div>
                    <div className="text-sm font-mono">
                      {formatValue(value)}
                    </div>
                  </div>
                ))}
              </div>
              <Plot
                data={data.ahrs.data.map((values, i) => ({
                  y: values,
                  type: 'scatter',
                  mode: 'lines',
                  name: `Axis ${i}`
                }))}
                layout={{
                  paper_bgcolor: 'rgba(0, 0, 0, 0)',
                  plot_bgcolor: 'rgba(0, 0, 0, 0)',
                  xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666' },
                  yaxis: { title: 'Value', color: '#ffffff', gridcolor: '#666666' },
                  margin: { t: 10, b: 60, l: 60, r: 30 },
                }}
                useResizeHandler
                style={{ width: '100%', height: '250px' }}
              />
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-green-400">
                Heading
              </h2>
              <div className="text-4xl font-mono text-center py-8">
                {data.heading.value.toFixed(2)}°
              </div>
              <div className="text-xs text-gray-400 text-center mt-2">
                Last update: {data.heading.timestamps[data.heading.timestamps.length - 1] || 'Never'}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 text-red-400">
                Battery Voltage
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400">Battery 1</div>
                  <div className="text-2xl font-mono">
                    {data.battery.voltage1.toFixed(2)}V
                  </div>
                </div>
                <div className="text-center bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400">Battery 2</div>
                  <div className="text-2xl font-mono">
                    {data.battery.voltage2.toFixed(2)}V
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 text-center">
                Last update: {data.battery.timestamps[data.battery.timestamps.length - 1] || 'Never'}
              </div>
            </div>
          </div> */}

          {/* Raw Data and Export Section */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 flex justify-center">
              <button
                onClick={downloadCSV}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg shadow-md font-medium transition-colors"
                disabled={allData.length === 0}
              >
                {allData.length === 0 ? 'No Data to Export' : 'Export Data (CSV)'}
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-yellow-400">
                  Raw Data
                </h2>
                <span className="text-xs text-gray-400">
                  Last update: {data.dvl.timestamps[data.dvl.timestamps.length - 1] || 'Never'}
                </span>
              </div>
              <pre className="text-xs bg-gray-900 p-4 rounded overflow-x-auto text-gray-300 max-h-60">
                {rawData}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}