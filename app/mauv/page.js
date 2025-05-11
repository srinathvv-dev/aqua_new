/**
 * @file Dashboard.js
 * @brief Modern light-themed dashboard for robotics sensor monitoring with ROS integration
 */
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  IconChartBar, 
  IconRobot,
  IconBattery,
  IconWaveSine,
  IconGauge,
  IconDroplet,
  IconPlugConnected,
  IconPlugOff,
  IconRefresh,
  IconRocket,
  IconSettings,
  IconActivity,
  IconPropeller,
  IconCamera,
  IconSun,
  IconMoon
} from "@tabler/icons-react";
import { createRosWebSocket } from "../../lib/ros-websocket";
import dynamic from "next/dynamic";

// Dynamic import for 3D visualization
const AHRSVisualization = dynamic(
  () => import("../../components/AHRSVisualization"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading 3D visualization...
        </p>
      </div>
    )
  }
);

// Sensor configurations with corresponding icons and data structure info
const sensors = [
  { 
    name: "AHRS Sensor", 
    path: "/ahrs", 
    topic: "/ahrs",
    icon: <IconGauge className="h-5 w-5" />,
    unit: "orientation",
    isArrayData: true // Flag indicating this topic uses array data structure
  },
  { 
    name: "Depth Sensor", 
    path: "/depth_impact", 
    topic: "/depth_impact",
    icon: <IconDroplet className="h-5 w-5" />,
    unit: "meters"
  },
  { 
    name: "Battery", 
    path: "/battery", 
    topic: "/battery_voltage",
    icon: <IconBattery className="h-5 w-5" />,
    unit: "volts"
  },
  { 
    name: "DVL Sensor", 
    path: "/dvl", 
    topic: "/dvl/data",
    icon: <IconWaveSine className="h-5 w-5" />,
    unit: "velocity"
  },
  { 
    name: "Leak Sensor", 
    path: "/leak", 
    topic: "/leak_topic",
    icon: <IconDroplet className="h-5 w-5" />,
    unit: "status"
  },
  { 
    name: "ROVL Sensor", 
    path: "/rovl", 
    topic: "/rovl",
    icon: <IconRobot className="h-5 w-5" />,
    unit: "status"
  },
];

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [sensorStatus, setSensorStatus] = useState({
    ahrs: false,
    bar30: false,
    battery: false,
    dvl: false,
    leak: false,
    rovl: false,
  });

  const [sensorValues, setSensorValues] = useState({
    ahrs: { data: [0, 0, 0] }, // Initialize with array structure
    depth_impact: 0,
    battery_voltage_1: 0,
    dvl: { x: 0, y: 0, z: 0 },
    leak_topic: false,
    rovl: { status: "inactive" }
  });

  const [rosStatus, setRosStatus] = useState({ roscore: false, rosbridge: false });
  const [isStarting, setIsStarting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [orientation, setOrientation] = useState({ roll: 0, pitch: 0, yaw: 0 });

  // Check ROS status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkRosStatus();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateStatus = (topic, isArrayData = false) => {
      let lastPublishedTime = Date.now();
      const ws = createRosWebSocket(topic, (msg) => {
        lastPublishedTime = Date.now();
        setLastUpdated(new Date());
        
        // Update sensor values
        setSensorValues(prev => ({
          ...prev,
          [topic]: msg
        }));

        // Update orientation if this is AHRS data
        if (topic === '/ahrs') {
          const data = isArrayData ? msg.data || [0, 0, 0] : msg;
          setOrientation({
            roll: isArrayData ? (data[2] || 0) : (data.roll || 0),
            pitch: isArrayData ? (data[1] || 0) : (data.pitch || 0),
            yaw: isArrayData ? (data[0] || 0) : (data.yaw || 0)
          });
        }
      });

      if (!ws) return;

      const checkPublishing = setInterval(() => {
        const timeSinceLastMessage = Date.now() - lastPublishedTime;
        setSensorStatus((prevState) => ({
          ...prevState,
          [topic]: timeSinceLastMessage < 2000,
        }));
      }, 1000);

      return () => {
        clearInterval(checkPublishing);
        ws.close();
      };
    };

    const cleanUps = sensors.map((sensor) => 
      updateStatus(sensor.topic, sensor.isArrayData)
    );

    return () => cleanUps.forEach((cleanUp) => cleanUp && cleanUp());
  }, []);

  const getStatusColor = (status) => 
    status ? (darkMode ? "bg-emerald-500/90" : "bg-emerald-400") : (darkMode ? "bg-rose-500/90" : "bg-rose-400");

  const startRosProcesses = async () => {
    setIsStarting(true);
    try {
      await axios.post("/api/start-ros", { action: "start" });
      checkRosStatus();
    } catch (error) {
      console.error("Failed to start ROS processes:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const checkRosStatus = async () => {
    try {
      const { data } = await axios.post("/api/start-ros", { action: "status" });
      setRosStatus(data.status);
    } catch (error) {
      console.error("Failed to fetch ROS status:", error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatSensorValue = (topic, isArrayData = false) => {
    const value = sensorValues[topic];
    if (!value) return "N/A";
    
    switch(topic) {
      case '/ahrs':
        if (isArrayData) {
          const dataArray = value.data || [0, 0, 0];
          return `${dataArray[2]?.toFixed(1) || '0.0'}° / ${dataArray[1]?.toFixed(1) || '0.0'}° / ${dataArray[0]?.toFixed(1) || '0.0'}°`;
        } else {
          return value && typeof value === 'object' 
            ? `${value.roll?.toFixed(1) || '0.0'}° / ${value.pitch?.toFixed(1) || '0.0'}° / ${value.yaw?.toFixed(1) || '0.0'}°`
            : "N/A";
        }
      case '/depth_impact':
        return typeof value === 'number' 
          ? `${value.toFixed(2)} m` 
          : "N/A";
      case '/battery_voltage_1':
        return typeof value === 'number' 
          ? `${value.toFixed(2)} V` 
          : "N/A";
      case '/dvl/data':
        return value && typeof value === 'object'
          ? `${value.x?.toFixed(2) || '0.00'} m/s`
          : "N/A";
      case '/leak_topic':
        return typeof value === 'boolean'
          ? (value ? "LEAK DETECTED" : "Dry")
          : "N/A";
      case '/rovl':
        return value?.status || "Active";
      default:
        try {
          return JSON.stringify(value);
        } catch {
          return "N/A";
        }
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"} font-sans p-6 transition-colors duration-300`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${darkMode ? "bg-gradient-to-br from-blue-600 to-emerald-500" : "bg-gradient-to-br from-blue-400 to-emerald-400"}`}>
            <IconRobot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? "from-blue-400 to-emerald-400" : "from-blue-500 to-emerald-500"}`}>
              AQUA Robotics Control
            </h1>
            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} flex items-center gap-2`}>
              <span className={`h-2 w-2 rounded-full ${rosStatus.roscore && rosStatus.rosbridge ? (darkMode ? 'bg-emerald-400' : 'bg-emerald-500') : (darkMode ? 'bg-rose-400' : 'bg-rose-500')}`}></span>
              {rosStatus.roscore && rosStatus.rosbridge ? 'ROS Connected' : 'ROS Disconnected'}
              <span className={darkMode ? "text-gray-500" : "text-gray-400"}>|</span>
              Last update: {formatTime(lastUpdated)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`}
          >
            {darkMode ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={checkRosStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`}
          >
            <IconRefresh className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={startRosProcesses}
            disabled={isStarting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              isStarting
                ? (darkMode ? "bg-blue-600/50" : "bg-blue-400/50") + " cursor-not-allowed"
                : (darkMode ? "bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/20" : "bg-blue-500 hover:bg-blue-400 shadow-lg hover:shadow-blue-400/20")
            }`}
          >
            {isStarting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </>
            ) : (
              <>
                <IconRocket className="h-4 w-4" />
                Start ROS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - ROS Status and Sensors */}
        <div className="space-y-6">
          {/* ROS Status Card */}
          <div className={`p-5 rounded-xl shadow-lg ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconRocket className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-500"}`} />
                ROS Process Status
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${rosStatus.roscore ? (darkMode ? 'bg-emerald-400' : 'bg-emerald-500') : (darkMode ? 'bg-rose-400' : 'bg-rose-500')}`}></div>
                  <span className="text-xs">roscore</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${rosStatus.rosbridge ? (darkMode ? 'bg-emerald-400' : 'bg-emerald-500') : (darkMode ? 'bg-rose-400' : 'bg-rose-500')}`}></div>
                  <span className="text-xs">rosbridge</span>
                </div>
              </div>
            </div>
            
            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"} mb-4`}>
              {rosStatus.roscore && rosStatus.rosbridge 
                ? "All ROS processes are running normally"
                : "ROS processes are not running. Start them to enable sensor communication."}
            </p>
          </div>

          {/* Sensors Grid */}
          <div className="grid grid-cols-2 gap-4">
            {sensors.map((sensor, index) => (
              <Link
                key={index}
                href={sensor.path}
                className={`group relative p-4 rounded-xl ${getStatusColor(sensorStatus[sensor.topic])} transition-all cursor-pointer shadow-lg hover:shadow-xl overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className={`${darkMode ? "bg-black/20" : "bg-white/30"} p-1.5 rounded-lg`}>
                      {sensor.icon}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      sensorStatus[sensor.topic] 
                        ? (darkMode ? 'bg-emerald-900/30 text-emerald-100' : 'bg-emerald-100 text-emerald-800') 
                        : (darkMode ? 'bg-rose-900/30 text-rose-100' : 'bg-rose-100 text-rose-800')
                    }`}>
                      {sensorStatus[sensor.topic] ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{sensor.name}</h3>
                  <p className={`text-xs ${darkMode ? "opacity-80" : "text-gray-700"} mb-1`}>
                    {formatSensorValue(sensor.topic, sensor.isArrayData)}
                  </p>
                  <p className={`text-[0.65rem] ${darkMode ? "opacity-60" : "text-gray-500"}`}>{sensor.unit}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Middle Column - Camera Feed */}
        <div className="space-y-6">
          <div className={`p-5 rounded-xl shadow-lg h-full ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconCamera className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-500"}`} />
                Camera Feed
              </h2>
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Live Stream</span>
            </div>
            
            {/* Camera Frame - Placeholder for actual camera feed */}
            <div className={`rounded-lg aspect-video flex items-center justify-center border ${darkMode ? "bg-black border-gray-800" : "bg-gray-100 border-gray-300"}`}>
              <div className="text-center p-4">
                <IconCamera className={`h-12 w-12 mx-auto mb-2 ${darkMode ? "text-gray-700" : "text-gray-400"}`} />
                <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-400"}`}>Camera feed will appear here</p>
                <p className={`text-xs ${darkMode ? "text-gray-600" : "text-gray-500"} mt-1`}>1920x1080 @ 30fps</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className={`px-3 py-2 rounded-lg text-sm transition-colors ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`}>
                Zoom In
              </button>
              <button className={`px-3 py-2 rounded-lg text-sm transition-colors ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`}>
                Zoom Out
              </button>
              <button className={`px-3 py-2 rounded-lg text-sm transition-colors ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`}>
                Record
              </button>
              <button className={`px-3 py-2 rounded-lg text-sm transition-colors ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`}>
                Snapshot
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - AHRS 3D Visualization */}
<div className="space-y-6">
  <div
    className={`p-5 rounded-xl shadow-lg h-full flex flex-col ${
      darkMode
        ? "bg-gray-900 border border-gray-800"
        : "bg-white border border-gray-200"
    }`}
  >
    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
      <IconGauge
        className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-500"}`}
      />
      AHRS Orientation
    </h2>

    {/* 3D Visualization */}
    <div className="flex-grow mb-4">
      <div className="h-64 w-full">
        <AHRSVisualization
          roll={orientation.roll}
          pitch={orientation.pitch}
          yaw={orientation.yaw}
          darkMode={darkMode}
        />
      </div>
    </div>

    {/* Orientation Values */}
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div
        className={`p-2 rounded-lg text-center ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-xs ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Roll
        </p>
        <p
          className={`text-lg font-mono ${
            darkMode ? "text-red-400" : "text-red-600"
          }`}
        >
          {orientation.roll.toFixed(1)}°
        </p>
      </div>
      <div
        className={`p-2 rounded-lg text-center ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-xs ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Pitch
        </p>
        <p
          className={`text-lg font-mono ${
            darkMode ? "text-blue-400" : "text-blue-600"
          }`}
        >
          {orientation.pitch.toFixed(1)}°
        </p>
      </div>
      <div
        className={`p-2 rounded-lg text-center ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        <p
          className={`text-xs ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Yaw
        </p>
        <p
          className={`text-lg font-mono ${
            darkMode ? "text-green-400" : "text-green-600"
          }`}
        >
          {orientation.yaw.toFixed(1)}°
        </p>
      </div>
    </div>

    {/* Button */}
    <div className="mt-auto">
      <Link
        href="/ahrs"
        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
          darkMode
            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20"
            : "bg-blue-500 hover:bg-blue-400 text-white shadow-lg hover:shadow-blue-400/20"
        }`}
      >
        <IconChartBar className="h-4 w-4" />
        View Detailed AHRS Data
      </Link>
    </div>
  </div>

          
          {/* Quick Access Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/CombinedGraphPage" className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${darkMode ? "bg-gray-900 hover:bg-gray-800 border border-gray-800" : "bg-white hover:bg-gray-50 border border-gray-200"}`}>
              <IconChartBar className={`h-4 w-4 ${darkMode ? "text-blue-400" : "text-blue-500"}`} />
              <span className="text-sm">Graphs</span>
            </Link>
            <Link href="/operations" className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${darkMode ? "bg-gray-900 hover:bg-gray-800 border border-gray-800" : "bg-white hover:bg-gray-50 border border-gray-200"}`}>
              <IconActivity className={`h-4 w-4 ${darkMode ? "text-emerald-400" : "text-emerald-500"}`} />
              <span className="text-sm">Operations</span>
            </Link>
            {/* <Link href="/settings" className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${darkMode ? "bg-gray-900 hover:bg-gray-800 border border-gray-800" : "bg-white hover:bg-gray-50 border border-gray-200"}`}>
              <IconSettings className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-500"}`} />
              <span className="text-sm">Settings</span>
            </Link> */}
          </div>
        </div>
      </div>
    </div>
  );
}