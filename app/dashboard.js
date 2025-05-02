/**
 * @file Dashboard.js
 * @brief Modern industrial dashboard for robotics sensor monitoring with ROS integration
 */
// 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
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  IconChartBar, 
  IconUserBolt,
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
  IconActivity
} from "@tabler/icons-react";
import { createRosWebSocket } from "../lib/ros-websocket";

// Sensor configurations with corresponding icons
const sensors = [
  { 
    name: "AHRS Sensor", 
    path: "/ahrs", 
    topic: "/ahrs",
    icon: <IconGauge className="h-6 w-6" />
  },
  { 
    name: "Depth Sensor", 
    path: "/depth_impact", 
    topic: "/depth_impact",
    icon: <IconDroplet className="h-6 w-6" />
  },
  { 
    name: "Battery Sensors", 
    path: "/battery", 
    topic: "/battery_voltage_1",
    icon: <IconBattery className="h-6 w-6" />
  },
  { 
    name: "DVL Sensor", 
    path: "/dvl", 
    topic: "/dvl/data",
    icon: <IconWaveSine className="h-6 w-6" />
  },
  { 
    name: "Leak Sensor", 
    path: "/leak", 
    topic: "/leak_topic",
    icon: <IconDroplet className="h-6 w-6" />
  },
  { 
    name: "ROVL Sensor", 
    path: "/rovl", 
    topic: "/rovl",
    icon: <IconRobot className="h-6 w-6" />
  },
];

export default function Dashboard() {
  const [sensorStatus, setSensorStatus] = useState({
    ahrs: false,
    bar30: false,
    battery: false,
    dvl: false,
    leak: false,
    rovl: false,
  });

  const [rosStatus, setRosStatus] = useState({ roscore: false, rosbridge: false });
  const [isStarting, setIsStarting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const links = [
    ...sensors.map((sensor) => ({
      label: sensor.name,
      href: sensor.path,
      icon: sensor.icon,
    })),
    {
      label: "Graphs",
      href: "/CombinedGraphPage",
      icon: <IconChartBar className="h-5 w-5" />,
    },
    {
      label: "Operations",
      href: "/operations",
      icon: <IconActivity className="h-5 w-5" />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <IconSettings className="h-5 w-5" />,
    },
  ];

  useEffect(() => {
    const updateStatus = (topic) => {
      let lastPublishedTime = Date.now();
      const ws = createRosWebSocket(topic, () => {
        lastPublishedTime = Date.now();
        setLastUpdated(new Date());
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
    status ? "bg-emerald-500/90" : "bg-rose-500/90";

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

  // Format last updated time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <Sidebar links={links} />
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              AQUA Robotics Control
            </h1>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${rosStatus.roscore && rosStatus.rosbridge ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              {rosStatus.roscore && rosStatus.rosbridge ? 'ROS Connected' : 'ROS Disconnected'}
              <span className="text-gray-500">|</span>
              Last update: {formatTime(lastUpdated)}
            </p>
          </div>
          <button 
            onClick={checkRosStatus}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <IconRefresh className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* ROS Process Status Card */}
        <div className="mb-8">
          <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <IconRocket className="h-5 w-5 text-blue-400" />
                ROS Process Control
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${rosStatus.roscore ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  <span className="text-sm">roscore</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${rosStatus.rosbridge ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  <span className="text-sm">rosbridge</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-400 max-w-md">
                {rosStatus.roscore && rosStatus.rosbridge 
                  ? "All ROS processes are running normally"
                  : "ROS processes are not running. Start them to enable sensor communication."}
              </p>
              <button
                onClick={startRosProcesses}
                disabled={isStarting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  isStarting
                    ? "bg-blue-600/50 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/20"
                }`}
              >
                {isStarting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>
                    <IconRocket className="h-5 w-5" />
                    Start ROS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sensor Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sensors.map((sensor, index) => (
            <Link
              key={index}
              href={sensor.path}
              className={`group relative p-5 rounded-xl ${getStatusColor(sensorStatus[sensor.topic])} transition-all cursor-pointer shadow-lg hover:shadow-xl overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-black/20 p-2 rounded-lg">
                    {sensor.icon}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${sensorStatus[sensor.topic] ? 'bg-emerald-900/30 text-emerald-100' : 'bg-rose-900/30 text-rose-100'}`}>
                    {sensorStatus[sensor.topic] ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{sensor.name}</h3>
                <p className="text-sm opacity-80">
                  {sensorStatus[sensor.topic] 
                    ? 'Data streaming normally' 
                    : 'No data received'}
                </p>
                <div className="mt-auto pt-4 flex justify-between items-center">
                  <span className="text-xs opacity-70">
                    Topic: {sensor.topic}
                  </span>
                  <div className="flex items-center gap-1">
                    {sensorStatus[sensor.topic] 
                      ? <IconPlugConnected className="h-4 w-4" /> 
                      : <IconPlugOff className="h-4 w-4" />}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ links }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className={`w-20 lg:w-64 bg-gray-900 h-screen p-4 flex flex-col justify-between border-r border-gray-800 transition-all duration-300 ${open ? 'shadow-xl' : ''}`}
      animate={{ width: open ? 300 : 80 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex flex-col space-y-2">
        {open ? <Logo /> : <LogoIcon />}
        <div className="border-t border-gray-800 my-4"></div>
        {links.map((link, idx) => (
          <SidebarLink key={idx} link={link} open={open} />
        ))}
      </div>
      <div className="pb-4">
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center">
              <IconUserBolt className="h-4 w-4" />
            </div>
            {open && (
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-xs">System Operator</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SidebarLink({ link, open }) {
  return (
    <Link
      href={link.href}
      className={`flex items-center p-3 rounded-lg transition-all duration-200 hover:bg-gray-800 group ${
        open ? "justify-start gap-3" : "justify-center"
      }`}
    >
      <div className="text-gray-400 group-hover:text-blue-400 transition-colors">
        {link.icon}
      </div>
      {open && (
        <span className="text-gray-300 group-hover:text-white transition-colors">
          {link.label}
        </span>
      )}
    </Link>
  );
}

const Logo = () => (
  <Link href="#" className="flex items-center gap-3 p-3">
    <div className="bg-gradient-to-br from-blue-600 to-emerald-500 p-2 rounded-lg">
      <IconRobot className="h-6 w-6 text-white" />
    </div>
    <div>
      <h2 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        AQUA Robotics
      </h2>
      <p className="text-xs text-gray-400">Control Dashboard</p>
    </div>
  </Link>
);

const LogoIcon = () => (
  <Link href="#" className="flex items-center justify-center p-3">
    <div className="bg-gradient-to-br from-blue-600 to-emerald-500 p-2 rounded-lg">
      <IconRobot className="h-6 w-6 text-white" />
    </div>
  </Link>
);