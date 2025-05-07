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

// Sensor configurations with corresponding icons
const sensors = [
  { 
    name: "AHRS Sensor", 
    path: "/ahrs", 
    topic: "/ahrs",
    icon: <IconGauge className="h-5 w-5" />,
    unit: "orientation"
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
    topic: "/battery_voltage_1",
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

// Thruster configuration
const thrusters = [
  { id: 1, name: "Depth Thruster 1", type: "depth", power: 0 },
  { id: 2, name: "Depth Thruster 2", type: "depth", power: 0 },
  { id: 3, name: "Surge Thruster", type: "surge", power: 0 },
  { id: 4, name: "Lateral Thruster 1", type: "lateral", power: 0 },
  { id: 5, name: "Lateral Thruster 2", type: "lateral", power: 0 }
];

// Thruster presets
const THRUSTER_PRESETS = {
  neutral: [
    { id: 1, power: 0 },
    { id: 2, power: 0 },
    { id: 3, power: 0 },
    { id: 4, power: 0 },
    { id: 5, power: 0 }
  ],
  forward: [
    { id: 1, power: 0 },
    { id: 2, power: 0 },
    { id: 3, power: 80 },
    { id: 4, power: 0 },
    { id: 5, power: 0 }
  ],
  dive: [
    { id: 1, power: 70 },
    { id: 2, power: 70 },
    { id: 3, power: 0 },
    { id: 4, power: 0 },
    { id: 5, power: 0 }
  ],
  strafe: [
    { id: 1, power: 0 },
    { id: 2, power: 0 },
    { id: 3, power: 0 },
    { id: 4, power: 80 },
    { id: 5, power: 80 }
  ],
  reverse: [
    { id: 1, power: 0 },
    { id: 2, power: 0 },
    { id: 3, power: -80 },
    { id: 4, power: 0 },
    { id: 5, power: 0 }
  ]
};

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
    ahrs: { roll: 0, pitch: 0, yaw: 0 },
    depth_impact: 0,
    battery_voltage_1: 0,
    dvl: { x: 0, y: 0, z: 0 },
    leak_topic: false,
    rovl: { status: "inactive" }
  });

  const [thrusterPower, setThrusterPower] = useState(thrusters);
  const [rosStatus, setRosStatus] = useState({ roscore: false, rosbridge: false });
  const [isStarting, setIsStarting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activePreset, setActivePreset] = useState(null);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  useEffect(() => {
    const updateStatus = (topic) => {
      let lastPublishedTime = Date.now();
      const ws = createRosWebSocket(topic, (msg) => {
        lastPublishedTime = Date.now();
        setLastUpdated(new Date());
        
        // Update sensor values
        setSensorValues(prev => ({
          ...prev,
          [topic]: msg
        }));
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

    const cleanUps = sensors.map((sensor) => updateStatus(sensor.topic));

    return () => cleanUps.forEach((cleanUp) => cleanUp());
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

  const handleThrusterChange = (id, value) => {
    setThrusterPower(prev => 
      prev.map(thruster => 
        thruster.id === id ? { ...thruster, power: value } : thruster
      )
    );
    setActivePreset(null); // Clear preset when manually adjusting
  };

  const handleAllStop = async () => {
    setIsSendingCommand(true);
    try {
      setThrusterPower(prev => 
        prev.map(thruster => ({ ...thruster, power: 0 }))
      );
      setActivePreset('neutral');
      await sendThrusterCommandToROS(THRUSTER_PRESETS.neutral);
    } catch (error) {
      console.error("Failed to send stop command:", error);
    } finally {
      setIsSendingCommand(false);
    }
  };

  const handlePreset = async (presetName) => {
    setIsSendingCommand(true);
    try {
      const preset = THRUSTER_PRESETS[presetName];
      if (!preset) return;
      
      setThrusterPower(prev => 
        prev.map(thruster => {
          const presetThruster = preset.find(t => t.id === thruster.id);
          return {
            ...thruster,
            power: presetThruster ? presetThruster.power : 0
          };
        })
      );
      setActivePreset(presetName);
      await sendThrusterCommandToROS(preset);
    } catch (error) {
      console.error("Failed to send preset command:", error);
    } finally {
      setIsSendingCommand(false);
    }
  };

  const sendThrusterCommandToROS = async (thrusterCommands) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log("Sending thruster commands to ROS:", thrusterCommands);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatSensorValue = (topic) => {
    const value = sensorValues[topic];
    if (!value) return "N/A";
    
    switch(topic) {
      case '/ahrs':
        return value && typeof value === 'object' 
          ? `${value.roll?.toFixed?.(1) || '0.0'}° / ${value.pitch?.toFixed?.(1) || '0.0'}° / ${value.yaw?.toFixed?.(1) || '0.0'}°`
          : "N/A";
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
          ? `${value.x?.toFixed?.(2) || '0.00'} m/s`
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

  const getPresetButtonClass = (presetName) => {
    const baseClass = "px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-center";
    const isActive = activePreset === presetName;
    
    if (isSendingCommand && isActive) {
      return `${baseClass} ${darkMode ? "bg-blue-600/50" : "bg-blue-400/50"} cursor-not-allowed`;
    }
    if (isActive) {
      return `${baseClass} ${darkMode ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20" : "bg-blue-500 hover:bg-blue-400 shadow-lg shadow-blue-400/20"}`;
    }
    return `${baseClass} ${darkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200 border border-gray-200"}`;
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
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
                    {formatSensorValue(sensor.topic)}
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

        {/* Right Column - Thruster Controls */}
        <div className="space-y-6">
          <div className={`p-5 rounded-xl shadow-lg ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"}`}>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <IconPropeller className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-500"}`} />
              Thruster Controls
            </h2>
            
            <div className="space-y-5">
              {thrusterPower.map((thruster) => (
                <div key={thruster.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{thruster.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      thruster.power === 0 
                        ? (darkMode ? 'bg-gray-800' : 'bg-gray-100') 
                        : thruster.power > 0 
                          ? (darkMode ? 'bg-blue-900/50' : 'bg-blue-100') 
                          : (darkMode ? 'bg-rose-900/50' : 'bg-rose-100')
                    }`}>
                      {thruster.power}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={thruster.power}
                    onChange={(e) => handleThrusterChange(thruster.id, parseInt(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full ${
                      darkMode 
                        ? "bg-gray-800 [&::-webkit-slider-thumb]:bg-blue-500" 
                        : "bg-gray-200 [&::-webkit-slider-thumb]:bg-blue-400"
                    }`}
                  />
                  <div className={`flex justify-between text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    <span>-100%</span>
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button 
                onClick={handleAllStop}
                disabled={isSendingCommand && activePreset === 'neutral'}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm ${
                  isSendingCommand && activePreset === 'neutral'
                    ? (darkMode ? "bg-blue-600/50" : "bg-blue-400/50") + " cursor-not-allowed"
                    : (darkMode ? "bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/20" : "bg-blue-500 hover:bg-blue-400 shadow-lg hover:shadow-blue-400/20")
                }`}
              >
                {isSendingCommand && activePreset === 'neutral' ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <IconPlugOff className="h-4 w-4" />
                    <span>All Stop</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => handlePreset('forward')}
                disabled={isSendingCommand && activePreset === 'forward'}
                className={getPresetButtonClass('forward')}
              >
                {isSendingCommand && activePreset === 'forward' ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <IconRocket className="h-4 w-4" />
                    <span>Forward</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <button 
                onClick={() => handlePreset('dive')}
                disabled={isSendingCommand && activePreset === 'dive'}
                className={getPresetButtonClass('dive')}
              >
                {isSendingCommand && activePreset === 'dive' ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <IconDroplet className="h-4 w-4" />
                    <span>Dive</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => handlePreset('strafe')}
                disabled={isSendingCommand && activePreset === 'strafe'}
                className={getPresetButtonClass('strafe')}
              >
                {isSendingCommand && activePreset === 'strafe' ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <IconWaveSine className="h-4 w-4" />
                    <span>Strafe</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => handlePreset('reverse')}
                disabled={isSendingCommand && activePreset === 'reverse'}
                className={getPresetButtonClass('reverse')}
              >
                {isSendingCommand && activePreset === 'reverse' ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <IconRocket className="h-4 w-4 transform rotate-180" />
                    <span>Reverse</span>
                  </>
                )}
              </button>
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
            <Link href="/settings" className={`p-3 rounded-lg flex items-center gap-2 transition-colors ${darkMode ? "bg-gray-900 hover:bg-gray-800 border border-gray-800" : "bg-white hover:bg-gray-50 border border-gray-200"}`}>
              <IconSettings className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-500"}`} />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
