/**
 * @file CombinedGraphPage.js
 * @brief Enhanced component for displaying combined sensor data with proper error handling
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createRosWebSocket } from '../lib/ros-websocket';

// Dynamic import for Plotly.js to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Convert timestamps to seconds
const convertTimestampsToSeconds = (timestamps) => {
  return timestamps.map((_, index) => index);
};

/**
 * @function formatCurrentValue
 * @brief Safely formats any value for display
 */
const formatCurrentValue = (value) => {
  if (value === undefined || value === null) return 'N/A';
  
  switch (typeof value) {
    case 'number':
      return value.toFixed(2);
    case 'object':
      try {
        if (Array.isArray(value)) {
          return `[${value.map(v => formatCurrentValue(v)).join(', ')}]`;
        }
        return JSON.stringify(value);
      } catch {
        return 'Complex Data';
      }
    case 'boolean':
      return value.toString();
    default:
      return String(value);
  }
};

/**
 * WebSocket Initialization Helpers
 */

const initializeAhrsWebSocket = (setRollData, setPitchData, setYawData, setAhrsTimestamps) => {
  const ahrsWs = createRosWebSocket('/ahrs', (message) => {
    try {
      // For Float64MultiArray, the data is in message.data array
      const dataArray = message.data || [];
      
      // Parse the orientation data (assuming [heading, pitch, roll] order)
      const roll = dataArray[2] || 0;  // Roll is third element
      const pitch = dataArray[1] || 0; // Pitch is second element
      const yaw = dataArray[0] || 0;   // Heading/Yaw is first element
      
      const timestamp = new Date().toLocaleTimeString();

      setRollData(prev => [...prev.slice(-49), roll]);
      setPitchData(prev => [...prev.slice(-49), pitch]);
      setYawData(prev => [...prev.slice(-49), yaw]);
      setAhrsTimestamps(prev => [...prev.slice(-49), timestamp]);
    } catch (error) {
      console.error('AHRS Data Error:', error.message);
    }
  });
  return ahrsWs;
};

const initializeBar30WebSocket = (setDepthData, setBar30Timestamps) => {
  const bar30Ws = createRosWebSocket('/depth_impact', (message) => {
    try {
      // For Float64MultiArray, data is in message.data array
      // Assuming array contains [depth, temperature, pressure]
      const dataArray = message.data || [];
      const depth = dataArray[0] || 0;  // First value is depth
      
      setDepthData(prev => [...prev.slice(-49), depth]);
      setBar30Timestamps(prev => [...prev.slice(-49), new Date().toLocaleTimeString()]);
    } catch (error) {
      console.error('Bar30 Data Error:', error.message);
    }
  });
  return bar30Ws;
};

const initializeBatteryWebSocket = (setBatteryData, setBatteryTimestamps) => {
  const batteryWs = createRosWebSocket('/battery_voltage_1', (message) => {
    try {
      const { battery1, battery2 } = message.data;
      const voltages = {
        battery1: Number(battery1) || 0,
        battery2: Number(battery2) || 0
      };
      
      setBatteryData(prev => [...prev.slice(-49), voltages]);
      setBatteryTimestamps(prev => [...prev.slice(-49), new Date().toLocaleTimeString()]);
    } catch (error) {
      console.error('Battery Data Error:', error.message);
    }
  });
  return batteryWs;
};

const initializeDvlWebSocket = (setDvlData, setDvlTimestamps) => {
  const dvlWs = createRosWebSocket('/dvl/data', (message) => {
    try {
      // Parse the raw data if it's a string
      const rawData = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
      
      // Extract the velocity data
      const velocityData = {
        x: rawData.velocity?.x || 0,
        y: rawData.velocity?.y || 0,
        z: rawData.velocity?.z || 0,
        altitude: rawData.altitude || 0,
        valid: rawData.velocity_valid || false
      };

      const timestamp = new Date().toLocaleTimeString();
      
      setDvlData(prev => [...prev.slice(-49), velocityData]);
      setDvlTimestamps(prev => [...prev.slice(-49), timestamp]);
    } catch (error) {
      console.error('DVL Data Error:', error.message);
    }
  });
  
  dvlWs.onerror = (error) => {
    console.error('DVL WebSocket error:', error);
  };
  
  return dvlWs;
};

