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

// Import necessary modules using CommonJS syntax
const express = require('express'); // Express is used to handle HTTP requests and serve content.
const { createServer } = require('http'); // HTTP is used to create the server that will handle WebSocket connections.
const { Server, OPEN } = require('ws'); // WebSocket is used for real-time communication between the server and clients.
const { Ros, Topic } = require('roslib'); // ROSLIB is used to interact with the ROS (Robot Operating System) bridge.

const app = express(); // Create an Express application instance.
const server = createServer(app); // Create an HTTP server that supports WebSocket connections.
const wss = new Server({ server }); // Create a WebSocket server.

const ros = new Ros({
  url: 'ws://localhost:9090' // The URL of the ROS bridge server.
});

// Debugging: Log connection events for ROS bridge
ros.on('connection', () => {
  console.log('✅ Connected to ROSBridge WebSocket');
});

ros.on('error', (error) => {
  console.error('❌ Error connecting to ROSBridge:', error); // Log any connection errors.
});

ros.on('close', () => {
  console.log('⚠️ Connection to ROSBridge closed'); // Log connection closure.
});

// Function to handle WebSocket clients and broadcast messages
wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  
  // Send a message to the client confirming the connection
  ws.send(JSON.stringify({ message: 'Connected to WebSocket server' }));

  // Setup ROS topics for the connected WebSocket client
  setupAllTopics(ws);
});

// Function to setup subscriptions to ROS topics
function setupAllTopics(ws) {
  // Verify ROS connection
  if (!ros || !ros.isConnected) {
    console.warn('⚠️ Cannot setup topics: ROS is not connected');
    return;
  }

  console.log('📡 Setting up ROS topic subscriptions...');

  // Define the list of topics to subscribe to
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

  // Loop through each topic and subscribe
  topics.forEach(({ name, type }) => {
    try {
      const topic = new Topic({
        ros: ros,
        name: name,
        messageType: type
      });

      // Debugging: Log each subscription attempt
      console.log(`⏳ Subscribing to ROS topic: ${name}`);

      topic.subscribe((message) => {
        // Log the received message for debugging
        console.log(`📡 Data received on ${name}:`, message);

        // Send the received message to the WebSocket client
        if (ws.readyState === OPEN) {
          ws.send(JSON.stringify({ topic: name, data: message }));
          console.log(`✅ Data sent to WebSocket client for ${name}`);
        } else {
          console.warn(`⚠️ WebSocket client not ready for ${name}`);
        }
      });

      // Error handling for topic subscription
      topic.on('error', (err) => {
        console.error(`❌ Error subscribing to topic ${name}:`, err);
      });

    } catch (err) {
      console.error(`🚨 Failed to subscribe to ${name}:`, err);
    }
  });
}

// Serve a basic webpage for testing purposes (optional)
app.get('/', (req, res) => {
  res.send('ROS WebSocket server is running. Open the WebSocket client to get data.');
});

// Start the WebSocket server on port 3001
server.listen(3001, () => {
  console.log('🟢 WebSocket server is listening on port 3001');
});
