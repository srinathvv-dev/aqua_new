// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import { createRosWebSocket } from "../lib/ros-websocket";
// import Chatbot from "../components/Chatbot";

// // Dynamic imports to prevent SSR issues
// const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
// const AHRSVisualization = dynamic(
//   () => import("../components/AHRSVisualization"),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-6 h-96 flex items-center justify-center">
//         Loading 3D visualization...
//       </div>
//     )
//   }
// );

// export default function AHRSPage() {
//   // State for sensor data
//   const [rawData, setRawData] = useState(null);
//   const [rollData, setRollData] = useState([]);
//   const [pitchData, setPitchData] = useState([]);
//   const [yawData, setYawData] = useState([]);
//   const [timestamps, setTimestamps] = useState([]);
//   const [orientation, setOrientation] = useState({ 
//     roll: 0, 
//     pitch: 0, 
//     yaw: 0 
//   });
//   const [darkMode, setDarkMode] = useState(true);
//   const [startTime, setStartTime] = useState(null);
//   const [elapsedTimes, setElapsedTimes] = useState([]);
//   const [currentXRange, setCurrentXRange] = useState([0, 60]); // Start with 0-60 seconds range
//   const [yawRange, setYawRange] = useState([0, 360]);
//   const [angleRange, setAngleRange] = useState([-15, 15]);

//   // Toggle between light and dark theme
//   const toggleTheme = () => {
//     setDarkMode(!darkMode);
//   };

//   // Update x-axis range dynamically
//   useEffect(() => {
//     if (elapsedTimes.length === 0) return;

//     const lastTime = elapsedTimes[elapsedTimes.length - 1];
//     const currentMax = currentXRange[1];
    
//     // If we've exceeded the current x-range maximum, extend it by 60 seconds
//     if (lastTime > currentMax) {
//       const newMax = currentMax + 60;
//       setCurrentXRange([0, newMax]); // Always start from 0
//     }
//   }, [elapsedTimes, currentXRange]);

//   // Adjust y-axis ranges based on data
//   useEffect(() => {
//     if (rollData.length > 0 || pitchData.length > 0) {
//       const allAngles = [...rollData, ...pitchData];
//       const minAngle = Math.min(...allAngles);
//       const maxAngle = Math.max(...allAngles);
      
//       // Add 5 degrees padding to the range
//       const padding = 5;
//       setAngleRange([
//         Math.min(minAngle - padding, -15),
//         Math.max(maxAngle + padding, 15)
//       ]);
//     }

//     if (yawData.length > 0) {
//       const minYaw = Math.min(...yawData);
//       const maxYaw = Math.max(...yawData);
      
//       // Ensure we stay within 0-360 range but adjust if needed
//       setYawRange([
//         Math.max(0, Math.floor(minYaw / 10) * 10 - 10),
//         Math.min(360, Math.ceil(maxYaw / 10) * 10 + 10)
//       ]);
//     }
//   }, [rollData, pitchData, yawData]);

//   // WebSocket connection for AHRS data
//   useEffect(() => {
//     const ws = createRosWebSocket("/ahrs", (message) => {
//       try {
//         // For Float64MultiArray, the data is in message.data array
//         const dataArray = message.data || [];
        
//         // Parse the orientation data (assuming [heading, pitch, roll] order)
//         const parsedData = {
//           Heading: dataArray[0] || 0,
//           Pitch: dataArray[1] || 0,
//           Roll: dataArray[2] || 0
//         };

//         const currentTime = new Date();
        
//         // Set start time on first data point
//         if (!startTime) {
//           setStartTime(currentTime);
//         }

//         // Calculate elapsed time in seconds
//         const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

//         // Update graph data
//         setRollData((prev) => [...prev, parsedData.Roll]);
//         setPitchData((prev) => [...prev, parsedData.Pitch]);
//         setYawData((prev) => [...prev, parsedData.Heading]);
//         setElapsedTimes((prev) => [...prev, elapsedTime]);

