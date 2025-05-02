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
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-semibold mb-10 text-center text-teal-400">
                    ROVL Sensor Monitoring
                </h1>
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
                    <h2 className="text-lg font-semibold text-center mb-4 text-purple-400">
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
                                        marker: { color: '#1abc9c' },
                                    },
                                ]}
                                layout={{
                                    title: 'Apparent Bearing (ab)',
                                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                                    plot_bgcolor: 'rgba(0, 0, 0, 0)',
                                    xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666' },
                                    yaxis: { title: 'Bearing (degrees)', color: '#ffffff', gridcolor: '#666666' },
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
                                        marker: { color: '#e74c3c' },
                                    },
                                ]}
                                layout={{
                                    title: 'Slant Range (sr)',
                                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                                    plot_bgcolor: 'rgba(0, 0, 0, 0)',
                                    xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666' },
                                    yaxis: { title: 'Range (meters)', color: '#ffffff', gridcolor: '#666666' },
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
                                        marker: { color: '#3498db' },
                                    },
                                ]}
                                layout={{
                                    title: 'Euler Yaw (ey)',
                                    paper_bgcolor: 'rgba(0, 0, 0, 0)',
                                    plot_bgcolor: 'rgba(0, 0, 0, 0)',
                                    xaxis: { title: 'Time', color: '#ffffff', gridcolor: '#666666' },
                                    yaxis: { title: 'Yaw (degrees)', color: '#ffffff', gridcolor: '#666666' },
                                }}
                                style={{ width: '100%', height: '300px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Latest Data Display */}
                <div className="bg-gray-800 rounded-lg p-6 mt-6 shadow-lg border border-gray-700">
                    <h2 className="text-lg font-semibold text-center mb-4 text-green-400">
                        Latest ROVL Data
                    </h2>
                    <pre className="text-sm bg-gray-900 p-4 rounded-lg overflow-x-auto text-white border border-gray-700">
                        {latestMessage ? JSON.stringify(latestMessage, null, 2) : 'No data received yet.'}
                    </pre>
                </div>

                {/* Download CSV Button */}
                <div className="text-center mt-6">
                    <button
                        onClick={downloadCSV}
                        className="bg-teal-400 text-white px-4 py-2 rounded shadow hover:bg-teal-500"
                    >
                        Download CSV
                    </button>
                </div>
            </div>
        </div>
    );
}



