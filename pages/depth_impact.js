// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import { createRosWebSocket } from "../lib/ros-websocket";

// // Dynamically import the Plot component
// const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// export default function Bar30Page() {
//   const [depthData, setDepthData] = useState([]);
//   const [temperatureData, setTemperatureData] = useState([]);
//   const [pressureData, setPressureData] = useState([]);
//   const [timestamps, setTimestamps] = useState([]);
//   const [allDepthData, setAllDepthData] = useState([]);
//   const [allTemperatureData, setAllTemperatureData] = useState([]);
//   const [allPressureData, setAllPressureData] = useState([]);
//   const [allTimestamps, setAllTimestamps] = useState([]);
//   const [rawData, setRawData] = useState(null);
//   const [darkMode, setDarkMode] = useState(true);

//   const toggleTheme = () => {
//     setDarkMode(!darkMode);
//   };

//   useEffect(() => {
//     const ws = createRosWebSocket("/depth_impact", (message) => {
//       try {
//         // For Float64MultiArray, data is in message.data array
//         // Assuming array contains [depth, temperature, pressure]
//         const dataArray = message.data || [];
        
//         const parsedData = {
//           Depth: dataArray[0] || 0,         // First value is depth in meters
//           Temperature: dataArray[1] || 0,   // Second value is temperature in °C
//           Pressure: dataArray[2] || 0       // Third value is pressure in mbar
//         };

//         // Current time for the x-axis
//         const currentTime = new Date().toLocaleTimeString();

//         // Update graph data to include only the last 50 points
//         setDepthData((prev) => [...prev.slice(-49), parsedData.Depth]);
//         setTemperatureData((prev) => [...prev.slice(-49), parsedData.Temperature]);
//         setPressureData((prev) => [...prev.slice(-49), parsedData.Pressure]);
//         setTimestamps((prev) => [...prev.slice(-49), currentTime]);

//         // Append all data for CSV
//         setAllDepthData((prev) => [...prev, parsedData.Depth]);
//         setAllTemperatureData((prev) => [...prev, parsedData.Temperature]);
//         setAllPressureData((prev) => [...prev, parsedData.Pressure]);
//         setAllTimestamps((prev) => [...prev, currentTime]);

//         // Update raw data display
//         setRawData({ 
//           ...parsedData, 
//           timestamp: currentTime 
//         });
//       } catch (error) {
//         console.error("Error processing Depth Impact data:", error);
//       }
//     });

//     return () => ws.close();
//   }, []);

//   /**
//    * Function to generate and download a CSV file with the complete data.
//    */
//   const downloadCSV = () => {
//     const csvHeader = "Timestamp,Depth (meters),Temperature (°C),Pressure (mbar)\n";
//     const csvRows = allTimestamps.map((timestamp, index) => {
//       return `${timestamp},${allDepthData[index]?.toFixed(4) || ""},${allTemperatureData[index]?.toFixed(2) || ""},${allPressureData[index]?.toFixed(2) || ""}`;
//     });

//     const csvContent = csvHeader + csvRows.join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv" });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.download = "Depth_Impact_Sensor_Data.csv";
//     link.click();

//     URL.revokeObjectURL(url); // Cleanup
//   };

//   return (
//     <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
//       <div className="max-w-7xl mx-auto">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
//             Depth Impact Sensor Monitoring
//           </h1>
//           <button
//             onClick={toggleTheme}
//             className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
//           >
//             {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
//           </button>
//         </div>

//         {/* Raw Data Container */}
//         {rawData && (
//           <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
//             <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
//               Latest Raw Data
//             </h2>
//             <table className="table-auto w-full text-left text-sm">
//               <thead>
//                 <tr className={darkMode ? "text-gray-400" : "text-gray-600"}>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Timestamp</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Depth (meters)</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Temperature (°C)</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Pressure (mbar)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 <tr className={darkMode ? "text-white hover:bg-gray-700" : "hover:bg-gray-100"}>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.timestamp}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Depth.toFixed(4)}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Temperature.toFixed(2)}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Pressure.toFixed(2)}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* Download CSV Button */}
//         <div className="flex justify-center mb-8">
//           <button
//             onClick={downloadCSV}
//             className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors duration-200`}
//           >
//             Download CSV
//           </button>
//         </div>

