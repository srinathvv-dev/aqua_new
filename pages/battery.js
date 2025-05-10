import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createRosWebSocket } from '../lib/ros-websocket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function BatteryPage() {
  // State for battery data and timestamps
  const [battery1Data, setBattery1Data] = useState([]);
  const [battery2Data, setBattery2Data] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  
  // State for all data (for CSV export)
  const [allBattery1Data, setAllBattery1Data] = useState([]);
  const [allBattery2Data, setAllBattery2Data] = useState([]);
  const [allTimestamps, setAllTimestamps] = useState([]);
  
  // State for latest values
  const [latestData, setLatestData] = useState({
    battery1: null,
    battery2: null,
    timestamp: null
  });

  // Battery status thresholds (customize as needed)
  const voltageThresholds = {
    critical: 22.0,
    warning: 23.5,
    healthy: 25.0
  };

  useEffect(() => {
    const ws1 = createRosWebSocket('/battery_voltage', (message) => {
      try {
        const voltage = parseFloat(message.data);
        const currentTime = new Date().toLocaleTimeString();

        // Update graph data (last 50 points)
        setBattery1Data(prev => [...prev.slice(-49), voltage]);
        
        // Store all data for CSV export
        setAllBattery1Data(prev => [...prev, voltage]);
        setAllTimestamps(prev => [...prev, currentTime]);
        
        // Update latest data
        setLatestData(prev => ({
          ...prev,
          battery1: voltage,
          timestamp: currentTime
        }));
      } catch (error) {
        console.error('Error processing Battery 1 data:', error);
      }
    });

    const ws2 = createRosWebSocket('/battery_voltage_2', (message) => {
      try {
        const voltage = parseFloat(message.data);
        const currentTime = new Date().toLocaleTimeString();

        // Update graph data (last 50 points)
        setBattery2Data(prev => [...prev.slice(-49), voltage]);
        
        // Store all data for CSV export
        setAllBattery2Data(prev => [...prev, voltage]);
        
        // Update latest data
        setLatestData(prev => ({
          ...prev,
          battery2: voltage,
          timestamp: currentTime
        }));
      } catch (error) {
        console.error('Error processing Battery 2 data:', error);
      }
    });

    return () => {
      ws1.close();
      ws2.close();
    };
  }, []);

  // Function to determine battery status
  const getBatteryStatus = (voltage) => {
    if (voltage === null || voltage === undefined) return 'unknown';
    if (voltage < voltageThresholds.critical) return 'critical';
    if (voltage < voltageThresholds.warning) return 'warning';
    if (voltage < voltageThresholds.healthy) return 'normal';
    return 'healthy';
  };

  // Function to get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'normal': return 'bg-green-500';
      case 'healthy': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Function to download CSV
  const downloadCSV = () => {
    const csvHeader = "Timestamp,Battery 1 Voltage (V),Battery 2 Voltage (V)\n";
    const csvRows = allTimestamps.map((timestamp, index) => {
      return `${timestamp},${allBattery1Data[index]?.toFixed(2) || ''},${allBattery2Data[index]?.toFixed(2) || ''}`;
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

  // Get battery statuses
  const battery1Status = getBatteryStatus(latestData.battery1);
  const battery2Status = getBatteryStatus(latestData.battery2);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-semibold mb-10 text-center text-teal-400">
          Battery Voltage Monitoring
        </h1>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Battery 1 Status */}
          <div className={`p-6 rounded-lg shadow-lg ${getStatusColor(battery1Status)}`}>
            <h2 className="text-lg font-semibold text-center mb-2">Battery 1</h2>
            <p className="text-3xl font-bold text-center">
              {latestData.battery1 !== null ? latestData.battery1.toFixed(2) + 'V' : 'N/A'}
            </p>
            <p className="text-sm text-center mt-2">
              Status: {battery1Status.toUpperCase()}
            </p>
          </div>

          {/* Battery 2 Status */}
          <div className={`p-6 rounded-lg shadow-lg ${getStatusColor(battery2Status)}`}>
            <h2 className="text-lg font-semibold text-center mb-2">Battery 2</h2>
            <p className="text-3xl font-bold text-center">
              {latestData.battery2 !== null ? latestData.battery2.toFixed(2) + 'V' : 'N/A'}
            </p>
            <p className="text-sm text-center mt-2">
              Status: {battery2Status.toUpperCase()}
            </p>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center">
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg shadow-md font-medium transition-colors"
            >
              Export Data (CSV)
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Last update: {latestData.timestamp || 'No data yet'}
            </p>
          </div>
        </div>

        {/* Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Battery 1 Graph */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-red-400">
                Battery 1 Voltage
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs ${getStatusColor(battery1Status)}`}>
                {battery1Status.toUpperCase()}
              </div>
            </div>
            <Plot
              data={[
                {
                  x: timestamps,
                  y: battery1Data,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#FF6B6B', size: 6 },
                  line: { color: '#FF6B6B', width: 2 },
                },
              ]}
              layout={{
                paper_bgcolor: 'rgba(0, 0, 0, 0)',
                plot_bgcolor: 'rgba(0, 0, 0, 0)',
                xaxis: {
                  title: 'Time',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  tickangle: -45,
                },
                yaxis: {
                  title: 'Voltage (V)',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  range: [20, 30] // Adjust based on your battery range
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
            <div className="mt-4 p-2 bg-gray-700 rounded text-center">
              <p className="text-sm text-gray-300">Current Voltage</p>
              <p className="text-xl font-mono text-red-400">
                {latestData.battery1 !== null ? latestData.battery1.toFixed(2) + 'V' : 'N/A'}
              </p>
            </div>
          </div>

          {/* Battery 2 Graph */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-green-400">
                Battery 2 Voltage
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs ${getStatusColor(battery2Status)}`}>
                {battery2Status.toUpperCase()}
              </div>
            </div>
            <Plot
              data={[
                {
                  x: timestamps,
                  y: battery2Data,
                  type: 'scatter',
                  mode: 'lines+markers',
                  marker: { color: '#4ECDC4', size: 6 },
                  line: { color: '#4ECDC4', width: 2 },
                },
              ]}
              layout={{
                paper_bgcolor: 'rgba(0, 0, 0, 0)',
                plot_bgcolor: 'rgba(0, 0, 0, 0)',
                xaxis: {
                  title: 'Time',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  tickangle: -45,
                },
                yaxis: {
                  title: 'Voltage (V)',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  range: [20, 30] // Adjust based on your battery range
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
            <div className="mt-4 p-2 bg-gray-700 rounded text-center">
              <p className="text-sm text-gray-300">Current Voltage</p>
              <p className="text-xl font-mono text-green-400">
                {latestData.battery2 !== null ? latestData.battery2.toFixed(2) + 'V' : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}