import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function BatteryPage() {
  const [data, setData] = useState({
    battery1: [],
    battery2: [],
    timestamps: []
  });
  const [latest, setLatest] = useState({
    battery1: null,
    battery2: null,
    timestamp: null
  });
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [darkMode, setDarkMode] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTimes, setElapsedTimes] = useState([]);
  const [currentXRange, setCurrentXRange] = useState([0, 60]); // Start with 0-60 seconds range
  const [voltageRange, setVoltageRange] = useState([12, 18]); // Initial voltage range
  const wsRef = useRef(null);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Update x-axis range dynamically
  useEffect(() => {
    if (elapsedTimes.length === 0) return;

    const lastTime = elapsedTimes[elapsedTimes.length - 1];
    const currentMax = currentXRange[1];
    
    // If we've exceeded the current x-range maximum, extend it by 60 seconds
    if (lastTime > currentMax) {
      const newMax = currentMax + 60;
      setCurrentXRange([0, newMax]); // Always start from 0
    }
  }, [elapsedTimes, currentXRange]);

  // Adjust y-axis ranges based on data
  useEffect(() => {
    if (data.battery1.length > 0 || data.battery2.length > 0) {
      const allVoltages = [...data.battery1, ...data.battery2];
      const minVoltage = Math.min(...allVoltages);
      const maxVoltage = Math.max(...allVoltages);
      
      // Add 0.5V padding to the range, but keep minimum at 12V and maximum at 18V
      const padding = 0.5;
      setVoltageRange([
        Math.max(12, Math.floor(minVoltage - padding)),
        Math.min(18, Math.ceil(maxVoltage + padding))
      ]);
    }
  }, [data.battery1, data.battery2]);

  useEffect(() => {
    const connectWebSocket = () => {
      wsRef.current = new WebSocket('ws://localhost:3001');

      wsRef.current.onopen = () => {
        console.log('Connected to WebSocket server');
        setConnectionStatus('Connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const currentTime = new Date();
          
          if (!startTime) {
            setStartTime(currentTime);
          }

          const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

          if (message.topic === '/battery_voltage') {
            const newData = {
              battery1: message.data.battery1,
              battery2: message.data.battery2,
              timestamp: currentTime.toLocaleTimeString()
            };

            setLatest({
              battery1: newData.battery1,
              battery2: newData.battery2,
              timestamp: newData.timestamp
            });

            setData(prev => ({
              battery1: [...prev.battery1, newData.battery1],
              battery2: [...prev.battery2, newData.battery2],
              timestamps: [...prev.timestamps, elapsedTime]
            }));

            setElapsedTimes(prev => [...prev, elapsedTime]);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Error');
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('Disconnected');
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [startTime]);

  const voltageThresholds = {
    critical: 12.0,
    warning: 14.5,
    healthy: 17.0
  };

  const getBatteryStatus = (voltage) => {
    if (voltage === null || voltage === undefined) return 'unknown';
    if (voltage < voltageThresholds.critical) return 'critical';
    if (voltage < voltageThresholds.warning) return 'warning';
    if (voltage < voltageThresholds.healthy) return 'normal';
    return 'healthy';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'normal': return 'bg-green-500';
      case 'healthy': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const battery1Status = getBatteryStatus(latest.battery1);
  const battery2Status = getBatteryStatus(latest.battery2);

  const downloadCSV = () => {
    const csvHeader = "Timestamp,Elapsed Time (s),Battery 1 (V),Battery 2 (V)\n";
    const csvRows = data.timestamps.map((timestamp, index) => {
      return `${latest.timestamp},${timestamp.toFixed(1)},${data.battery1[index]?.toFixed(2) || ''},${data.battery2[index]?.toFixed(2) || ''}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Battery_Voltage_Data.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>Battery Monitoring</title>
      </Head>

      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4 md:p-8 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className={`text-3xl md:text-4xl font-bold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
              Battery Voltage Monitoring
            </h1>
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`p-6 rounded-lg shadow-lg ${getStatusColor(battery1Status)}`}>
              <h2 className="text-xl font-bold text-center mb-2">Battery 1</h2>
              <p className="text-4xl font-bold text-center">
                {latest.battery1 !== null ? latest.battery1.toFixed(2) + 'V' : 'N/A'}
              </p>
              <p className="text-center mt-2">
                Status: <span className="font-bold">{battery1Status.toUpperCase()}</span>
              </p>
            </div>

            <div className={`p-6 rounded-lg shadow-lg ${getStatusColor(battery2Status)}`}>
              <h2 className="text-xl font-bold text-center mb-2">Battery 2</h2>
              <p className="text-4xl font-bold text-center">
                {latest.battery2 !== null ? latest.battery2.toFixed(2) + 'V' : 'N/A'}
              </p>
              <p className="text-center mt-2">
                Status: <span className="font-bold">{battery2Status.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-center mb-8">
            <button
              onClick={downloadCSV}
              className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors duration-200`}
            >
              Download CSV
            </button>
          </div>

          <div className="space-y-8">
            {/* Battery 1 Plot */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" style={{ color: darkMode ? "#FF6B6B" : "#dc2626" }}>
                  Battery 1 Voltage
                </h2>
                <div className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className="font-mono" style={{ color: darkMode ? "#FF6B6B" : "#dc2626" }}>
                    {latest.battery1 !== null ? `${latest.battery1.toFixed(2)} V` : "N/A"}
                  </span>
                </div>
              </div>
              <Plot
                data={[{
                  x: data.timestamps,
                  y: data.battery1,
                  type: "scatter",
                  mode: "lines",
                  line: { color: darkMode ? "#FF6B6B" : "#dc2626", width: 2, shape: 'linear' },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  autosize: true,
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    range: currentXRange,
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60,
                  },
                  yaxis: {
                    title: "Voltage (V)",
                    range: voltageRange,
                    fixedrange: true,
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
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
                          'xaxis.range': currentXRange,
                          'yaxis.autorange': false,
                          'yaxis.range': voltageRange
                        });
                      }
                    }
                  ]
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>

            {/* Battery 2 Plot */}
            <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" style={{ color: darkMode ? "#4ECDC4" : "#0d9488" }}>
                  Battery 2 Voltage
                </h2>
                <div className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <span className="font-mono" style={{ color: darkMode ? "#4ECDC4" : "#0d9488" }}>
                    {latest.battery2 !== null ? `${latest.battery2.toFixed(2)} V` : "N/A"}
                  </span>
                </div>
              </div>
              <Plot
                data={[{
                  x: data.timestamps,
                  y: data.battery2,
                  type: "scatter",
                  mode: "lines",
                  line: { color: darkMode ? "#4ECDC4" : "#0d9488", width: 2, shape: 'linear' },
                  connectgaps: true,
                }]}
                layout={{
                  paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
                  plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
                  autosize: true,
                  xaxis: {
                    title: "Time (seconds)",
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    range: currentXRange,
                    fixedrange: true,
                    tick0: 0,
                    dtick: 60,
                  },
                  yaxis: {
                    title: "Voltage (V)",
                    range: voltageRange,
                    fixedrange: true,
                    showgrid: true,
                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                    color: darkMode ? '#D1D5DB' : '#4B5563',
                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                    mirror: true,
                    showline: true,
                    zeroline: false,
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
                          'xaxis.range': currentXRange,
                          'yaxis.autorange': false,
                          'yaxis.range': voltageRange
                        });
                      }
                    }
                  ]
                }}
                useResizeHandler
                style={{ width: "100%", height: "300px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}