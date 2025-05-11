import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createRosWebSocket } from '../lib/ros-websocket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Sensor configurations
const SENSORS = {
  depth: {
    name: 'Depth Impact Sensor',
    endpoint: '/depth_impact',
    dataFields: ['Depth', 'Temperature', 'Pressure'],
    colors: ['#4ECDC4', '#FF6B6B', '#1D8CF8'],
    units: ['m', '°C', 'mbar'],
    yRanges: [[0, 5], [0, 40], [0, 2000]]
  },
  dvl: {
    name: 'DVL Sensor',
    endpoint: '/dvl/data',
    dataFields: ['vx', 'vy', 'vz', 'altitude', 'fom'],
    colors: ['#1D8CF8', '#4ECDC4', '#FF6B6B', '#FFD700', '#9B59B6'],
    units: ['m/s', 'm/s', 'm/s', 'm', ''],
    yRanges: [[-2, 2], [-2, 2], [-2, 2], [0, 100], [0, 10]]
  }
};

export default function MultiSensorDashboard() {
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [selectedDataField, setSelectedDataField] = useState('');
  const [sensorData, setSensorData] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  // Initialize data structure for each sensor
  useEffect(() => {
    const initialData = {};
    Object.keys(SENSORS).forEach(sensorKey => {
      initialData[sensorKey] = {
        elapsedTimes: [],
        data: SENSORS[sensorKey].dataFields.reduce((acc, field) => {
          acc[field] = [];
          return acc;
        }, {})
      };
    });
    setSensorData(initialData);
  }, []);

  // Handle WebSocket connections for selected sensors
  useEffect(() => {
    const connections = {};
    
    selectedSensors.forEach(sensorKey => {
      if (!connections[sensorKey]) {
        const ws = createRosWebSocket(SENSORS[sensorKey].endpoint, (message) => {
          try {
            const currentTime = new Date();
            if (!startTime) setStartTime(currentTime);
            const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

            let dataArray;
            if (sensorKey === 'depth') {
              dataArray = message.data || [];
            } else if (sensorKey === 'dvl') {
              const parsed = JSON.parse(message.data);
              dataArray = [
                parsed.data?.velocity?.x || 0,
                parsed.data?.velocity?.y || 0,
                parsed.data?.velocity?.z || 0,
                parsed.data?.altitude || 0,
                parsed.data?.fom || 0
              ];
            }

            setSensorData(prev => {
              const newData = { ...prev };
              const sensorData = { ...newData[sensorKey] };
              
              sensorData.elapsedTimes = [...sensorData.elapsedTimes, elapsedTime];
              
              SENSORS[sensorKey].dataFields.forEach((field, index) => {
                sensorData.data[field] = [...sensorData.data[field], dataArray[index] || 0];
              });
              
              newData[sensorKey] = sensorData;
              return newData;
            });
          } catch (error) {
            console.error(`Error processing ${sensorKey} data:`, error);
          }
        });
        
        connections[sensorKey] = ws;
      }
    });

    return () => {
      Object.values(connections).forEach(ws => ws.close());
    };
  }, [selectedSensors, startTime]);

  const toggleSensorSelection = (sensorKey) => {
    setSelectedSensors(prev =>
      prev.includes(sensorKey)
        ? prev.filter(key => key !== sensorKey)
        : [...prev, sensorKey]
    );
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const getPlotData = () => {
    if (!selectedDataField || selectedSensors.length === 0) return [];

    return selectedSensors.map((sensorKey, index) => ({
      x: sensorData[sensorKey]?.elapsedTimes || [],
      y: sensorData[sensorKey]?.data[selectedDataField] || [],
      type: 'scatter',
      mode: 'lines',
      name: `${SENSORS[sensorKey].name} - ${selectedDataField}`,
      line: {
        color: SENSORS[sensorKey].colors[SENSORS[sensorKey].dataFields.indexOf(selectedDataField)] || 
               ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'][index % 5],
        width: 2
      },
      connectgaps: true
    }));
  };

  const getYRange = () => {
    if (!selectedDataField) return [0, 10];
    
    // Find the first sensor that has this data field to get its range
    for (const sensorKey of selectedSensors) {
      const fieldIndex = SENSORS[sensorKey].dataFields.indexOf(selectedDataField);
      if (fieldIndex !== -1) {
        return SENSORS[sensorKey].yRanges[fieldIndex];
      }
    }
    
    return [0, 10];
  };

  const getUnit = () => {
    if (!selectedDataField) return '';
    
    for (const sensorKey of selectedSensors) {
      const fieldIndex = SENSORS[sensorKey].dataFields.indexOf(selectedDataField);
      if (fieldIndex !== -1) {
        return SENSORS[sensorKey].units[fieldIndex];
      }
    }
    
    return '';
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            Multi-Sensor Visualization Dashboard
          </h1>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Sensor Selection */}
        <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
            Select Sensors to Compare
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(SENSORS).map(([key, sensor]) => (
              <div 
                key={key}
                onClick={() => toggleSensorSelection(key)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${
                  selectedSensors.includes(key) 
                    ? darkMode 
                      ? 'bg-teal-900 border-teal-500' 
                      : 'bg-teal-100 border-teal-600'
                    : darkMode 
                      ? 'bg-gray-800 border-gray-600' 
                      : 'bg-white border-gray-300'
                } border`}
              >
                <h3 className="font-medium">{sensor.name}</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Available data: {sensor.dataFields.join(', ')}
                </p>
              </div>
            ))}
          </div>

          {/* Data Field Selection */}
          {selectedSensors.length > 0 && (
            <div>
              <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Data Field to Compare
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(
                  selectedSensors.flatMap(sensorKey => SENSORS[sensorKey].dataFields)
                ).map(field => (
                  <button
                    key={field}
                    onClick={() => setSelectedDataField(field)}
                    className={`px-4 py-2 rounded-full text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${
                      selectedDataField === field
                        ? darkMode
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-500 text-white'
                        : darkMode
                          ? 'bg-gray-600 text-gray-200'
                          : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {field}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Combined Graph */}
        {selectedDataField && selectedSensors.length > 0 && (
          <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                {selectedDataField} Comparison ({getUnit()})
              </h2>
              <div className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className="font-mono">
                  {selectedSensors.map(sensorKey => {
                    const data = sensorData[sensorKey]?.data[selectedDataField];
                    return data && data.length > 0 
                      ? `${SENSORS[sensorKey].name.split(' ')[0]}: ${data[data.length - 1].toFixed(2)}${getUnit()} `
                      : '';
                  })}
                </span>
              </div>
            </div>

            <Plot
              data={getPlotData()}
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
                  tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                  linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                  mirror: true,
                  showline: true,
                  zeroline: false,
                  range: [0, 300],
                  fixedrange: true,
                  tick0: 0,
                  dtick: 60,
                },
                yaxis: {
                  title: `${selectedDataField} (${getUnit()})`,
                  range: getYRange(),
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
                showlegend: true,
                legend: {
                  orientation: "h",
                  y: -0.2,
                  font: {
                    color: darkMode ? '#D1D5DB' : '#4B5563'
                  }
                },
                transition: {
                  duration: 0,
                },
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
                        'yaxis.range': getYRange()
                      });
                    }
                  }
                ]
              }}
              useResizeHandler
              style={{ width: "100%", height: "400px" }}
            />
          </div>
        )}

        {/* Individual Sensor Data Preview */}
        {selectedSensors.length > 0 && (
          <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              Sensor Data Preview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedSensors.map(sensorKey => (
                <div 
                  key={sensorKey} 
                  className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <h3 className="font-medium mb-2">{SENSORS[sensorKey].name}</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {SENSORS[sensorKey].dataFields.map((field, index) => {
                      const data = sensorData[sensorKey]?.data[field] || [];
                      return (
                        <div 
                          key={field}
                          className={`p-2 rounded ${darkMode ? 'bg-gray-600' : 'bg-white'}`}
                        >
                          <div className="text-sm font-medium">{field}</div>
                          <div className="font-mono text-sm">
                            {data.length > 0 
                              ? `${data[data.length - 1].toFixed(2)} ${SENSORS[sensorKey].units[index]}`
                              : 'No data'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}