//         // Update raw data display
//         setRawData({ 
//           ...parsedData, 
//           timestamp: currentTime.toLocaleTimeString(),
//           elapsedTime: elapsedTime.toFixed(1)
//         });
        
//         // Update 3D model orientation
//         setOrientation({
//           roll: parsedData.Roll,
//           pitch: parsedData.Pitch,
//           yaw: parsedData.Heading
//         });
//       } catch (error) {
//         console.error("Error processing AHRS data:", error);
//       }
//     });

//     return () => ws.close();
//   }, [startTime]);

//   // Function to download CSV data
//   const downloadCSV = () => {
//     const csvHeader = "Timestamp,Elapsed Time (s),Roll (Deg),Pitch (Deg),Yaw (Deg)\n";
//     const csvRows = elapsedTimes.map((elapsed, index) => {
//       return `${rawData.timestamp},${elapsed.toFixed(1)},${rollData[index]?.toFixed(2) || ""},${pitchData[index]?.toFixed(2) || ""},${yawData[index]?.toFixed(2) || ""}`;
//     });

//     const csvContent = csvHeader + csvRows.join("\n");
//     const blob = new Blob([csvContent], { type: "text/csv" });
//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");
//     link.href = url;
//     link.download = "AHRS_Sensor_Data.csv";
//     link.click();

//     URL.revokeObjectURL(url);
//   };

//   return (
      
//     <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
//       <div className="max-w-7xl mx-auto">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
//             AHRS Sensor Data Monitoring
//           </h1>
//           <button
//             onClick={toggleTheme}
//             className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
//           >
//             {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
//           </button>
//         </div>

//         {/* Raw Data Display */}
//         {rawData && (
//           <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
//             <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
//               Latest Raw Data
//             </h2>
//             <table className="table-auto w-full text-left text-sm">
//               <thead>
//                 <tr className={darkMode ? "text-gray-400" : "text-gray-600"}>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Timestamp</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Elapsed (s)</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Roll (Deg)</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Pitch (Deg)</th>
//                   <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Yaw (Deg)</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 <tr className={darkMode ? "text-white hover:bg-gray-700" : "hover:bg-gray-100"}>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.timestamp}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.elapsedTime}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Roll.toFixed(2)}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Pitch.toFixed(2)}</td>
//                   <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Heading.toFixed(2)}</td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* 3D Visualization Section */}
//         <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
//           <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
//             3D Orientation Visualization
//           </h2>
//           <AHRSVisualization 
//             roll={orientation.roll} 
//             pitch={orientation.pitch} 
//             yaw={orientation.yaw} 
//             darkMode={darkMode}
//           />
//           <div className="mt-4 grid grid-cols-3 gap-4 text-center">
//             <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
//               <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Roll</p>
//               <p className={`text-lg font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
//                 {orientation.roll.toFixed(2)}°
//               </p>
//             </div>
//             <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
//               <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pitch</p>
//               <p className={`text-lg font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
//                 {orientation.pitch.toFixed(2)}°
//               </p>
//             </div>
//             <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
//               <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Yaw</p>
//               <p className={`text-lg font-mono ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
//                 {orientation.yaw.toFixed(2)}°
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* CSV Export Button */}
//         <div className="flex justify-center mb-8">
//           <button
//             onClick={downloadCSV}
//             className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors`}
//           >
//             Download CSV
//           </button>
//         </div>

//         {/* Horizontal Plots Section */}
//         <div className="space-y-8">
//           {/* Roll Graph */}
//           <GraphContainer
//             title="Roll (Degrees)"
//             color={darkMode ? "#FF6B6B" : "#EF4444"}
//             timestamps={elapsedTimes}
//             data={rollData}
//             yAxisLabel="Roll (Deg)"
//             unit="°"
//             darkMode={darkMode}
//             yRange={angleRange}
//             xRange={currentXRange}
//           />
          