const parseUSRTHMessage = (message) => {
  if (!message || typeof message !== 'string') return null;
  
  const fields = message.split(',');
  if (fields[0] === '$USRTH' && fields.length > 11) {
    return {
      ab: parseFloat(fields[1]),
      sr: parseFloat(fields[4]),
      ey: parseFloat(fields[11]),
      raw: message
    };
  }
  return null;
};

const initializeRovlWebSocket = (setRovlData) => {
  const rovlWs = createRosWebSocket('/rovl', (message) => {
    try {
      if (message && typeof message === 'object' && 'data' in message) {
        const parsedData = parseUSRTHMessage(message.data);
        if (parsedData) {
          setRovlData(prev => {
            const currentTime = new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            
            return {
              timestamps: [...prev.timestamps.slice(-49), currentTime],
              abValues: [...prev.abValues.slice(-49), parsedData.ab],
              srValues: [...prev.srValues.slice(-49), parsedData.sr],
              eyValues: [...prev.eyValues.slice(-49), parsedData.ey],
              latestMessage: parsedData.raw
            };
          });
        }
      }
    } catch (error) {
      console.error('ROVL Data Error:', error.message);
    }
  });
  
  rovlWs.onerror = (error) => {
    console.error('ROVL WebSocket error:', error);
  };
  
  return rovlWs;
};

/**
 * @function SensorPlot
 * @brief Enhanced plot component with safe data handling
 */
