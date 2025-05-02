import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createRosWebSocket } from '../lib/ros-websocket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function DvlPage() {
  // Velocity states
  const [vx, setVx] = useState([]);
  const [vy, setVy] = useState([]);
  const [vz, setVz] = useState([]);
  
  // Additional DVL metrics
  const [altitude, setAltitude] = useState([]);
  const [fom, setFom] = useState([]); // Figure of Merit
  
  // Timestamps and raw data
  const [timestamps, setTimestamps] = useState([]);
  const [rawData, setRawData] = useState(null);
  
  // Complete data history for CSV export
  const [allData, setAllData] = useState([]);
  
  // Current values display
  const [currentValues, setCurrentValues] = useState({
    vx: null,
    vy: null,
    vz: null,
    altitude: null,
    fom: null,
    velocityValid: false,
    status: null
  });

  useEffect(() => {
    const ws = createRosWebSocket('/dvl/data', (message) => {
      try {
        // Parse the incoming message
        const data = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
        
        // Update raw data display
        setRawData(JSON.stringify(data, null, 2));
        
        // Current timestamp
        const currentTime = new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });

        // Update velocity data (last 50 points)
        setVx(prev => [...prev.slice(-49), data.velocity?.x || 0]);
        setVy(prev => [...prev.slice(-49), data.velocity?.y || 0]);
        setVz(prev => [...prev.slice(-49), data.velocity?.z || 0]);
        
        // Update other metrics
        setAltitude(prev => [...prev.slice(-49), data.altitude || 0]);
        setFom(prev => [...prev.slice(-49), data.fom || 0]);
        
        // Update timestamps
        setTimestamps(prev => [...prev.slice(-49), currentTime]);
        
        // Store all data for CSV export
        setAllData(prev => [...prev, {
          timestamp: currentTime,
          vx: data.velocity?.x,
          vy: data.velocity?.y,
          vz: data.velocity?.z,
          altitude: data.altitude,
          fom: data.fom,
          velocityValid: data.velocity_valid,
          status: data.status
        }]);
        
        // Update current values
        setCurrentValues({
          vx: data.velocity?.x,
          vy: data.velocity?.y,
          vz: data.velocity?.z,
          altitude: data.altitude,
          fom: data.fom,
          velocityValid: data.velocity_valid,
          status: data.status
        });
      } catch (error) {
        console.error('Error processing DVL data:', error);
      }
    });

    return () => ws.close();
  }, []);

  // Function to download CSV
  const downloadCSV = () => {
    const csvHeader = "Timestamp,Vx (m/s),Vy (m/s),Vz (m/s),Altitude (m),FOM,Velocity Valid,Status\n";
    const csvRows = allData.map(item => {
      return `${item.timestamp},${item.vx?.toFixed(4) || ''},${item.vy?.toFixed(4) || ''},${item.vz?.toFixed(4) || ''},${item.altitude?.toFixed(2) || ''},${item.fom?.toFixed(4) || ''},${item.velocityValid},${item.status}`;
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "DVL_Data.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  // Function to get status color
  const getStatusColor = (valid) => {
    return valid ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-semibold mb-8 text-center text-teal-400">
          DVL Data Monitoring
        </h1>
        
        {/* Current Values Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm text-gray-400">X Velocity</h3>
            <p className="text-xl font-mono text-blue-400">
              {currentValues.vx !== null ? currentValues.vx.toFixed(4) + ' m/s' : 'N/A'}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm text-gray-400">Y Velocity</h3>
            <p className="text-xl font-mono text-green-400">
              {currentValues.vy !== null ? currentValues.vy.toFixed(4) + ' m/s' : 'N/A'}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm text-gray-400">Z Velocity</h3>
            <p className="text-xl font-mono text-red-400">
              {currentValues.vz !== null ? currentValues.vz.toFixed(4) + ' m/s' : 'N/A'}
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-sm text-gray-400">Status</h3>
            <div className="flex items-center">
              <span className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(currentValues.velocityValid)}`}></span>
              <span>{currentValues.velocityValid ? 'Valid' : 'Invalid'}</span>
            </div>
          </div>
        </div>

        {/* Velocity Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* X Velocity */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-400">
                X Velocity (m/s)
              </h2>
              <span className="text-sm text-gray-400">
                {timestamps[timestamps.length - 1] || ''}
              </span>
            </div>
            <Plot
              data={[{
                x: timestamps,
                y: vx,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: '#1D8CF8', size: 5 },
                line: { color: '#1D8CF8', width: 2 },
              }]}
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
                  title: 'Velocity (m/s)',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  zerolinecolor: '#666666',
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
          </div>

          {/* Y Velocity */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-green-400">
                Y Velocity (m/s)
              </h2>
              <span className="text-sm text-gray-400">
                {timestamps[timestamps.length - 1] || ''}
              </span>
            </div>
            <Plot
              data={[{
                x: timestamps,
                y: vy,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: '#4ECDC4', size: 5 },
                line: { color: '#4ECDC4', width: 2 },
              }]}
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
                  title: 'Velocity (m/s)',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  zerolinecolor: '#666666',
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
          </div>

          {/* Z Velocity */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-red-400">
                Z Velocity (m/s)
              </h2>
              <span className="text-sm text-gray-400">
                {timestamps[timestamps.length - 1] || ''}
              </span>
            </div>
            <Plot
              data={[{
                x: timestamps,
                y: vz,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: '#FF6B6B', size: 5 },
                line: { color: '#FF6B6B', width: 2 },
              }]}
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
                  title: 'Velocity (m/s)',
                  color: '#ffffff',
                  gridcolor: '#666666',
                  zerolinecolor: '#666666',
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Altitude Graph */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-yellow-400">
              Altitude (m)
            </h2>
            <Plot
              data={[{
                x: timestamps,
                y: altitude,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: '#FFD700', size: 5 },
                line: { color: '#FFD700', width: 2 },
              }]}
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
                  title: 'Altitude (m)',
                  color: '#ffffff',
                  gridcolor: '#666666',
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
          </div>

          {/* Figure of Merit Graph */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-purple-400">
              Figure of Merit
            </h2>
            <Plot
              data={[{
                x: timestamps,
                y: fom,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: '#9B59B6', size: 5 },
                line: { color: '#9B59B6', width: 2 },
              }]}
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
                  title: 'FOM',
                  color: '#ffffff',
                  gridcolor: '#666666',
                },
                margin: { t: 30, b: 70, l: 60, r: 30 },
              }}
              useResizeHandler
              style={{ width: '100%', height: '300px' }}
            />
          </div>
        </div>

        {/* Data Section */}
        <div className="grid grid-cols-1 gap-6">
          {/* Controls */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700 flex justify-center">
            <button
              onClick={downloadCSV}
              className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg shadow-md font-medium transition-colors"
            >
              Export Data (CSV)
            </button>
          </div>

          {/* Raw Data Display */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-yellow-400">
              Raw DVL Data
            </h2>
            <pre className="text-xs bg-gray-900 p-4 rounded overflow-x-auto text-gray-300 max-h-60">
              {rawData || 'Waiting for data...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}