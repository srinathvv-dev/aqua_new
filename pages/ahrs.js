import { useEffect, useState } from "react";                                                                                                                                  
import dynamic from "next/dynamic";
import { createRosWebSocket } from "../lib/ros-websocket";

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

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

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

        // Current time for x-axis (in seconds)
        const currentTime = Math.floor(Date.now() / 1000);

        // Update graph data (keep last 200 points)
        setTimestamps((prev) => [...prev.slice(-200), currentTime]);
        setRollData((prev) => [...prev.slice(-200), parsedData.Roll]);
        setPitchData((prev) => [...prev.slice(-200), parsedData.Pitch]);
        setYawData((prev) => [...prev.slice(-200), parsedData.Heading]);

        // Update raw data display
        setRawData({ ...parsedData, timestamp: currentTime });
        
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
  }, []);

  // Function to download CSV data
  const downloadCSV = () => {
    const csvHeader = "Timestamp,Roll (Deg),Pitch (Deg),Yaw (Deg)\n";
    const csvRows = timestamps.map((timestamp, index) => {
      return `${timestamp},${rollData[index]?.toFixed(2) || ""},${pitchData[index]?.toFixed(2) || ""},${yawData[index]?.toFixed(2) || ""}`;
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
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Roll (Deg)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Pitch (Deg)</th>
                  <th className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>Yaw (Deg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className={darkMode ? "text-white hover:bg-gray-700" : "hover:bg-gray-100"}>
                  <td className={`px-4 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>{rawData.timestamp}</td>
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

        {/* CSV Export Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={downloadCSV}
            className={`px-6 py-2 ${darkMode ? 'bg-teal-500 hover:bg-teal-400' : 'bg-teal-600 hover:bg-teal-500'} text-white rounded-lg shadow-md font-semibold transition-colors`}
          >
            Download CSV
          </button>
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GraphContainer
            title="Roll (Deg)"
            color={darkMode ? "#FF6B6B" : "#EF4444"}
            timestamps={timestamps}
            data={rollData}
            yAxisLabel="Roll (Deg)"
            darkMode={darkMode}
            yAxisRange={[-15, 15]}
          />
          <GraphContainer
            title="Pitch (Deg)"
            color={darkMode ? "#4ECDC4" : "#14B8A6"}
            timestamps={timestamps}
            data={pitchData}
            yAxisLabel="Pitch (Deg)"
            darkMode={darkMode}
            yAxisRange={[-15, 15]}
          />
          <GraphContainer
            title="Yaw (Deg)"
            color={darkMode ? "#1D8CF8" : "#3B82F6"}
            timestamps={timestamps}
            data={yawData}
            yAxisLabel="Yaw (Deg)"
            darkMode={darkMode}
            yAxisRange={[0, 360]}
          />
        </div>
      </div>
    </div>
  );
}

// Reusable Graph Component with updated y-axis ranges
function GraphContainer({ title, color, timestamps, data, yAxisLabel, darkMode, yAxisRange }) {
  // Convert timestamps to relative seconds
  const relativeTimes = timestamps.length > 0 
    ? timestamps.map((t, i) => i) 
    : [];

  return (
    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h2 className="text-lg font-semibold text-center mb-4" style={{ color }}>
        {title}
      </h2>
      <Plot
        data={[{
          x: relativeTimes,
          y: data,
          type: "scatter",
          mode: "lines+markers",
          marker: { color, size: 6 },
          line: { color, width: 2 },
        }]}
        layout={{
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          xaxis: { 
            title: "Time (samples)", 
            color: darkMode ? "#ffffff" : "#000000",
            gridcolor: darkMode ? "#333333" : "#E5E7EB",
            range: [0, 50]
          },
          yaxis: { 
            title: yAxisLabel, 
            color: darkMode ? "#ffffff" : "#000000",
            gridcolor: darkMode ? "#333333" : "#E5E7EB",
            range: yAxisRange,
            fixedrange: true // Prevents zooming/panning on y-axis
          },
          margin: { t: 30, b: 50, l: 60, r: 30 },
        }}
        useResizeHandler
        style={{ width: "100%", height: "300px" }}
        config={{
          displayModeBar: true,
          responsive: true,
          scrollZoom: false,
        }}
      />
      <div className={`mt-4 p-2 rounded text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Current Value:</p>
        <p className="text-lg font-mono" style={{ color }}>
          {data.length > 0 ? data[data.length - 1].toFixed(2) : "N/A"}
        </p>
      </div>
    </div>
  );
}