//           {/* Pitch Graph */}
//           <GraphContainer
//             title="Pitch (Degrees)"
//             color={darkMode ? "#4ECDC4" : "#14B8A6"}
//             timestamps={elapsedTimes}
//             data={pitchData}
//             yAxisLabel="Pitch (Deg)"
//             unit="°"
//             darkMode={darkMode}
//             yRange={angleRange}
//             xRange={currentXRange}
//           />
          
//           {/* Yaw Graph */}
//           <GraphContainer
//             title="Yaw (Degrees)"
//             color={darkMode ? "#1D8CF8" : "#3B82F6"}
//             timestamps={elapsedTimes}
//             data={yawData}
//             yAxisLabel="Yaw (Deg)"
//             unit="°"
//             darkMode={darkMode}
//             yRange={yawRange}
//             xRange={currentXRange}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

// function GraphContainer({ title, color, timestamps, data, yAxisLabel, unit, darkMode, yRange, xRange }) {
//   return (
//     <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-semibold" style={{ color }}>
//           {title}
//         </h2>
//         <div className={`px-3 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
//           <span className="font-mono" style={{ color }}>
//             {data.length > 0 ? `${data[data.length - 1].toFixed(2)} ${unit}` : "N/A"}
//           </span>
//         </div>
//       </div>
      
//       <Plot
//         data={[
//           {
//             x: timestamps,
//             y: data,
//             type: "scatter",
//             mode: "lines",
//             line: { 
//               color,
//               width: 1.5,
//               shape: 'linear'
//             },
//             connectgaps: true,
//           },
//         ]}
//         layout={{
//           paper_bgcolor: darkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
//           plot_bgcolor: darkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
//           margin: { t: 30, b: 60, l: 60, r: 30, pad: 0 },
//           autosize: true,
//           xaxis: {
//             title: "Time (seconds)",
//             showgrid: true,
//             gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
//             color: darkMode ? '#D1D5DB' : '#4B5563',
//             tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
//             linecolor: darkMode ? '#4B5563' : '#D1D5DB',
//             mirror: true,
//             showline: true,
//             zeroline: false,
//             range: xRange,
//             fixedrange: true,
//             tick0: 0,
//             dtick: 60, // Show a tick every minute
//           },
//           yaxis: {
//             title: yAxisLabel,
//             range: yRange,
//             fixedrange: true,
//             showgrid: true,
//             gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
//             color: darkMode ? '#D1D5DB' : '#4B5563',
//             tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
//             linecolor: darkMode ? '#4B5563' : '#D1D5DB',
//             mirror: true,
//             showline: true,
//             zeroline: false,
//           },
//           hovermode: "x unified",
//           showlegend: false,
//           transition: {
//             duration: 0,
//           },
//         }}
//         config={{
//           displayModeBar: true,
//           displaylogo: false,
//           responsive: true,
//           scrollZoom: true,
//           modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
//           modeBarButtonsToAdd: [
//             {
//               name: 'resetView',
//               title: 'Reset View',
//               icon: {
//                 width: 500,
//                 height: 600,
//                 path: 'M512 256A256 256 0 1 0 0 256a256 256 0 1 0 512 0zM231 127c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-71 71L376 232c13.3 0 24 10.7 24 24s-10.7 24-24 24l-182.1 0 71 71c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L119 273c-9.4-9.4-9.4-24.6 0-33.9L231 127z',
//                 transform: 'matrix(-1 0 0 1 0 0)'
//               },
//               click: function(gd) {
//                 Plotly.relayout(gd, {
//                   'xaxis.autorange': false,
//                   'xaxis.range': xRange,
//                   'yaxis.autorange': false,
//                   'yaxis.range': yRange
//                 });
//               }
//             }
//           ]
//         }}
//         useResizeHandler
//         style={{ width: "100%", height: "300px" }}
//       />
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createRosWebSocket } from "../lib/ros-websocket";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// Dynamic imports to prevent SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
const AHRSVisualization = dynamic(
  () => import("../components/AHRSVisualization"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-6 h-96 flex items-center justify-center">
        Loading 3D visualization...
      </div>
    )
  }
);

