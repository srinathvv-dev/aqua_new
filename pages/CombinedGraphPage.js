// pages/combined.js
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";

// Dynamically import the Plot component
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Sensor configuration
const SENSORS = {
  depth_impact: {
    name: "Depth Impact",
    endpoint: "/depth_impact",
    dataKeys: ["Depth", "Temperature", "Pressure"],
    units: ["m", "°C", "mbar"],
    colors: ["#4ECDC4", "#FF6B6B", "#1D8CF8"],
    yRanges: [[0, 5], [0, 40], [0, 2000]]
  },
  ahrs: {
    name: "AHRS",
    endpoint: "/ahrs",
    dataKeys: ["Heading", "Pitch", "Roll"],
    units: ["°", "°", "°"],
    colors: ["#1D8CF8", "#4ECDC4", "#FF6B6B"],
    yRanges: [[0, 360], [-15, 15], [-15, 15]]
  },
  battery: {
    name: "Battery",
    endpoint: "/battery_voltage",
    dataKeys: ["battery1", "battery2"],
    units: ["V", "V"],
    colors: ["#FF6B6B", "#4ECDC4"],
    yRanges: [[12, 18], [12, 18]],
    isBattery: true
  },
  dvl: {
    name: "DVL",
    endpoint: "/dvl/data",
    dataKeys: ["vx", "vy", "vz", "altitude", "fom"],
    units: ["m/s", "m/s", "m/s", "m", ""],
    colors: ["#1D8CF8", "#4ECDC4", "#FF6B6B", "#FFD700", "#9B59B6"],
    yRanges: [[-2, 2], [-2, 2], [-2, 2], [0, 100], [0, 10]],
    isDVL: true
  }
};

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
    return <div className="text-red-500 p-4">Error displaying component</div>;
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

