/**
 * @file components/CameraFeed.js
 * @brief CameraFeed component to display the live camera feed from ROS.
 *
 * This component establishes a connection to a ROS server, subscribes to a camera feed topic,
 * and displays the received images on a canvas.
 */

import React, { useEffect, useRef } from 'react';
import ROSLIB from 'roslib';

/**
 * @class CameraFeed
 * @brief React component to display the live camera feed from ROS.
 *
 * @returns {JSX.Element} The rendered component with a canvas for video feed.
 */
const CameraFeed = () => {
  /**
   * @var canvasRef
   * @brief Reference to the canvas element for rendering the video feed.
   */
  const canvasRef = useRef(null);

  /**
   * @var rosRef
   * @brief Reference to the ROS connection instance.
   */
  const rosRef = useRef(null);

  /**
   * @fn useEffect
   * @brief Initializes the ROS connection and subscribes to the camera feed topic.
   */
  useEffect(() => {
    // Initialize ROS connection
    rosRef.current = new ROSLIB.Ros({
      /**
       * @var url
       * @brief URL of the ROS server (replace with your rosbridge WebSocket URL).
       */
      url: 'ws://localhost:9090',
    });

    /**
     * @var imageListener
     * @brief ROS topic listener for the camera feed.
     */
    const imageListener = new ROSLIB.Topic({
      /**
       * @var ros
       * @brief Reference to the ROS connection instance.
       */
      ros: rosRef.current,
      /**
       * @var name
       * @brief Name of the camera feed topic (replace with your camera feed topic).
       */
      name: '/camera_feed',
      /**
       * @var messageType
       * @brief Message type of the camera feed topic.
       */
      messageType: 'sensor_msgs/CompressedImage',
    });

    /**
     * @fn imageListener.subscribe
     * @brief Draws the received image to the canvas.
     *
     * @param message
     * @brief ROS message containing the compressed image data.
     */
    imageListener.subscribe((message) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.src = `data:image/jpeg;base64,${message.data}`;
      image.onload = () => {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
    });

    /**
     * @fn return
     * @brief Unsubscribes from the topic and closes the ROS connection when the component unmounts.
     */
    return () => {
      imageListener.unsubscribe();
      rosRef.current.close();
    };
  }, []);

  return (
    <div className="w-full h-full">
      <canvas
        /**
         * @var ref
         * @brief Reference to the canvas element.
         */
        ref={canvasRef}
        /**
         * @var width
         * @brief Width of the canvas (in pixels).
         */
        width="640"
        /**
         * @var height
         * @brief Height of the canvas (in pixels).
         */
        height="480"
        className="w-full h-full"
      />
    </div>
  );
};

export default CameraFeed;