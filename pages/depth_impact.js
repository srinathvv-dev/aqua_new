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

  useEffect(() => {
    const ws = createRosWebSocket("/depth_impact", (message) => {
      try {
        // For Float64MultiArray, data is in message.data array
        // Assuming array contains [depth, temperature, pressure]
        const dataArray = message.data || [];
        
        const parsedData = {
          Depth: dataArray[0] || 0,         // First value is depth in meters
          Temperature: dataArray[1] || 0,   // Second value is temperature in °C
          Pressure: dataArray[2] || 0       // Third value is pressure in mbar
        };

        // Current time for the x-axis
        const currentTime = new Date().toLocaleTimeString();

        // Update graph data to include only the last 50 points
        setDepthData((prev) => [...prev.slice(-49), parsedData.Depth]);
        setTemperatureData((prev) => [...prev.slice(-49), parsedData.Temperature]);
        setPressureData((prev) => [...prev.slice(-49), parsedData.Pressure]);
        setTimestamps((prev) => [...prev.slice(-49), currentTime]);

        // Append all data for CSV
        setAllDepthData((prev) => [...prev, parsedData.Depth]);
        setAllTemperatureData((prev) => [...prev, parsedData.Temperature]);
        setAllPressureData((prev) => [...prev, parsedData.Pressure]);
        setAllTimestamps((prev) => [...prev, currentTime]);

        // Update raw data display
        setRawData({ 
          ...parsedData, 
          timestamp: currentTime 
        });
      } catch (error) {
        console.error("Error processing Depth Impact data:", error);
      }
    });

    return () => ws.close();
  }, []);

  /**
   * Function to generate and download a CSV file with the complete data.
   */
  const downloadCSV = () => {
    const csvHeader = "Timestamp,Depth (meters),Temperature (°C),Pressure (mbar)\n";
    const csvRows = allTimestamps.map((timestamp, index) => {
      return `${timestamp},${allDepthData[index]?.toFixed(4) || ""},${allTemperatureData[index]?.toFixed(2) || ""},${allPressureData[index]?.toFixed(2) || ""}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Depth_Impact_Sensor_Data.csv";
    link.click();

    URL.revokeObjectURL(url); // Cleanup
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-semibold mb-10 text-center text-teal-400">
          Depth Impact Sensor Monitoring
        </h1>

        {/* Raw Data Container */}
        {rawData && (
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700 mb-8">
            <h2 className="text-lg font-semibold text-center mb-4 text-yellow-400">
              Latest Raw Data
            </h2>
            <table className="table-auto w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="px-4 py-2 border-b border-gray-600">Timestamp</th>
                  <th className="px-4 py-2 border-b border-gray-600">Depth (meters)</th>
                  <th className="px-4 py-2 border-b border-gray-600">Temperature (°C)</th>
                  <th className="px-4 py-2 border-b border-gray-600">Pressure (mbar)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-white hover:bg-gray-700">
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.timestamp}</td>
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.Depth.toFixed(4)}</td>
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.Temperature.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b border-gray-600">{rawData.Pressure.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Download CSV Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={downloadCSV}
            className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-lg shadow-md font-semibold transition-colors duration-200"
          >
            Download CSV
          </button>
        </div>

        {/* Container for graphs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Depth Graph */}
          <GraphContainer
            title="Depth (m)"
            color="#4ECDC4"
            timestamps={timestamps}
            data={depthData}
            yAxisLabel="Depth (meters)"
            unit="m"
          />
          {/* Temperature Graph */}
          <GraphContainer
            title="Temperature (°C)"
            color="#FF6B6B"
            timestamps={timestamps}
            data={temperatureData}
            yAxisLabel="Temperature (°C)"
            unit="°C"
          />
          {/* Pressure Graph */}
          <GraphContainer
            title="Pressure (mbar)"
            color="#1D8CF8"
            timestamps={timestamps}
            data={pressureData}
            yAxisLabel="Pressure (mbar)"
            unit="mbar"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A reusable graph container component.
 * @param {object} props - The component props.
 * @returns {JSX.Element} A graph component.
 */
function GraphContainer({ title, color, timestamps, data, yAxisLabel, unit }) {
  // Convert timestamps to relative seconds for better x-axis display
  const relativeTimes = timestamps.length > 0 
    ? timestamps.map((t, i) => i) 
    : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
      <h2 className="text-lg font-semibold text-center mb-4" style={{ color }}>
        {title}
      </h2>
      <Plot
        data={[
          {
            x: relativeTimes,
            y: data,
            type: "scatter",
            mode: "lines+markers",
            marker: { color },
            line: { color, width: 2 },
          },
        ]}
        layout={{
          paper_bgcolor: "rgba(0, 0, 0, 0)",
          plot_bgcolor: "rgba(0, 0, 0, 0)",
          xaxis: {
            title: "Time (samples)",
            color: "#ffffff",
            gridcolor: "#666666",
            tickcolor: "#ffffff",
            tickfont: { color: "#ffffff" },
            range: [0, 50], // Show last 50 samples
          },
          yaxis: {
            title: yAxisLabel,
            color: "#ffffff",
            gridcolor: "#666666",
            tickcolor: "#ffffff",
            tickfont: { color: "#ffffff" },
          },
          margin: { t: 40, b: 50, l: 60, r: 20 },
        }}
        useResizeHandler
        style={{ width: "100%", height: "300px" }}
      />
      <div className="mt-4 p-2 bg-gray-700 rounded text-center">
        <p className="text-sm text-gray-300">Current Value:</p>
        <p className="text-lg font-mono" style={{ color }}>
          {data.length > 0 ? `${data[data.length - 1].toFixed(2)} ${unit}` : "N/A"}
        </p>
      </div>
    </div>
  );
}