//         {/* Container for graphs */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//           {/* Depth Graph */}
//           <GraphContainer
//             title="Depth (m)"
//             color={darkMode ? "#4ECDC4" : "#0d9488"}
//             timestamps={timestamps}
//             data={depthData}
//             yAxisLabel="Depth (meters)"
//             unit="m"
//             darkMode={darkMode}
//           />
//           {/* Temperature Graph */}
//           <GraphContainer
//             title="Temperature (°C)"
//             color={darkMode ? "#FF6B6B" : "#dc2626"}
//             timestamps={timestamps}
//             data={temperatureData}
//             yAxisLabel="Temperature (°C)"
//             unit="°C"
//             darkMode={darkMode}
//           />
//           {/* Pressure Graph */}
//           <GraphContainer
//             title="Pressure (mbar)"
//             color={darkMode ? "#1D8CF8" : "#2563eb"}
//             timestamps={timestamps}
//             data={pressureData}
//             yAxisLabel="Pressure (mbar)"
//             unit="mbar"
//             darkMode={darkMode}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// /**
//  * A reusable graph container component.
//  * @param {object} props - The component props.
//  * @returns {JSX.Element} A graph component.
//  */
// function GraphContainer({ title, color, timestamps, data, yAxisLabel, unit, darkMode }) {
//   // Convert timestamps to relative seconds for better x-axis display
//   const relativeTimes = timestamps.length > 0 
//     ? timestamps.map((t, i) => i) 
//     : [];

//   return (
//     <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
//       <h2 className="text-lg font-semibold text-center mb-4" style={{ color }}>
//         {title}
//       </h2>
//       <Plot
//         data={[
//           {
//             x: relativeTimes,
//             y: data,
//             type: "scatter",
//             mode: "lines+markers",
//             marker: { color },
//             line: { color, width: 2 },
//           },
//         ]}
//         layout={{
//           paper_bgcolor: "rgba(0, 0, 0, 0)",
//           plot_bgcolor: "rgba(0, 0, 0, 0)",
//           xaxis: {
//             title: "Time (samples)",
//             color: darkMode ? "#ffffff" : "#000000",
//             gridcolor: darkMode ? "#666666" : "#e5e7eb",
//             tickcolor: darkMode ? "#ffffff" : "#000000",
//             tickfont: { color: darkMode ? "#ffffff" : "#000000" },
//             range: [0, 50], // Show last 50 samples
//           },
//           yaxis: {
//             title: yAxisLabel,
//             color: darkMode ? "#ffffff" : "#000000",
//             gridcolor: darkMode ? "#666666" : "#e5e7eb",
//             tickcolor: darkMode ? "#ffffff" : "#000000",
//             tickfont: { color: darkMode ? "#ffffff" : "#000000" },
//           },
//           margin: { t: 40, b: 50, l: 60, r: 20 },
//         }}
//         useResizeHandler
//         style={{ width: "100%", height: "300px" }}
//       />
//       <div className={`mt-4 p-2 rounded text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
//         <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
//         <p className="text-lg font-mono" style={{ color }}>
//           {data.length > 0 ? `${data[data.length - 1].toFixed(2)} ${unit}` : "N/A"}
//         </p>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createRosWebSocket } from "../lib/ros-websocket";

