/**
 * Creates a WebSocket connection to a ROS server and subscribes to a specified topic.
 * 
 * @param {string} topic - The topic to subscribe to. This is the ROS topic from which you want to receive messages.
 * @param {function} onMessage - Callback function to handle incoming messages. This function will be called when a message on the specified topic is received.
 * @returns {WebSocket|null} - Returns the WebSocket instance if successful, otherwise null. This allows you to interact with the WebSocket connection.
 */
export const createRosWebSocket = (topic, onMessage) => {
  /**
   * Checks if the onMessage parameter is a function.
   * Logs an error and returns null if it is not a function.
   * This ensures that the callback function provided for handling messages is valid.
   * 
   * @throws {Error} If onMessage is not a function. This prevents runtime errors by validating the input.
   */
  if (typeof onMessage !== 'function') {
    console.error('onMessage is not a function'); // Log an error if onMessage is not a function to help with debugging.
    return null; // Return null to indicate that the WebSocket connection cannot be created without a valid callback function.
  }

  /**
   * Creates a new WebSocket instance and connects to the specified server.
   * This establishes the WebSocket connection that will be used to communicate with the ROS server.
   * 
   * @type {WebSocket}
   */
  const ws = new WebSocket('ws://localhost:3001'); // Connect to the WebSocket server running at the specified URL.

  /**
   * Handles the event when the WebSocket connection is successfully opened.
   * Logs a message and sends a subscription request to the server for the specified topic.
   * This is where you inform the server that you want to receive messages on the given topic.
   */
  ws.onopen = () => {
    console.log('WebSocket connection established'); // Log the successful connection for debugging and informational purposes.
    ws.send(JSON.stringify({ subscribe: topic })); // Send a subscription request to the server in JSON format to start receiving messages for the specified topic.
  };

  /**
   * Handles incoming messages from the WebSocket.
   * Logs the raw message, parses it, and logs the parsed message.
   * Calls the onMessage callback if the message topic matches the specified topic.
   * Logs a warning if the message topic does not match.
   * Catches and logs any errors that occur during parsing.
   * 
   * @param {MessageEvent} event - The WebSocket message event containing data received from the server.
   */
  ws.onmessage = (event) => {
    console.log('Raw WebSocket message:', event.data); // Log the raw message data for debugging and inspection.

    try {
      const message = JSON.parse(event.data); // Attempt to parse the message data from JSON format.
      console.log('Parsed WebSocket message:', message); // Log the parsed message to verify its contents.

      if (message.topic === topic) { // Check if the message topic matches the specified topic.
        onMessage(message.data); // Call the onMessage callback function with the message data if the topics match.
      } else {
        console.warn('Message topic does not match:', message.topic); // Log a warning if the message topic does not match the expected topic.
      }
    } catch (error) {
      console.error('Error parsing message:', error); // Catch and log any errors that occur during JSON parsing.
    }
  };

  /**
   * Handles errors that occur with the WebSocket connection.
   * Logs the error.
   * 
   * @param {Event} error - The WebSocket error event containing details of the error.
   */
  ws.onerror = (error) => {
    console.error('WebSocket error:', error); // Log any errors that occur with the WebSocket connection for troubleshooting.
  };

  /**
   * Handles the event when the WebSocket connection is closed.
   * Logs a message indicating that the connection has been closed.
   * This helps to keep track of the WebSocket lifecycle.
   */
  ws.onclose = () => {
    console.log('WebSocket connection closed'); // Log the closure of the WebSocket connection to monitor its lifecycle.
  };

  /**
   * Returns the WebSocket instance.
   * 
   * @returns {WebSocket} The WebSocket instance. This allows the caller to interact with the WebSocket connection if needed.
   */
  return ws;
};