export default function AHRSPage() {
  // State for sensor data
  const [rawData, setRawData] = useState(null);
  const [rollData, setRollData] = useState([]);
  const [pitchData, setPitchData] = useState([]);
  const [yawData, setYawData] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [orientation, setOrientation] = useState({ 
    roll: 0, 
    pitch: 0, 
    yaw: 0 
  });
  const [darkMode, setDarkMode] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTimes, setElapsedTimes] = useState([]);
  const [currentXRange, setCurrentXRange] = useState([0, 60]); // Start with 0-60 seconds range
  const [yawRange, setYawRange] = useState([0, 360]);
  const [angleRange, setAngleRange] = useState([-15, 15]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Toggle between light and dark theme
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
    if (rollData.length > 0 || pitchData.length > 0) {
      const allAngles = [...rollData, ...pitchData];
      const minAngle = Math.min(...allAngles);
      const maxAngle = Math.max(...allAngles);
      
      // Add 5 degrees padding to the range
      const padding = 5;
      setAngleRange([
        Math.min(minAngle - padding, -15),
        Math.max(maxAngle + padding, 15)
      ]);
    }

    if (yawData.length > 0) {
      const minYaw = Math.min(...yawData);
      const maxYaw = Math.max(...yawData);
      
      // Ensure we stay within 0-360 range but adjust if needed
      setYawRange([
        Math.max(0, Math.floor(minYaw / 10) * 10 - 10),
        Math.min(360, Math.ceil(maxYaw / 10) * 10 + 10)
      ]);
    }
  }, [rollData, pitchData, yawData]);

  // WebSocket connection for AHRS data
  useEffect(() => {
    const ws = createRosWebSocket("/ahrs", (message) => {
      try {
        // For Float64MultiArray, the data is in message.data array
        const dataArray = message.data || [];
        
        // Parse the orientation data (assuming [heading, pitch, roll] order)
        const parsedData = {
          Heading: dataArray[0] || 0,
          Pitch: dataArray[1] || 0,
          Roll: dataArray[2] || 0
        };

        const currentTime = new Date();
        
        // Set start time on first data point
        if (!startTime) {
          setStartTime(currentTime);
        }

        // Calculate elapsed time in seconds
        const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

        // Update graph data
        setRollData((prev) => [...prev, parsedData.Roll]);
        setPitchData((prev) => [...prev, parsedData.Pitch]);
        setYawData((prev) => [...prev, parsedData.Heading]);
        setElapsedTimes((prev) => [...prev, elapsedTime]);

        // Update raw data display
        setRawData({ 
          ...parsedData, 
          timestamp: currentTime.toLocaleTimeString(),
          elapsedTime: elapsedTime.toFixed(1)
        });
        
        // Update 3D model orientation
        setOrientation({
          roll: parsedData.Roll,
          pitch: parsedData.Pitch,
          yaw: parsedData.Heading
        });
      } catch (error) {
        console.error("Error processing AHRS data:", error);
      }
    });

    return () => ws.close();
  }, [startTime]);

  // Function to download CSV data
  const downloadCSV = () => {
    const csvHeader = "Timestamp,Elapsed Time (s),Roll (Deg),Pitch (Deg),Yaw (Deg)\n";
    const csvRows = elapsedTimes.map((elapsed, index) => {
      return `${rawData.timestamp},${elapsed.toFixed(1)},${rollData[index]?.toFixed(2) || ""},${pitchData[index]?.toFixed(2) || ""},${yawData[index]?.toFixed(2) || ""}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "AHRS_Sensor_Data.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  // Function to download all plots as PNG in a ZIP file
  const downloadAllPlots = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      const zip = new JSZip();
      const plotIds = ['roll-plot', 'pitch-plot', 'yaw-plot'];
      const plotNames = ['Roll', 'Pitch', 'Yaw'];
      
      // Create a folder for the plots
      const folder = zip.folder("AHRS_Plots");
      
      // Add timestamp to filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Get each plot and add to ZIP
      for (let i = 0; i < plotIds.length; i++) {
        const plotDiv = document.getElementById(plotIds[i]);
        if (plotDiv) {
          const plotlyDiv = plotDiv.querySelector('.js-plotly-plot');
          if (plotlyDiv) {
            // Use Plotly's toImage function to get the PNG
            const png = await Plotly.toImage(plotlyDiv, {
              format: 'png',
              width: 1200,
              height: 600,
              scale: 2 // Higher quality
            });
            
            // Convert base64 to blob
            const blob = await fetch(png).then(res => res.blob());
            
            // Add to ZIP
            folder.file(`${plotNames[i]}_Plot_${timestamp}.png`, blob);
          }
        }
      }
      
      // Generate the ZIP file
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `AHRS_Plots_${timestamp}.zip`);
      
    } catch (error) {
      console.error("Error downloading plots:", error);
      alert("Failed to download plots. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            AHRS Sensor Data Monitoring
          </h1>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Raw Data Display */}
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
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Roll (Deg)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Pitch (Deg)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Yaw (Deg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className={darkMode ? "text-white hover:bg-gray-700" : "hover:bg-gray-100"}>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.timestamp}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.elapsedTime}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Roll.toFixed(2)}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Pitch.toFixed(2)}</td>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.Heading.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3D Visualization Section */}
        <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} mb-8`}>
          <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
            3D Orientation Visualization
          </h2>
          <AHRSVisualization 
            roll={orientation.roll} 
            pitch={orientation.pitch} 
            yaw={orientation.yaw} 
            darkMode={darkMode}
          />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Roll</p>
              <p className={`text-lg font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                {orientation.roll.toFixed(2)}°
              </p>
            </div>
            <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pitch</p>
              <p className={`text-lg font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {orientation.pitch.toFixed(2)}°
              </p>
            </div>
            <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Yaw</p>
              <p className={`text-lg font-mono ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {orientation.yaw.toFixed(2)}°
              </p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={downloadCSV}
            className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors`}
          >
            Download CSV
          </button>
          <button
            onClick={downloadAllPlots}
            disabled={isDownloading}
            className={`px-6 py-2 ${darkMode ? 'bg-purple-500 hover:bg-purple-400' : 'bg-purple-600 hover:bg-purple-500'} text-white rounded-lg shadow-md font-semibold transition-colors ${isDownloading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isDownloading ? 'Downloading...' : 'Download All Plots (PNG)'}
          </button>
        </div>

        {/* Horizontal Plots Section */}
        <div className="space-y-8">
          {/* Roll Graph */}
          <GraphContainer
            id="roll-plot"
            title="Roll (Degrees)"
            color={darkMode ? "#FF6B6B" : "#EF4444"}
            timestamps={elapsedTimes}
            data={rollData}
            yAxisLabel="Roll (Deg)"
            unit="°"
            darkMode={darkMode}
            yRange={angleRange}
            xRange={currentXRange}
          />
          
          {/* Pitch Graph */}
          <GraphContainer
            id="pitch-plot"
            title="Pitch (Degrees)"
            color={darkMode ? "#4ECDC4" : "#14B8A6"}
            timestamps={elapsedTimes}
            data={pitchData}
            yAxisLabel="Pitch (Deg)"
            unit="°"
            darkMode={darkMode}
            yRange={angleRange}
            xRange={currentXRange}
          />
          
          {/* Yaw Graph */}
          <GraphContainer
            id="yaw-plot"
            title="Yaw (Degrees)"
            color={darkMode ? "#1D8CF8" : "#3B82F6"}
            timestamps={elapsedTimes}
            data={yawData}
            yAxisLabel="Yaw (Deg)"
            unit="°"
            darkMode={darkMode}
            yRange={yawRange}
            xRange={currentXRange}
          />
        </div>
      </div>
    </div>
  );
}

function GraphContainer({ id, title, color, timestamps, data, yAxisLabel, unit, darkMode, yRange, xRange }) {
  return (
    <div id={id} className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
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