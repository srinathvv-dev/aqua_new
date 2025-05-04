// components/URASGLoader.js
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function URASGLoader({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0); // 0: connecting, 1: initializing, 2: complete
  const [particles, setParticles] = useState([]);
  const [showGlow, setShowGlow] = useState(false);

  // Status messages for each phase
  const statusMessages = [
    "Establishing acoustic comms link...",
    "Initializing sonar array...",
    "Calibrating depth sensors...",
    "Syncing navigation systems...",
    "Autonomous systems engaged"
  ];

  // Particle effect for background
  useEffect(() => {
    if (phase < 2) {
      const interval = setInterval(() => {
        setParticles(prev => [
          ...prev.slice(-50), // Keep max 50 particles
          {
            id: Date.now(),
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.3 + 0.1,
            duration: Math.random() * 3 + 2
          }
        ]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Main loading sequence
  useEffect(() => {
    const loadingInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (prev < 90 ? 2 : 0.5);
        
        // Update phases based on progress
        if (newProgress >= 20 && phase === 0) setPhase(1);
        if (newProgress >= 50 && phase === 1) setPhase(2);
        if (newProgress >= 80 && phase === 2) setPhase(3);
        if (newProgress >= 95) setShowGlow(true);
        
        if (newProgress >= 100) {
          clearInterval(loadingInterval);
          setPhase(4);
          setTimeout(() => onFinish?.(), 1200);
          return 100;
        }
        return newProgress;
      });
    }, 30);

    return () => clearInterval(loadingInterval);
  }, [onFinish, phase]);

  return (
    <div className="relative flex items-center justify-center h-screen w-full bg-gray-950 overflow-hidden">
      {/* Particle background */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-blue-400"
            initial={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity
            }}
            animate={{
              y: [0, -50],
              opacity: [particle.opacity, 0],
            }}
            transition={{
              duration: particle.duration,
              ease: "linear"
            }}
            onAnimationComplete={() => {
              setParticles(prev => prev.filter(p => p.id !== particle.id));
            }}
          />
        ))}
      </div>

      {/* Hexagonal grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48cGF0aCBkPSJNMzAgMEw2MCAxNS4zNXYyOS4zTDMwIDYwIDAgNDQuN3YtMjkuM0wzMCB6eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvc3ZnPg==')]"></div>
      </div>

      {/* Main loader container */}
      <motion.div 
        className="relative z-10 w-full max-w-lg px-8 py-12 sm:px-12 sm:py-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Glow effect when complete */}
        {showGlow && (
          <motion.div 
            className="absolute inset-0 rounded-2xl bg-blue-500/10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.3, 0],
              scale: [1, 1.05, 1.1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "loop"
            }}
          />
        )}

        {/* Outer border animation */}
        <motion.div 
          className="absolute inset-0 rounded-2xl border border-blue-400/30 pointer-events-none"
          animate={{
            borderColor: [
              'rgba(96, 165, 250, 0.3)',
              'rgba(96, 165, 250, 0.6)',
              'rgba(96, 165, 250, 0.3)'
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Inner container */}
        <div className="relative z-10">
          {/* Header with logo */}
          <div className="flex items-center gap-3 mb-8">
            <motion.div
              className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400"
              animate={{ 
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22V16H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V16H2V14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z" />
              </svg>
            </motion.div>
            <motion.h2 
              className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              U.R.A.S.G.
            </motion.h2>
          </div>

          {/* Progress bar with gradient */}
          <div className="relative h-2.5 bg-gray-800 rounded-full mb-8 overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            >
              {/* Progress bar shine effect */}
              <motion.div 
                className="absolute top-0 right-0 h-full w-8 bg-white opacity-30"
                animate={{ x: ['-100%', '150%'] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5
                }}
              />
            </motion.div>
          </div>

          {/* Status area */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="font-mono text-sm text-gray-300">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`status-${phase}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className={phase === 4 ? "text-green-400" : "text-blue-400"}
                  >
                    {statusMessages[phase]}
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.div
                className="font-mono text-sm font-medium bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
                animate={{ 
                  opacity: [0.8, 1, 0.8],
                  textShadow: ["0 0 8px rgba(96,165,250,0)", "0 0 8px rgba(96,165,250,0.3)", "0 0 8px rgba(96,165,250,0)"]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity 
                }}
              >
                {Math.round(progress)}%
              </motion.div>
            </div>

            {/* System diagnostics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {['Underwater Robotics', 'Sensor Status', 'Vehicle Control', 'Unified Dashboard'].map((system, i) => (
                <motion.div 
                  key={system}
                  className="flex items-center gap-2 text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: progress > i * 25 ? 1 : 0.3,
                    x: progress > i * 25 ? 0 : -5
                  }}
                  transition={{ delay: i * 0.1 }}
                >
                  <motion.div
                    animate={{
                      backgroundColor: progress > (i + 1) * 25 ? "#4ade80" : progress > i * 25 ? "#60a5fa" : "#6b7280"
                    }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                  <span>{system}</span>
                  {progress > (i + 1) * 25 && (
                    <motion.span 
                      className="text-green-400 ml-auto"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Scanning animation */}
          {phase < 4 && (
            <motion.div
              className="absolute left-0 right-0 -bottom-4 h-0.5 bg-gradient-to-r from-transparent via-blue-400/80 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                delay: 0.5
              }}
            />
          )}

        
        </div>
      </motion.div>
    </div>
  );
}