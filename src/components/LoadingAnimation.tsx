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
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    // Clear any existing intervals when component mounts or unmounts
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, []);

  // Handle progress updates
  useEffect(() => {
    // Clear any existing progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (loadingComplete) {
      // If loading is complete, immediately set progress to 100%
      setProgress(100);
      return;
    }

    // Start with 0% progress
    setProgress(0);

    // Schedule progress increments - 15% every 0.5 seconds until 85%
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const nextProgress = prev + 15;
        if (nextProgress >= 85) {
          // Stop at 85%, the rest will fill when loading is complete
          clearInterval(progressIntervalRef.current!);
          return 85;
        }
        return nextProgress;
      });
    }, 500);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [loadingComplete]);

  // Handle message cycling
  useEffect(() => {
    // Clear any existing message interval
    if (messageIntervalRef.current) {
      clearInterval(messageIntervalRef.current);
    }

    if (loadingComplete) {
      // Set to the "complete" message
      setMessageIndex(loadingMessages.length);
      return;
    }

    // Cycle through messages every 1.5 seconds
    messageIntervalRef.current = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 1500);

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [loadingComplete]);

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
              type: "tween",
              duration: loadingComplete ? 0.3 : 0.5,
              ease: "easeOut"
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;