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
      <div className="bg-gray-800 rounded-lg p-6 h-96 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-semibold mb-10 text-center text-teal-400">
          AHRS Sensor Data Monitoring
        </h1>

        {/* Raw Data Display */}
        {rawData && (
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-center mb-4 text-yellow-400">
              Latest Raw Data
            </h2>
            <table className="table-auto w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="px-4 py-2 border-b border-gray-600">Timestamp</th>
                  <th className="px-4 py-2 border-b border-gray-600">Roll (Deg)</th>
                  <th className="px-4 py-2 border-b border-gray-600">Pitch (Deg)</th>
                  <th className="px-4 py-2 border-b border-gray-600">Yaw (Deg)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-white hover:bg-gray-700">
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.timestamp}</td>
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.Roll.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.Pitch.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.Heading.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3D Visualization Section */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-center mb-4 text-purple-400">
            3D Orientation Visualization
          </h2>
          <AHRSVisualization 
            roll={orientation.roll} 
            pitch={orientation.pitch} 
            yaw={orientation.yaw} 
          />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-700 p-2 rounded">
              <p className="text-sm text-gray-300">Roll</p>
              <p className="text-lg font-mono text-red-400">
                {orientation.roll.toFixed(2)}°
              </p>
            </div>
            <div className="bg-gray-700 p-2 rounded">
              <p className="text-sm text-gray-300">Pitch</p>
              <p className="text-lg font-mono text-blue-400">
                {orientation.pitch.toFixed(2)}°
              </p>
            </div>
            <div className="bg-gray-700 p-2 rounded">
              <p className="text-sm text-gray-300">Yaw</p>
              <p className="text-lg font-mono text-green-400">
                {orientation.yaw.toFixed(2)}°
              </p>
            </div>
          </div>
        </div>

        {/* CSV Export Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={downloadCSV}
            className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-lg shadow-md font-semibold transition-colors"
          >
            Download CSV
          </button>
        </div>

        {/* Graphs Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GraphContainer
            title="Roll (Deg)"
            color="#FF6B6B"
            timestamps={timestamps}
            data={rollData}
            yAxisLabel="Roll (Deg)"
          />
          <GraphContainer
            title="Pitch (Deg)"
            color="#4ECDC4"
            timestamps={timestamps}
            data={pitchData}
            yAxisLabel="Pitch (Deg)"
          />
          <GraphContainer
            title="Yaw (Deg)"
            color="#1D8CF8"
            timestamps={timestamps}
            data={yawData}
            yAxisLabel="Yaw (Deg)"
          />
        </div>
      </div>
    </div>
  );
}

// Reusable Graph Component
function GraphContainer({ title, color, timestamps, data, yAxisLabel }) {
  // Convert timestamps to relative seconds
  const relativeTimes = timestamps.length > 0 
    ? timestamps.map((t, i) => i) 
    : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
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
            color: "#ffffff",
            gridcolor: "#333333",
            range: [0, 50]
          },
          yaxis: { 
            title: yAxisLabel, 
            color: "#ffffff",
            gridcolor: "#333333"
          },
          margin: { t: 30, b: 50, l: 60, r: 30 },
        }}
        useResizeHandler
        style={{ width: "100%", height: "300px" }}
      />
      <div className="mt-4 p-2 bg-gray-700 rounded text-center">
        <p className="text-sm text-gray-300">Current Value:</p>
        <p className="text-lg font-mono" style={{ color }}>
          {data.length > 0 ? data[data.length - 1].toFixed(2) : "N/A"}
        </p>
      </div>
    </div>
  );
}