function SensorPlot({ title, data, timestamps, titleColor, markerColor, darkMode }) {
  const secondsTimestamps = convertTimestampsToSeconds(timestamps);
  const currentValue = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h2 className="text-lg font-semibold text-center mb-4" style={{ color: titleColor }}>
        {title}
      </h2>
      <Plot
        data={[{
          x: secondsTimestamps,
          y: data,
          type: 'scatter',
          mode: 'lines+markers',
          marker: { color: markerColor },
          line: { color: markerColor, width: 2 },
        }]}
        layout={{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          xaxis: { 
            title: 'Time (s)', 
            color: darkMode ? '#ffffff' : '#000000',
            gridcolor: darkMode ? '#333333' : '#E5E7EB',
            zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
          },
          yaxis: { 
            title: 'Value', 
            color: darkMode ? '#ffffff' : '#000000',
            gridcolor: darkMode ? '#333333' : '#E5E7EB',
            zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
          },
          margin: { t: 30, b: 50, l: 60, r: 30 },
          hovermode: 'closest',
        }}
        config={{
          displayModeBar: false,
          responsive: true
        }}
        useResizeHandler
        style={{ width: '100%', height: '200px' }}
      />
      <div className={`mt-4 p-2 rounded text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
        <p className="text-lg font-mono" style={{ color: markerColor }}>
          {formatCurrentValue(currentValue)}
        </p>
      </div>
    </div>
  );
}

function DvlSensorGroup({ dvlData, dvlTimestamps, darkMode }) {
  const downloadCSV = () => {
    let csvContent = 'Timestamp,X Velocity,Y Velocity,Z Velocity,Altitude,Valid\n';
    dvlTimestamps.forEach((timestamp, index) => {
      const data = dvlData[index] || {};
      csvContent += `${timestamp},${data.x || ''},${data.y || ''},${data.z || ''},${data.altitude || ''},${data.valid || ''}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dvl_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} col-span-1 md:col-span-3`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-semibold text-center ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
          DVL Sensor Data
        </h2>
        <button
          onClick={downloadCSV}
          className={`px-3 py-1 rounded shadow text-sm font-medium ${darkMode ? 'bg-teal-400 hover:bg-teal-500 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
        >
          Download CSV
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* X Velocity Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: dvlTimestamps,
              y: dvlData.map(d => d.x),
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#FF4500' },
              line: { color: '#FF4500', width: 2 },
            }]}
            layout={{
              title: 'X Velocity',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Velocity (m/s)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-orange-300' : 'text-orange-500'}`}>
              {formatCurrentValue(dvlData[dvlData.length - 1]?.x)}
            </p>
          </div>
        </div>

        {/* Y Velocity Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: dvlTimestamps,
              y: dvlData.map(d => d.y),
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#FF8C00' },
              line: { color: '#FF8C00', width: 2 },
            }]}
            layout={{
              title: 'Y Velocity',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Velocity (m/s)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-orange-300' : 'text-orange-500'}`}>
              {formatCurrentValue(dvlData[dvlData.length - 1]?.y)}
            </p>
          </div>
        </div>

        {/* Z Velocity Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: dvlTimestamps,
              y: dvlData.map(d => d.z),
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#FF6347' },
              line: { color: '#FF6347', width: 2 },
            }]}
            layout={{
              title: 'Z Velocity',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Velocity (m/s)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-orange-300' : 'text-orange-500'}`}>
              {formatCurrentValue(dvlData[dvlData.length - 1]?.z)}
            </p>
          </div>
        </div>

        {/* Altitude Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: dvlTimestamps,
              y: dvlData.map(d => d.altitude),
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#FFA500' },
              line: { color: '#FFA500', width: 2 },
            }]}
            layout={{
              title: 'Altitude',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Altitude (m)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-orange-300' : 'text-orange-500'}`}>
              {formatCurrentValue(dvlData[dvlData.length - 1]?.altitude)}
            </p>
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="flex justify-between items-center">
          <h3 className={`text-md font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            DVL Status
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            dvlData.length > 0 && dvlData[dvlData.length - 1]?.valid 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {dvlData.length > 0 && dvlData[dvlData.length - 1]?.valid ? 'VALID' : 'INVALID'}
          </span>
        </div>
      </div>
    </div>
  );
}

function RovlSensorGroup({ rovlData, darkMode }) {
  const downloadCSV = () => {
    let csvContent = 'Timestamp,Apparent Bearing,Slant Range,Euler Yaw\n';
    rovlData.timestamps.forEach((timestamp, index) => {
      csvContent += `${timestamp},${rovlData.abValues[index] ?? ''},${rovlData.srValues[index] ?? ''},${rovlData.eyValues[index] ?? ''}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'rovl_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} col-span-1 md:col-span-3`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-semibold text-center ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          ROVL Sensor Data
        </h2>
        <button
          onClick={downloadCSV}
          className={`px-3 py-1 rounded shadow text-sm font-medium ${darkMode ? 'bg-teal-400 hover:bg-teal-500 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
        >
          Download CSV
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Apparent Bearing Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: rovlData.timestamps,
              y: rovlData.abValues,
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#1abc9c' },
              line: { color: '#1abc9c', width: 2 },
            }]}
            layout={{
              title: 'Apparent Bearing',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Bearing (degrees)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-teal-300' : 'text-teal-500'}`}>
              {formatCurrentValue(rovlData.abValues[rovlData.abValues.length - 1])}
            </p>
          </div>
        </div>

        {/* Slant Range Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: rovlData.timestamps,
              y: rovlData.srValues,
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#e74c3c' },
              line: { color: '#e74c3c', width: 2 },
            }]}
            layout={{
              title: 'Slant Range',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Range (meters)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-red-300' : 'text-red-500'}`}>
              {formatCurrentValue(rovlData.srValues[rovlData.srValues.length - 1])}
            </p>
          </div>
        </div>

        {/* Euler Yaw Graph */}
        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Plot
            data={[{
              x: rovlData.timestamps,
              y: rovlData.eyValues,
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: '#3498db' },
              line: { color: '#3498db', width: 2 },
            }]}
            layout={{
              title: 'Euler Yaw',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              xaxis: { 
                title: 'Time', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              yaxis: { 
                title: 'Yaw (degrees)', 
                color: darkMode ? '#ffffff' : '#000000',
                gridcolor: darkMode ? '#333333' : '#E5E7EB',
                zerolinecolor: darkMode ? '#666666' : '#D1D5DB'
              },
              margin: { t: 30, b: 50, l: 60, r: 30 },
            }}
            style={{ width: '100%', height: '200px' }}
          />
          <div className={`mt-2 p-2 rounded text-center ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
            <p className={`text-lg font-mono ${darkMode ? 'text-blue-300' : 'text-blue-500'}`}>
              {formatCurrentValue(rovlData.eyValues[rovlData.eyValues.length - 1])}
            </p>
          </div>
        </div>
      </div>

      {/* Latest Data Display */}
      <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <h3 className={`text-md font-semibold text-center mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
          Latest ROVL Message
        </h3>
        <pre className={`text-xs p-3 rounded overflow-x-auto ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-800'}`}>
          {rovlData.latestMessage || 'No data received yet.'}
        </pre>
      </div>
    </div>
  );
}

export default function CombinedGraphPage() {
  // State initialization without TypeScript syntax
  const [rollData, setRollData] = useState([]);
  const [pitchData, setPitchData] = useState([]);
  const [yawData, setYawData] = useState([]);
  const [ahrsTimestamps, setAhrsTimestamps] = useState([]);

  const [depthData, setDepthData] = useState([]);
  const [bar30Timestamps, setBar30Timestamps] = useState([]);

  const [batteryData, setBatteryData] = useState([]);
  const [batteryTimestamps, setBatteryTimestamps] = useState([]);

  const [dvlData, setDvlData] = useState([]);
  const [dvlTimestamps, setDvlTimestamps] = useState([]);

  const [rovlData, setRovlData] = useState({
    timestamps: [],
    abValues: [],
    srValues: [],
    eyValues: [],
    latestMessage: null
  });

  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const wsConnections = [
      initializeAhrsWebSocket(setRollData, setPitchData, setYawData, setAhrsTimestamps),
      initializeBar30WebSocket(setDepthData, setBar30Timestamps),
      initializeBatteryWebSocket(setBatteryData, setBatteryTimestamps),
      initializeDvlWebSocket(setDvlData, setDvlTimestamps),
      initializeRovlWebSocket(setRovlData)
    ];

    return () => wsConnections.forEach(ws => ws?.close());
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4 md:p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-teal-400 to-blue-500' : 'from-teal-600 to-blue-600'}`}>
                Underwater Vehicle Sensor Dashboard
              </h1>
              <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Real-time monitoring of all vehicle systems
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
            >
              {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SensorPlot 
            title="Roll" 
            data={rollData} 
            timestamps={ahrsTimestamps} 
            titleColor="#FF6B6B" 
            markerColor="#FF6B6B"
            darkMode={darkMode}
          />
          <SensorPlot 
            title="Pitch" 
            data={pitchData} 
            timestamps={ahrsTimestamps} 
            titleColor="#4ECDC4" 
            markerColor="#4ECDC4"
            darkMode={darkMode}
          />
          <SensorPlot 
            title="Yaw" 
            data={yawData} 
            timestamps={ahrsTimestamps} 
            titleColor="#1D8CF8" 
            markerColor="#1D8CF8"
            darkMode={darkMode}
          />
          <SensorPlot 
            title="Depth (Bar30)" 
            data={depthData} 
            timestamps={bar30Timestamps} 
            titleColor="#FFC107" 
            markerColor="#FFC107"
            darkMode={darkMode}
          />
          <SensorPlot 
            title="Battery 1 Voltage" 
            data={batteryData.map(d => d.battery1)} 
            timestamps={batteryTimestamps} 
            titleColor="#FFD700" 
            markerColor="#FFD700"
            darkMode={darkMode}
          />
          <SensorPlot 
            title="Battery 2 Voltage" 
            data={batteryData.map(d => d.battery2)} 
            timestamps={batteryTimestamps} 
            titleColor="#32CD32" 
            markerColor="#32CD32"
            darkMode={darkMode}
          />
          
          {/* DVL Sensor Group - spans all columns */}
          <DvlSensorGroup 
            dvlData={dvlData} 
            dvlTimestamps={dvlTimestamps} 
            darkMode={darkMode}
          />
          
          {/* ROVL Sensor Group - spans all columns */}
          <RovlSensorGroup 
            rovlData={rovlData} 
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
}