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
      elapsedTimes: [],
      current: {
        vx: 0, vy: 0, vz: 0,
        altitude: 0, fom: 0,
        velocityValid: false,
        status: 0
      }
    },
    ahrs: {
      data: [],
      elapsedTimes: [],
      current: []
    },
    heading: {
      value: 0,
      elapsedTimes: []
    },
    battery: {
      voltage1: 0,
      voltage2: 0,
      elapsedTimes: []
    }
  });
  
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [allData, setAllData] = useState([]);
  const [rawData, setRawData] = useState('Waiting for data...');
  const [darkMode, setDarkMode] = useState(true);
  const [startTime, setStartTime] = useState(null);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    setConnectionStatus('Connecting to WebSocket...');

    const ws = createRosWebSocket();
    
    ws.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);
        const topic = parsed.topic;
        const messageData = parsed.data;
        const currentTime = new Date();

        // Set start time on first data point
        if (!startTime) {
          setStartTime(currentTime);
        }

        // Calculate elapsed time in seconds
        const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

        setRawData(JSON.stringify(parsed, null, 2));

        // Handle different topics
        switch(topic) {
          case '/dvl/data':
            setData(prev => ({
              ...prev,
              dvl: {
                ...prev.dvl,
                vx: [...prev.dvl.vx, messageData.velocity?.x || 0],
                vy: [...prev.dvl.vy, messageData.velocity?.y || 0],
                vz: [...prev.dvl.vz, messageData.velocity?.z || 0],
                altitude: [...prev.dvl.altitude, messageData.altitude || 0],
                fom: [...prev.dvl.fom, messageData.fom || 0],
                elapsedTimes: [...prev.dvl.elapsedTimes, elapsedTime],
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
                data: [...prev.ahrs.data, messageData.data || []],
                elapsedTimes: [...prev.ahrs.elapsedTimes, elapsedTime],
                current: messageData.data || []
              }
            }));
            break;

          case '/an_device/Heading':
            setData(prev => ({
              ...prev,
              heading: {
                value: messageData.data || 0,
                elapsedTimes: [...prev.heading.elapsedTimes, elapsedTime]
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
                elapsedTimes: [...prev.battery.elapsedTimes, elapsedTime]
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
  }, [startTime]);

  const downloadCSV = () => {
    if (data.dvl.elapsedTimes.length === 0) {
      alert('No data available to export');
      return;
    }

    const csvHeader = "Elapsed Time (s),Vx (m/s),Vy (m/s),Vz (m/s),Altitude (m),FOM,Velocity Valid,Status\n";
    const csvRows = data.dvl.elapsedTimes.map((time, index) => {
      return `${time.toFixed(2)},${data.dvl.vx[index]?.toExponential(6) || '0'},${data.dvl.vy[index]?.toExponential(6) || '0'},${data.dvl.vz[index]?.toExponential(6) || '0'},${data.dvl.altitude[index]?.toFixed(6) || '0'},${data.dvl.fom[index]?.toExponential(6) || '0'},${index === data.dvl.elapsedTimes.length - 1 ? data.dvl.current.velocityValid : 'N/A'},${index === data.dvl.elapsedTimes.length - 1 ? data.dvl.current.status : 'N/A'}`;
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
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
              DVL Data Monitoring
            </h1>
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
          <div className={`text-center mb-6 ${getConnectionStatusColor()}`}>
            {connectionStatus}
          </div>

          {/* Current Values Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>X Velocity</h3>
              <p className={`text-xl font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {formatValue(data.dvl.current.vx, 'm/s')}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Y Velocity</h3>
              <p className={`text-xl font-mono ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {formatValue(data.dvl.current.vy, 'm/s')}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Z Velocity</h3>
              <p className={`text-xl font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {formatValue(data.dvl.current.vz, 'm/s')}
              </p>
            </div>
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</h3>
              <div className="flex items-center">
                <span className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(data.dvl.current.velocityValid)}`}></span>
                <span>{data.dvl.current.velocityValid ? 'Valid' : 'Invalid'}</span>
                <span className={`ml-2 text-xs ${darkMode ? 'opacity-70' : 'text-gray-500'}`}>
                  (Code: {data.dvl.current.status})
                </span>
              </div>
            </div>
          </div>

          {/* Velocity Plots - Horizontal Arrangement */}
          <div className="space-y-8 mb-8">
            {/* X Velocity */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  X Velocity (m/s)
                </h2>
                <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {formatValue(data.dvl.current.vx)}
                </div>
              </div>
              <Plot
                data={[{
                  x: data.dvl.elapsedTimes,
                  y: data.dvl.vx,
                  type: 'scatter',
                  mode: 'lines',
                  line: { 
                    color: darkMode ? '#1D8CF8' : '#2563eb', 
                    width: 1.5,
                    shape: 'linear'
                  },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    range: [0, 1000], // 5 minutes
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60, // Show a tick every minute
                  },
                  yaxis: {
                    title: "Velocity (m/s)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    fixedrange: true,
                    range: [-2, 2] // Fixed range for velocity
                  },
                  hovermode: "x unified",
                  showlegend: false,
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  responsive: true,
                  scrollZoom: true,
                  modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
                  modeBarButtonsToAdd: [
                    {
                      name: 'resetView',
                      title: 'Reset View',
                      icon: {
                        width: 500,
                        height: 600,
                        path: 'M512 256A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM231 127c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-71 71L376 232c13.3 0 24 10.7 24 24s-10.7 24-24 24l-182.1 0 71 71c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L119 273c-9.4-9.4-9.4-24.6 0-33.9L231 127z',
                        transform: 'matrix(-1 0 0 1 0 0)'
                      },
                      click: function(gd) {
                        Plotly.relayout(gd, {
                          'xaxis.autorange': false,
                          'xaxis.range': [0, 300],
                          'yaxis.autorange': false,
                          'yaxis.range': [-2, 2]
                        });
                      }
                    }
                  ]
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>

            {/* Y Velocity */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Y Velocity (m/s)
                </h2>
                <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {formatValue(data.dvl.current.vy)}
                </div>
              </div>
              <Plot
                data={[{
                  x: data.dvl.elapsedTimes,
                  y: data.dvl.vy,
                  type: 'scatter',
                  mode: 'lines',
                  line: { 
                    color: darkMode ? '#4ECDC4' : '#0d9488', 
                    width: 1.5,
                    shape: 'linear'
                  },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    range: [0, 1000], // 5 minutes
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60, // Show a tick every minute
                  },
                  yaxis: {
                    title: "Velocity (m/s)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    fixedrange: true,
                    range: [-2, 2] // Fixed range for velocity
                  },
                  hovermode: "x unified",
                  showlegend: false,
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>

            {/* Z Velocity */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Z Velocity (m/s)
                </h2>
                <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {formatValue(data.dvl.current.vz)}
                </div>
              </div>
              <Plot
                data={[{
                  x: data.dvl.elapsedTimes,
                  y: data.dvl.vz,
                  type: 'scatter',
                  mode: 'lines',
                  line: { 
                    color: darkMode ? '#FF6B6B' : '#dc2626', 
                    width: 1.5,
                    shape: 'linear'
                  },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    range: [0, 1000], // 5 minutes
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60, // Show a tick every minute
                  },
                  yaxis: {
                    title: "Velocity (m/s)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    fixedrange: true,
                    range: [-2, 2] // Fixed range for velocity
                  },
                  hovermode: "x unified",
                  showlegend: false,
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>
          </div>

          {/* Altitude and FOM Plots - Horizontal Arrangement */}
          <div className="space-y-8 mb-8">
            {/* Altitude */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  Altitude (m)
                </h2>
                <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {formatValue(data.dvl.current.altitude)}
                </div>
              </div>
              <Plot
                data={[{
                  x: data.dvl.elapsedTimes,
                  y: data.dvl.altitude,
                  type: 'scatter',
                  mode: 'lines',
                  line: { 
                    color: darkMode ? '#FFD700' : '#ca8a04', 
                    width: 1.5,
                    shape: 'linear'
                  },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    range: [0, 1000], // 5 minutes
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60, // Show a tick every minute
                  },
                  yaxis: {
                    title: "Altitude (m)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    fixedrange: true,
                    range: [0, 100] // Fixed range for altitude
                  },
                  hovermode: "x unified",
                  showlegend: false,
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>

            {/* Figure of Merit */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-1">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  Figure of Merit
                </h2>
                <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {formatValue(data.dvl.current.fom)}
                </div>
              </div>
              <Plot
                data={[{
                  x: data.dvl.elapsedTimes,
                  y: data.dvl.fom,
                  type: 'scatter',
                  mode: 'lines',
                  line: { 
                    color: darkMode ? '#9B59B6' : '#7e22ce', 
                    width: 1.5,
                    shape: 'linear'
                  },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    range: [0, 1000], // 5 minutes
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60, // Show a tick every minute
                  },
                  yaxis: {
                    title: "FOM",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
                    fixedrange: true,
                    range: [0, 10] // Fixed range for FOM
                  },
                  hovermode: "x unified",
                  showlegend: false,
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>
          </div>

          {/* Raw Data and Export Section */}
          <div className="grid grid-cols-1 gap-6">
            <div className={`rounded-lg p-4 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} flex justify-center`}>
              <button
                onClick={downloadCSV}
                className={`px-6 py-2 ${darkMode ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-700 hover:bg-teal-600'} text-white rounded-lg shadow-md font-medium transition-colors`}
                disabled={data.dvl.elapsedTimes.length === 0}
              >
                {data.dvl.elapsedTimes.length === 0 ? 'No Data to Export' : 'Export Data (CSV)'}
              </button>
            </div>

            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  Raw Data
                </h2>
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Elapsed: {data.dvl.elapsedTimes.length > 0 ? `${data.dvl.elapsedTimes[data.dvl.elapsedTimes.length - 1].toFixed(1)}s` : 'N/A'}
                </span>
              </div>
              <pre className={`text-xs p-4 rounded overflow-x-auto max-h-60 ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                {rawData}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}