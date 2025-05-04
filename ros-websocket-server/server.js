// // Import necessary modules using CommonJS syntax
// const express = require('express'); // Express is used to handle HTTP requests and serve content.
// const { createServer } = require('http'); // HTTP is used to create the server that will handle WebSocket connections.
// const { Server, OPEN } = require('ws'); // WebSocket is used for real-time communication between the server and clients.
// const { Ros, Topic } = require('roslib'); // ROSLIB is used to interact with the ROS (Robot Operating System) bridge.

// /**
//  * @file main.js
//  * @brief This file sets up a WebSocket server that communicates with a ROS bridge and forwards messages to connected clients.
//  */

// /**
//  * @brief Initialize Express application and HTTP server.
//  */
// const app = express(); // Create an Express application instance.
// const server = createServer(app); // Create an HTTP server that supports WebSocket connections.
// const wss = new Server({ server }); // Create a WebSocket server.

// const ros = new Ros({
//   url: 'ws://localhost:9090' // The URL of the ROS bridge server.
// });

// /**
//  * @brief Event handler for successful connection to ROSbridge.
//  */
// ros.on('connection', () => {
//   console.log('Connected to ROSbridge'); // Log connection status.
// });

// /**
//  * @brief Event handler for errors occurring with the ROSbridge connection.
//  * @param {Error} error - The error that occurred.
//  */
// ros.on('error', (error) => {
//   console.log('Error connecting to ROSbridge:', error); // Log any connection errors.
// });

// /**
//  * @brief Event handler for when the connection to ROSbridge is closed.
//  */
// ros.on('close', () => {
//   console.log('Connection to ROSbridge closed'); // Log connection closure.
// });

// /**
//  * @brief Subscribes to a ROS topic and forwards messages to WebSocket clients.
//  * @param {string} topicName - The name of the ROS topic to subscribe to.
//  * @param {string} messageType - The type of message expected on the topic.
//  */
// function subscribeToTopic(topicName, messageType) {
//   const topic = new Topic({
//     ros: ros,
//     name: topicName,
//     messageType: messageType
//   });

//   topic.subscribe((message) => {
//     wss.clients.forEach(client => {
//       if (client.readyState === OPEN) {
//         client.send(JSON.stringify({ topic: topicName, data: message }));
//       }
//     });
//   });
// }

// // Define topics and create subscriptions
// subscribeToTopic('/ahrs', 'std_msgs/Float64MultiArray');
// subscribeToTopic('/an_device/Heading', 'std_msgs/Float32');
// subscribeToTopic('/depth_impact', 'std_msgs/Float64MultiArray');
// subscribeToTopic('/battery_voltage_1', 'std_msgs/Float64');
// subscribeToTopic('/battery_voltage_2', 'std_msgs/Float64');
// subscribeToTopic('/dvl/data', 'waterlinked_a50_ros_driver/DVL');
// subscribeToTopic('/leak_topic', 'std_msgs/String');
// subscribeToTopic('/rovl', 'std_msgs/String');

// /**
//  * @brief Sets up a route to handle GET requests to the root URL.
//  * @param {Object} req - The request object.
//  * @param {Object} res - The response object.
//  */
// app.get('/', (req, res) => {
//   res.send('ROS WebSocket server is running'); // Respond to the root URL.
// });

// /**
//  * @brief Starts the HTTP server on port 3001.
//  */
// server.listen(3001, () => {
//   console.log('WebSocket server is listening on port 3001'); // Log server startup.
// });

const express = require('express');
const { createServer } = require('http');
const { Server, OPEN } = require('ws');
const { Ros, Topic } = require('roslib');

const app = express();
const server = createServer(app);
const wss = new Server({ server });

// Enhanced ROS connection with retries
const ros = new Ros({
  url: 'ws://localhost:9090'
});

let reconnectInterval;

function connectToROS() {
  console.log('⌛ Attempting to connect to ROSbridge...');
  ros.connect('ws://localhost:9090');

  ros.on('connection', () => {
    console.log('✅ Successfully connected to ROSbridge');
    clearInterval(reconnectInterval);
    setupAllTopics();
  });

  ros.on('error', (error) => {
    console.error('❌ ROSbridge connection error:', error);
  });

  ros.on('close', () => {
    console.log('⚠️ ROSbridge connection closed');
    reconnectInterval = setInterval(connectToROS, 5000);
  });
}

function setupAllTopics() {
  console.log('📡 Setting up all ROS topics...');
  
  // Define all topics with their message types
  const topics = [
    { name: '/ahrs', type: 'std_msgs/Float64MultiArray' },
    { name: '/an_device/Heading', type: 'std_msgs/Float32' },
    { name: '/depth_impact', type: 'std_msgs/Float64MultiArray' },
    { name: '/battery_voltage_1', type: 'std_msgs/Float64' },
    { name: '/battery_voltage_2', type: 'std_msgs/Float64' },
    { name: '/dvl/data', type: 'waterlinked_a50_ros_driver/DVL' },
    { name: '/leak_topic', type: 'std_msgs/String' },
    { name: '/rovl', type: 'std_msgs/String' }
  ];

  topics.forEach(({name, type}) => {
    try {
      const topic = new Topic({
        ros: ros,
        name: name,
        messageType: type
      });

      topic.subscribe((message) => {
        console.log(`📡 Received ${name} message`);
        wss.clients.forEach(client => {
          if (client.readyState === OPEN) {
            client.send(JSON.stringify({
              topic: name,
              data: message,
              timestamp: new Date().toISOString()
            }));
          }
        });
      });

      topic.on('error', (err) => {
        console.error(`❌ ${name} Topic error:`, err);
      });
    } catch (err) {
      console.error(`🚨 Failed to subscribe to ${name}:`, err);
    }
  });
}

// WebSocket server setup
wss.on('connection', (ws) => {
  console.log('🌐 New client connected');
  
  ws.on('message', (message) => {
    console.log('Received message from client:', message);
  });

  ws.on('close', () => {
    console.log('🌐 Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('🌐 WebSocket error:', err);
  });
});

// Start server
server.listen(3001, () => {
  console.log('🚀 WebSocket server listening on port 3001');
  connectToROS();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  wss.clients.forEach(client => client.close());
  wss.close();
  ros.close();
  server.close(() => {
    process.exit(0);
  });
});