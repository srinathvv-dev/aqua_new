// components/JarvisLoader.js
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function JarvisLoader({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [showText, setShowText] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    // Loading progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowText(true);
          setTimeout(() => {
            setShowComplete(true);
            setTimeout(() => onFinish?.(), 800);
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 p-4">
      {/* Animated border */}
      <motion.div 
        className="relative w-full max-w-md border border-blue-400/30 rounded-lg p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-700 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </div>

        {/* Loading text */}
        <div className="flex items-center justify-between">
          <div className="font-mono text-sm text-gray-400">
            {!showComplete ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {showText ? (
                  <span className="text-blue-400">Initializing systems...</span>
                ) : (
                  <span>Connecting...</span>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-green-400"
              >
                Systems online
              </motion.div>
            )}
          </div>

          <motion.div
            className="font-mono text-xs text-blue-400"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {progress}%
          </motion.div>
        </div>

        {/* Scanning animation */}
        {showText && !showComplete && (
          <motion.div
            className="absolute -bottom-px left-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, delay: 0.2 }}
          />
        )}

        {/* Completion pulse */}
        {showComplete && (
          <motion.div
            className="absolute inset-0 border border-blue-400 rounded-lg pointer-events-none"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </motion.div>

      {/* Subtle dot grid background */}
      <div className="fixed inset-0 bg-dot-white/[0.03] pointer-events-none" />
    </div>
  );
}