// Dynamically import the Plot component
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function Bar30Page() {
  const [depthData, setDepthData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [pressureData, setPressureData] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [allDepthData, setAllDepthData] = useState([]);
  const [allTemperatureData, setAllTemperatureData] = useState([]);
  const [allPressureData, setAllPressureData] = useState([]);
  const [allTimestamps, setAllTimestamps] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTimes, setElapsedTimes] = useState([]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const ws = createRosWebSocket("/depth_impact", (message) => {
      try {
        const dataArray = message.data || [];
        
        const parsedData = {
          Depth: dataArray[0] || 0,
          Temperature: dataArray[1] || 0,
          Pressure: dataArray[2] || 0
        };

        const currentTime = new Date();
        const currentTimeString = currentTime.toLocaleTimeString();

        // Set start time on first data point
        if (!startTime) {
          setStartTime(currentTime);
        }

        // Calculate elapsed time in seconds
        const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

        // Update graph data (keep all historical data)
        setDepthData((prev) => [...prev, parsedData.Depth]);
        setTemperatureData((prev) => [...prev, parsedData.Temperature]);
        setPressureData((prev) => [...prev, parsedData.Pressure]);
        setTimestamps((prev) => [...prev, currentTimeString]);
        setElapsedTimes((prev) => [...prev, elapsedTime]);

        // Append all data for CSV
        setAllDepthData((prev) => [...prev, parsedData.Depth]);
        setAllTemperatureData((prev) => [...prev, parsedData.Temperature]);
        setAllPressureData((prev) => [...prev, parsedData.Pressure]);
        setAllTimestamps((prev) => [...prev, currentTimeString]);

        setRawData({ 
          ...parsedData, 
          timestamp: currentTimeString,
          elapsedTime: elapsedTime.toFixed(1)
        });
      } catch (error) {
        console.error("Error processing Depth Impact data:", error);
      }
    });

    return () => ws.close();
  }, [startTime]);

  const downloadCSV = () => {
    const csvHeader = "Timestamp,Elapsed Time (s),Depth (meters),Temperature (°C),Pressure (mbar)\n";
    const csvRows = allTimestamps.map((timestamp, index) => {
      const elapsed = elapsedTimes[index] || 0;
      return `${timestamp},${elapsed.toFixed(1)},${allDepthData[index]?.toFixed(4) || ""},${allTemperatureData[index]?.toFixed(2) || ""},${allPressureData[index]?.toFixed(2) || ""}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Depth_Impact_Sensor_Data.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            Depth Impact Sensor Monitoring
          </h1>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Raw Data Container */}
        {rawData && (
          <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
            <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              Latest Raw Data
            </h2>
            <table className="table-auto w-full text-left text-sm">
              <thead>
                <tr className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Timestamp</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Elapsed (s)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Depth (m)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Temp (°C)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Pressure (mbar)</th>
                </tr>
              </thead>
              <tbody>
                <tr className={darkMode ? "text-white hover:bg-gray-700" : "hover:bg-gray-100"}>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.timestamp}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.elapsedTime}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Depth.toFixed(4)}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Temperature.toFixed(2)}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Pressure.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Download CSV Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={downloadCSV}
            className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors duration-200`}
          >
            Download CSV
          </button>
        </div>

        {/* Horizontal Plots Container */}
        <div className="space-y-8">
          {/* Depth Graph */}
          <GraphContainer
            title="Depth (meters)"
            color={darkMode ? "#4ECDC4" : "#0d9488"}
            timestamps={elapsedTimes}
            data={depthData}
            yAxisLabel="Depth (meters)"
            unit="m"
            darkMode={darkMode}
            yRange={[0, 5]} // Fixed range for depth
            xRange={[0, 300]} // 5 minutes in seconds
          />
          
          {/* Temperature Graph */}
          <GraphContainer
            title="Temperature (°C)"
            color={darkMode ? "#FF6B6B" : "#dc2626"}
            timestamps={elapsedTimes}
            data={temperatureData}
            yAxisLabel="Temperature (°C)"
            unit="°C"
            darkMode={darkMode}
            yRange={[0, 40]} // Fixed range for temperature
            xRange={[0, 300]} // 5 minutes in seconds
          />
          
          {/* Pressure Graph */}
          <GraphContainer
            title="Pressure (mbar)"
            color={darkMode ? "#1D8CF8" : "#2563eb"}
            timestamps={elapsedTimes}
            data={pressureData}
            yAxisLabel="Pressure (mbar)"
            unit="mbar"
            darkMode={darkMode}
            yRange={[0, 2000]} // Fixed range for pressure
            xRange={[0, 300]} // 5 minutes in seconds
          />
        </div>
      </div>
    </div>
  );
}

function GraphContainer({ title, color, timestamps, data, yAxisLabel, unit, darkMode, yRange, xRange }) {
  return (
    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold" style={{ color }}>
          {title}
        </h2>
        <div className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <span className="font-mono" style={{ color }}>
            {data.length > 0 ? `${data[data.length - 1].toFixed(2)} ${unit}` : "N/A"}
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
              width: 1.5,
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
            tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
            linecolor: darkMode ? '#4B5563' : '#D1D5DB',
            mirror: true,
            showline: true,
            zeroline: false,
            range: xRange,
            fixedrange: true,
            tick0: 0,
            dtick: 60, // Show a tick every minute
          },
          yaxis: {
            title: yAxisLabel,
            range: yRange,
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