export default function CombinedSensorPage() {
  const [sensorData, setSensorData] = useState({});
  const [timestamps, setTimestamps] = useState([]);
  const [elapsedTimes, setElapsedTimes] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedSensors, setSelectedSensors] = useState({
    depth_impact: true,
    ahrs: true,
    battery: true,
    dvl: true
  });
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [rawData, setRawData] = useState('Waiting for data...');
  const wsRef = useRef(null);

  // Initialize sensor data structure
  useEffect(() => {
    const initialData = {};
    Object.keys(SENSORS).forEach(sensorKey => {
      initialData[sensorKey] = {};
      SENSORS[sensorKey].dataKeys.forEach((key, idx) => {
        initialData[sensorKey][key] = [];
      });
      
      // Special initialization for DVL
      if (sensorKey === 'dvl') {
        initialData[sensorKey].current = {
          vx: 0, vy: 0, vz: 0,
          altitude: 0, fom: 0,
          velocityValid: false,
          status: 0
        };
      }
    });
    setSensorData(initialData);
  }, []);

  // Toggle sensor selection
  const toggleSensor = (sensorKey) => {
    setSelectedSensors(prev => ({
      ...prev,
      [sensorKey]: !prev[sensorKey]
    }));
  };

  // WebSocket connections
  useEffect(() => {
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

        // Update timestamps
        setTimestamps(prev => [...prev, currentTime.toLocaleTimeString()]);
        setElapsedTimes(prev => [...prev, elapsedTime]);

        // Update sensor data
        setSensorData(prev => {
          const newData = {...prev};
          
          // Handle DVL data
          if (topic === '/dvl/data' && selectedSensors.dvl) {
            newData.dvl = {
              ...newData.dvl,
              vx: [...newData.dvl.vx, messageData.velocity?.x || 0],
              vy: [...newData.dvl.vy, messageData.velocity?.y || 0],
              vz: [...newData.dvl.vz, messageData.velocity?.z || 0],
              altitude: [...newData.dvl.altitude, messageData.altitude || 0],
              fom: [...newData.dvl.fom, messageData.fom || 0],
              current: {
                vx: messageData.velocity?.x || 0,
                vy: messageData.velocity?.y || 0,
                vz: messageData.velocity?.z || 0,
                altitude: messageData.altitude || 0,
                fom: messageData.fom || 0,
                velocityValid: messageData.velocity_valid || false,
                status: messageData.status || 0
              }
            };
          }
          // Handle battery data
          else if (topic === '/battery_voltage' && selectedSensors.battery) {
            newData.battery.battery1 = [...newData.battery.battery1, messageData.battery1];
            newData.battery.battery2 = [...newData.battery.battery2, messageData.battery2];
          } 
          // Handle other sensors
          else {
            Object.keys(selectedSensors).forEach(sensorKey => {
              if (selectedSensors[sensorKey] && topic === SENSORS[sensorKey].endpoint) {
                const sensorConfig = SENSORS[sensorKey];
                sensorConfig.dataKeys.forEach((key, idx) => {
                  if (!newData[sensorKey][key]) {
                    newData[sensorKey][key] = [];
                  }
                  newData[sensorKey][key] = [...newData[sensorKey][key], messageData[idx] || 0];
                });
              }
            });
          }
          
          return newData;
        });

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
    wsRef.current = ws;

    return () => {
      console.log('Cleaning up WebSocket');
      ws.close();
    };
  }, [selectedSensors, startTime]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Battery status thresholds
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

  const getDVLStatusColor = (valid) => {
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

  const downloadCSV = () => {
    // Create CSV content for all selected sensors
    let csvHeader = "Timestamp,Elapsed Time (s),";
    const sensorColumns = [];
    
    Object.keys(selectedSensors).forEach(sensorKey => {
      if (selectedSensors[sensorKey]) {
        const sensor = SENSORS[sensorKey];
        sensor.dataKeys.forEach((key, idx) => {
          csvHeader += `${sensor.name} ${key} (${sensor.units[idx]}),`;
          sensorColumns.push({sensorKey, key, idx});
        });
      }
    });
    
    csvHeader = csvHeader.slice(0, -1) + "\n";
    
    const csvRows = timestamps.map((timestamp, timeIdx) => {
      let row = `${timestamp},${elapsedTimes[timeIdx]?.toFixed(1) || 0},`;
      
      sensorColumns.forEach(col => {
        let value;
        // Special handling for DVL data
        if (col.sensorKey === 'dvl') {
          const dvlData = sensorData.dvl;
          switch(col.key) {
            case 'vx': value = dvlData.vx[timeIdx]; break;
            case 'vy': value = dvlData.vy[timeIdx]; break;
            case 'vz': value = dvlData.vz[timeIdx]; break;
            case 'altitude': value = dvlData.altitude[timeIdx]; break;
            case 'fom': value = dvlData.fom[timeIdx]; break;
            default: value = "";
          }
        } else {
          value = sensorData[col.sensorKey]?.[col.key]?.[timeIdx] || "";
        }
        row += `${value.toFixed?.(4) || value},`;
      });
      
      return row.slice(0, -1);
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Combined_Sensor_Data.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <Head>
        <title>Combined Sensor Monitoring</title>
      </Head>

      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
              Combined Sensor Monitoring
            </h1>
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>

          {/* Connection Status */}
          <div className={`text-center mb-6 ${getConnectionStatusColor()}`}>
            {connectionStatus}
          </div>

          {/* Sensor Selection */}
          <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
            <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              Select Sensors to Display
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {Object.keys(SENSORS).map(sensorKey => (
                <div key={sensorKey} className="flex items-center">
                  <input
                    type="checkbox"
                    id={sensorKey}
                    checked={selectedSensors[sensorKey] || false}
                    onChange={() => toggleSensor(sensorKey)}
                    className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor={sensorKey} className="ml-2 text-sm font-medium">
                    {SENSORS[sensorKey].name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Battery Status Cards (only shown if battery is selected) */}
          {selectedSensors.battery && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className={`p-6 rounded-lg shadow-lg ${getStatusColor(getBatteryStatus(sensorData.battery?.battery1?.[sensorData.battery?.battery1?.length - 1]))}`}>
                <h2 className="text-xl font-bold text-center mb-2">Battery 1</h2>
                <p className="text-4xl font-bold text-center">
                  {sensorData.battery?.battery1?.length > 0 ? 
                    `${sensorData.battery.battery1[sensorData.battery.battery1.length - 1].toFixed(2)}V` : 'N/A'}
                </p>
                <p className="text-center mt-2">
                  Status: <span className="font-bold">
                    {getBatteryStatus(sensorData.battery?.battery1?.[sensorData.battery?.battery1?.length - 1]).toUpperCase()}
                  </span>
                </p>
              </div>

              <div className={`p-6 rounded-lg shadow-lg ${getStatusColor(getBatteryStatus(sensorData.battery?.battery2?.[sensorData.battery?.battery2?.length - 1]))}`}>
                <h2 className="text-xl font-bold text-center mb-2">Battery 2</h2>
                <p className="text-4xl font-bold text-center">
                  {sensorData.battery?.battery2?.length > 0 ? 
                    `${sensorData.battery.battery2[sensorData.battery.battery2.length - 1].toFixed(2)}V` : 'N/A'}
                </p>
                <p className="text-center mt-2">
                  Status: <span className="font-bold">
                    {getBatteryStatus(sensorData.battery?.battery2?.[sensorData.battery?.battery2?.length - 1]).toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* DVL Current Values (only shown if DVL is selected) */}
          {selectedSensors.dvl && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>X Velocity</h3>
                <p className={`text-xl font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {formatValue(sensorData.dvl?.current?.vx, 'm/s')}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Y Velocity</h3>
                <p className={`text-xl font-mono ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatValue(sensorData.dvl?.current?.vy, 'm/s')}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Z Velocity</h3>
                <p className={`text-xl font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {formatValue(sensorData.dvl?.current?.vz, 'm/s')}
                </p>
              </div>
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</h3>
                <div className="flex items-center">
                  <span className={`h-3 w-3 rounded-full mr-2 ${getDVLStatusColor(sensorData.dvl?.current?.velocityValid)}`}></span>
                  <span>{sensorData.dvl?.current?.velocityValid ? 'Valid' : 'Invalid'}</span>
                  <span className={`ml-2 text-xs ${darkMode ? 'opacity-70' : 'text-gray-500'}`}>
                    (Code: {sensorData.dvl?.current?.status || 'N/A'})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Download CSV Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={downloadCSV}
              className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors duration-200`}
              disabled={!timestamps.length}
            >
              Download Combined CSV
            </button>
          </div>

          {/* Graphs Container */}
          <div className="space-y-8">
            {Object.keys(selectedSensors).map(sensorKey => {
              if (!selectedSensors[sensorKey]) return null;
              
              const sensor = SENSORS[sensorKey];
              return sensor.dataKeys.map((key, idx) => (
                <GraphContainer
                  key={`${sensorKey}-${key}`}
                  title={`${sensor.name} - ${key} (${sensor.units[idx]})`}
                  color={darkMode ? sensor.colors[idx] : darkenColor(sensor.colors[idx])}
                  timestamps={sensorKey === 'dvl' ? sensorData.dvl?.elapsedTimes : elapsedTimes}
                  data={sensorData[sensorKey]?.[key] || []}
                  yAxisLabel={`${key} (${sensor.units[idx]})`}
                  unit={sensor.units[idx]}
                  darkMode={darkMode}
                  yRange={sensor.yRanges[idx]}
                  xRange={[0, 1000]} // 5 minutes in seconds
                  latestValue={
                    sensorKey === 'dvl' ? 
                      sensorData.dvl?.current?.[key] :
                      sensorData[sensorKey]?.[key]?.[sensorData[sensorKey][key]?.length - 1]
                  }
                />
              ));
            })}
          </div>

          {/* Raw Data Display
          <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mt-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                Raw Data
              </h2>
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Elapsed: {elapsedTimes.length > 0 ? `${elapsedTimes[elapsedTimes.length - 1].toFixed(1)}s` : 'N/A'}
              </span>
            </div>
            <pre className={`text-xs p-4 rounded overflow-x-auto max-h-60 ${darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
              {rawData}
            </pre>
          </div> */}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Helper function to darken colors for light mode
function darkenColor(hex, amount = 20) {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  // Darken each component
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);

  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function GraphContainer({ title, color, timestamps, data, yAxisLabel, unit, darkMode, yRange, xRange, latestValue }) {
  return (
    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold" style={{ color }}>
          {title}
        </h2>
        <div className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <span className="font-mono" style={{ color }}>
            {data.length > 0 ? `${latestValue?.toFixed(2) || data[data.length - 1]?.toFixed(2) || "N/A"} ${unit}` : "N/A"}
          </span>
        </div>
      </div>
      
      <Plot
        data={[
          {
            x: timestamps,
            y: data,
            type: "scatter",
            mode: "lines",
            line: { 
              color,
              width: 2,
              shape: 'linear'
            },
            connectgaps: true,
          },
        ]}
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
            range: xRange,
            fixedrange: true,
            tick0: 0,
            dtick: 60,
          },
          yaxis: {
            title: yAxisLabel,
            range: yRange,
            fixedrange: true,
            showgrid: true,
            gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
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
                  'xaxis.range': xRange,
                  'yaxis.autorange': false,
                  'yaxis.range': yRange
                });
              }
            }
          ]
        }}
        useResizeHandler
        style={{ width: "100%", height: "300px" }}
      />
    </div>
  );
}