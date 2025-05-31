import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const loadingMessages = [
  "Mapping optimal routes...",
  "Analyzing traffic conditions...",
  "Calculating distance and duration...",
  "Sourcing available premium vehicles...",
  "Matching you with the most efficient transfer...",
  "Securing the best real-time rate...",
  "Finalizing your tailored quote..."
];

interface LoadingAnimationProps {
  className?: string;
  loadingComplete?: boolean; // New prop to signal when actual loading is done
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  className = '',
  loadingComplete = false
}) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing intervals
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);

    if (loadingComplete) {
      // If loading is complete, immediately set progress to 100%
      setProgress(100);
      setMessageIndex(loadingMessages.length); // Set to a "final" message index
      return;
    }

    const initialFastPhaseDuration = 800; // 0.8 seconds to reach 75%
    const slowIncrementInterval = 100; // How often to increment progress in slow phase

    // Start progress to 75%
    const startProgress = () => {
      setProgress(0); // Reset for new animation
      setTimeout(() => {
        if (!loadingComplete) { // Only set to 75% if not already complete
          setProgress(75);
        }
      }, 50); // Small delay to ensure initial render before animation starts

      // Start slow increment towards 99% after the initial fast phase
      intervalRef.current = setInterval(() => {
        if (!loadingComplete && progress < 99) {
          setProgress(prev => Math.min(prev + 0.5, 99)); // Increment slowly up to 99%
        }
      }, slowIncrementInterval);
    };

    startProgress(); // Start the animation when component mounts or loadingComplete changes to false

    // Message cycling
    messageIntervalRef.current = setInterval(() => {
      if (!loadingComplete) {
        setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
      }
    }, 1500); // Change message every 1.5 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, [loadingComplete, progress]); // Re-run when loadingComplete changes

  const currentMessage = loadingComplete
    ? "All set! Redirecting..."
    : loadingMessages[messageIndex];

  return (
    <div className={`text-center ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" aria-hidden="true" />

        <div className="h-20 flex items-center justify-center">
          <motion.div
            key={currentMessage} // Key on message to trigger re-animation
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-lg text-gray-700"
          >
            {currentMessage}
          </motion.div>
        </div>

        <div className="w-full max-w-md h-2 bg-gray-200 rounded-full mt-2">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: loadingComplete ? 0.3 : (progress < 75 ? 0.8 : 0.1),
              ease: loadingComplete ? "easeOut" : (progress < 75 ? "easeOut" : "linear")
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;