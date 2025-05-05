import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createRosWebSocket } from '../lib/ros-websocket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function RovlPage() {
    const [timestamps, setTimestamps] = useState([]);
    const [abValues, setAbValues] = useState([]);
    const [srValues, setSrValues] = useState([]);
    const [eyValues, setEyValues] = useState([]);
    const [latestMessage, setLatestMessage] = useState(null);
    const [darkMode, setDarkMode] = useState(true);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const parseUSRTHMessage = (message) => {
        const fields = message.split(',');
        if (fields[0] === '$USRTH' && fields.length > 11) {
            return {
                ab: parseFloat(fields[1]),
                sr: parseFloat(fields[4]),
                ey: parseFloat(fields[11]),
            };
        }
        return null;
    };

    useEffect(() => {
        const ws = createRosWebSocket('/rovl', (message) => {
            if (message && typeof message === 'object' && 'data' in message) {
                const { data } = message;
                const parsedData = parseUSRTHMessage(data);

                if (parsedData) {
                    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    setTimestamps((prev) => [...prev.slice(-49), currentTime]);
                    setAbValues((prev) => [...prev.slice(-49), parsedData.ab]);
                    setSrValues((prev) => [...prev.slice(-49), parsedData.sr]);
                    setEyValues((prev) => [...prev.slice(-49), parsedData.ey]);
                    setLatestMessage(data);
                }
            }
        });

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            ws.close();
        };
    }, []);

    const downloadCSV = () => {
        let csvContent = 'Timestamp,Apparent Bearing,Slant Range,Euler Yaw\n';
        timestamps.forEach((timestamp, index) => {
            csvContent += `${timestamp},${abValues[index] ?? ''},${srValues[index] ?? ''},${eyValues[index] ?? ''}\n`;
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
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-8 transition-colors duration-200`}>
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-4xl font-semibold text-center ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                        ROVL Sensor Monitoring
                    </h1>
                    <button
                        onClick={toggleTheme}
                        className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors`}
                    >
                        {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                </div>
                
                <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        ROVL Data Graphs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Apparent Bearing Graph */}
                        <div>
                            <Plot
                                data={[
                                    {
                                        x: timestamps,
                                        y: abValues,
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        marker: { color: darkMode ? '#1abc9c' : '#0d9488' },
                                        line: { color: darkMode ? '#1abc9c' : '#0d9488', width: 2 },
                                    },
                                ]}
                                layout={{
                                    title: 'Apparent Bearing (ab)',
                                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                                    plot_bgcolor: 'rgba(0, 0, 0, 0)',
                                    xaxis: { 
                                        title: 'Time', 
                                        color: darkMode ? '#ffffff' : '#000000', 
                                        gridcolor: darkMode ? '#666666' : '#e5e7eb',
                                        tickangle: -45 
                                    },
                                    yaxis: { 
                                        title: 'Bearing (degrees)', 
                                        color: darkMode ? '#ffffff' : '#000000', 
                                        gridcolor: darkMode ? '#666666' : '#e5e7eb' 
                                    },
                                    margin: { t: 40, b: 60, l: 60, r: 30 },
                                }}
                                style={{ width: '100%', height: '300px' }}
                            />
                        </div>

                        {/* Slant Range Graph */}
                        <div>
                            <Plot
                                data={[
                                    {
                                        x: timestamps,
                                        y: srValues,
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        marker: { color: darkMode ? '#e74c3c' : '#dc2626' },
                                        line: { color: darkMode ? '#e74c3c' : '#dc2626', width: 2 },
                                    },
                                ]}
                                layout={{
                                    title: 'Slant Range (sr)',
                                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                                    plot_bgcolor: 'rgba(0, 0, 0, 0)',
                                    xaxis: { 
                                        title: 'Time', 
                                        color: darkMode ? '#ffffff' : '#000000', 
                                        gridcolor: darkMode ? '#666666' : '#e5e7eb',
                                        tickangle: -45 
                                    },
                                    yaxis: { 
                                        title: 'Range (meters)', 
                                        color: darkMode ? '#ffffff' : '#000000', 
                                        gridcolor: darkMode ? '#666666' : '#e5e7eb' 
                                    },
                                    margin: { t: 40, b: 60, l: 60, r: 30 },
                                }}
                                style={{ width: '100%', height: '300px' }}
                            />
                        </div>

                        {/* Euler Yaw Graph */}
                        <div>
                            <Plot
                                data={[
                                    {
                                        x: timestamps,
                                        y: eyValues,
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        marker: { color: darkMode ? '#3498db' : '#2563eb' },
                                        line: { color: darkMode ? '#3498db' : '#2563eb', width: 2 },
                                    },
                                ]}
                                layout={{
                                    title: 'Euler Yaw (ey)',
                                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                                    plot_bgcolor: 'rgba(0, 0, 0, 0)',
                                    xaxis: { 
                                        title: 'Time', 
                                        color: darkMode ? '#ffffff' : '#000000', 
                                        gridcolor: darkMode ? '#666666' : '#e5e7eb',
                                        tickangle: -45 
                                    },
                                    yaxis: { 
                                        title: 'Yaw (degrees)', 
                                        color: darkMode ? '#ffffff' : '#000000', 
                                        gridcolor: darkMode ? '#666666' : '#e5e7eb' 
                                    },
                                    margin: { t: 40, b: 60, l: 60, r: 30 },
                                }}
                                style={{ width: '100%', height: '300px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Latest Data Display */}
                <div className={`rounded-lg p-6 mt-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h2 className={`text-lg font-semibold text-center mb-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Latest ROVL Data
                    </h2>
                    <pre className={`text-sm p-4 rounded-lg overflow-x-auto border ${darkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                        {latestMessage ? latestMessage : 'No data received yet.'}
                    </pre>
                </div>

                {/* Download CSV Button */}
                <div className="text-center mt-6">
                    <button
                        onClick={downloadCSV}
                        className={`px-6 py-2 ${darkMode ? 'bg-teal-400 hover:bg-teal-500' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg shadow-md font-medium transition-colors`}
                    >
                        Download CSV
                    </button>
                </div>
            </div>
        </div>
    );
}