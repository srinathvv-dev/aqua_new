const express = require('express');
const { createServer } = require('http');
const { Server } = require('ws');
const { Ros, Topic } = require('roslib');

const app = express();
const server = createServer(app);
const wss = new Server({ server });

const ros = new Ros({ url: 'ws://localhost:9090' });

// Topic configuration
const TOPICS = [
  {
    name: '/ahrs',
    type: 'std_msgs/Float64MultiArray'
  },
  {
    name: '/an_device/Heading',
    type: 'std_msgs/Float32'
  },
  {
    name: '/depth_impact',
    type: 'std_msgs/Float64MultiArray'
  },
  {
    name: '/battery_voltage',
    type: 'std_msgs/Float64MultiArray',
    transform: (msg) => ({
      battery1: msg.data[0],
      battery2: msg.data[1],
      timestamp: Date.now()
    })
  },
  {
    name: '/battery_voltage_2',
    type: 'std_msgs/Float64'
  },
  {
    name: '/dvl/data',
    type: 'waterlinked_a50_ros_driver/DVL'
  },
  {
    name: '/leak_topic',
    type: 'std_msgs/String'
  },
  {
    name: '/rovl',
    type: 'std_msgs/String'
  }
];

// ROS connection handling
ros.on('connection', () => {
  console.log('Connected to ROSBridge');
});

ros.on('error', (error) => {
  console.error('ROS Error:', error);
});

ros.on('close', () => {
  console.log('ROS Connection closed - Reconnecting...');
  setTimeout(() => ros.connect('ws://localhost:9090'), 5000);
});

// WebSocket server
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    timestamp: Date.now()
  }));

  // Setup all topic subscriptions
  TOPICS.forEach(topicConfig => {
    try {
      const topic = new Topic({
        ros: ros,
        name: topicConfig.name,
        messageType: topicConfig.type
      });

      const subscription = topic.subscribe((message) => {
        if (ws.readyState === ws.OPEN) {
          const payload = {
            type: 'topic',
            topic: topicConfig.name,
            data: topicConfig.transform ? topicConfig.transform(message) : message,
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(payload));
        }
      });

      ws.on('close', () => {
        topic.unsubscribe(subscription);
      });

    } catch (err) {
      console.error(`Failed to subscribe to ${topicConfig.name}:`, err);
    }
  });
});

// Start server
server.listen(3001, () => {
  console.log('WebSocket server listening on port 3001');
  ros.connect('ws://localhost:9090');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    ros.close();
    process.exit(0);
  });
});