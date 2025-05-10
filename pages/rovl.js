import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createRosWebSocket } from '../lib/ros-websocket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Function to normalize angle between -180 and 180 degrees
const normalizeAngle = (angle) => {
    angle = angle % 360;
    if (angle > 180) {
        angle -= 360;
    } else if (angle < -180) {
        angle += 360;
    }
    return angle;
};

export default function RovlPage() {
    const [timestamps, setTimestamps] = useState([]);
    const [abValues, setAbValues] = useState([]);
    const [srValues, setSrValues] = useState([]);
    const [eyValues, setEyValues] = useState([]);
    const [latestMessage, setLatestMessage] = useState(null);
    const [darkMode, setDarkMode] = useState(true);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTimes, setElapsedTimes] = useState([]);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const parseUSRTHMessage = (message) => {
        const fields = message.split(',');
        if (fields[0] === '$USRTH' && fields.length > 11) {
            return {
                ab: normalizeAngle(parseFloat(fields[1])),
                sr: parseFloat(fields[4]),
                ey: normalizeAngle(parseFloat(fields[11])),
            };
        }
        return null;
    };

    useEffect(() => {
        const ws = createRosWebSocket('/rovl', (message) => {
            if (message && typeof message === 'object' && 'data' in message) {
                const { data } = message;
                const parsedData = parseUSRTHMessage(data);
                const currentTime = new Date();

                if (parsedData) {
                    // Set start time on first data point
                    if (!startTime) {
                        setStartTime(currentTime);
                    }

                    // Calculate elapsed time in seconds
                    const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;

                    const timeString = currentTime.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                    });

                    setTimestamps((prev) => [...prev, timeString]);
                    setAbValues((prev) => [...prev, parsedData.ab]);
                    setSrValues((prev) => [...prev, parsedData.sr]);
                    setEyValues((prev) => [...prev, parsedData.ey]);
                    setElapsedTimes((prev) => [...prev, elapsedTime]);
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
    }, [startTime]);

    const downloadCSV = () => {
        let csvContent = 'Timestamp,Elapsed Time (s),Apparent Bearing (deg),Slant Range (m),Euler Yaw (deg)\n';
        timestamps.forEach((timestamp, index) => {
            csvContent += `${timestamp},${elapsedTimes[index]?.toFixed(2) || ''},${abValues[index] ?? ''},${srValues[index] ?? ''},${eyValues[index] ?? ''}\n`;
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
                
                {/* Horizontal Plots Container */}
                <div className="space-y-8">
                    {/* Apparent Bearing Graph */}
                    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <h2 className={`text-lg font-semibold ${darkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                                Apparent Bearing (degrees)
                            </h2>
                            <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                {abValues.length > 0 ? abValues[abValues.length - 1].toFixed(2) : 'N/A'}
                            </div>
                        </div>
                        <Plot
                            data={[
                                {
                                    x: elapsedTimes,
                                    y: abValues,
                                    type: 'scatter',
                                    mode: 'lines',
                                    line: { 
                                        color: darkMode ? '#1abc9c' : '#0d9488', 
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
                                    range: [0, 1000], // 5 minutes
                                    fixedrange: true,
                                    tick0: 0,
                                    dtick: 60, // Show a tick every minute
                                },
                                yaxis: {
                                    title: "Bearing (degrees)",
                                    showgrid: true,
                                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                                    color: darkMode ? '#D1D5DB' : '#4B5563',
                                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                                    mirror: true,
                                    showline: true,
                                    zeroline: false,
                                    fixedrange: true,
                                    range: [-180, 180] // Full bearing range
                                },
                                hovermode: "x unified",
                                showlegend: false,
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
                                                'yaxis.range': [-180, 180]
                                            });
                                        }
                                    }
                                ]
                            }}
                            useResizeHandler
                            style={{ width: "100%", height: "300px" }}
                        />
                    </div>
                                {/* Euler Yaw Graph */}
                                <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h2 className={`text-lg font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                            Euler Yaw (degrees)
                                        </h2>
                                        <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                            {eyValues.length > 0 ? eyValues[eyValues.length - 1].toFixed(2) : 'N/A'}
                                        </div>
                                    </div>
                                    <Plot
                                        data={[
                                            {
                                                x: elapsedTimes,
                                                y: eyValues,
                                                type: 'scatter',
                                                mode: 'lines',
                                                line: { 
                                                    color: darkMode ? '#3498db' : '#2563eb', 
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
                                                range: [0, 1000], // 5 minutes
                                                fixedrange: true,
                                                tick0: 0,
                                                dtick: 60, // Show a tick every minute
                                            },
                                            yaxis: {
                                                title: "Yaw (degrees)",
                                                showgrid: true,
                                                gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                                                color: darkMode ? '#D1D5DB' : '#4B5563',
                                                tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                                                linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                                                mirror: true,
                                                showline: true,
                                                zeroline: false,
                                                fixedrange: true,
                                                range: [-180, 180] // Full yaw range
                                            },
                                            hovermode: "x unified",
                                            showlegend: false,
                                        }}
                                        useResizeHandler
                                        style={{ width: "100%", height: "300px" }}
                                    />
                                </div>

                    {/* Slant Range Graph */}
                    <div className={`rounded-lg p-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <h2 className={`text-lg font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                                Slant Range (meters)
                            </h2>
                            <div className={`text-lg font-mono px-2 py-1 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                {srValues.length > 0 ? srValues[srValues.length - 1].toFixed(2) : 'N/A'}
                            </div>
                        </div>
                        <Plot
                            data={[
                                {
                                    x: elapsedTimes,
                                    y: srValues,
                                    type: 'scatter',
                                    mode: 'lines',
                                    line: { 
                                        color: darkMode ? '#e74c3c' : '#dc2626', 
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
                                    range: [0, 1000], // 5 minutes
                                    fixedrange: true,
                                    tick0: 0,
                                    dtick: 60, // Show a tick every minute
                                },
                                yaxis: {
                                    title: "Range (meters)",
                                    showgrid: true,
                                    gridcolor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                                    color: darkMode ? '#D1D5DB' : '#4B5563',
                                    tickfont: { color: darkMode ? '#D1D5DB' : '#4B5563' },
                                    linecolor: darkMode ? '#4B5563' : '#D1D5DB',
                                    mirror: true,
                                    showline: true,
                                    zeroline: false,
                                    fixedrange: true,
                                    range: [0, 50] // Fixed range for slant range
                                },
                                hovermode: "x unified",
                                showlegend: false,
                            }}
                            useResizeHandler
                            style={{ width: "100%", height: "300px" }}
                        />
                    </div>

                </div>

                {/* Latest Data Display */}
                <div className={`rounded-lg p-6 mt-6 shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className={`text-lg font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            Latest ROVL Data
                        </h2>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Elapsed: {elapsedTimes.length > 0 ? `${elapsedTimes[elapsedTimes.length - 1].toFixed(1)}s` : 'N/A'}
                        </span>
                    </div>
                    <pre className={`text-sm p-4 rounded-lg overflow-x-auto border ${darkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                        {latestMessage ? latestMessage : 'No data received yet.'}
                    </pre>
                </div>

                {/* Download CSV Button */}
                <div className="text-center mt-6">
                    <button
                        onClick={downloadCSV}
                        className={`px-6 py-2 ${darkMode ? 'bg-teal-400 hover:bg-teal-500' : 'bg-teal-600 hover:bg-teal-700'} text-white rounded-lg shadow-md font-medium transition-colors`}
                        disabled={timestamps.length === 0}
                    >
                        {timestamps.length === 0 ? 'No Data to Export' : 'Download CSV'}
                    </button>
                </div>
            </div>
        </div>
    );
}