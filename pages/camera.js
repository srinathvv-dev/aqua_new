// pages/camera.js

import CameraFeed from '../components/CameraFeed'; // Import the CameraFeed component

export default function CameraPage() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold mb-10 text-center text-teal-300">
          Camera Feed
        </h1>
        <div className="w-full h-full">
          <CameraFeed />
        </div>
      </div>
    </div>
  );
}
