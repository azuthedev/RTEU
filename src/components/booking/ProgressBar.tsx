import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressBarProps {
  currentStep: 1 | 2 | 3;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Select Vehicle' },
    { number: 2, label: 'Personal Details' },
    { number: 3, label: 'Payment' }
  ];
  
  // Track animation state
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [initialWidth, setInitialWidth] = React.useState(getProgressPercentage(currentStep));
  const [animating, setAnimating] = React.useState(false);

  // Get progress percentage for each step
  function getProgressPercentage(step: number): number {
    switch (step) {
      case 1: return 17;
      case 2: return 50;
      case 3: return 84;
      default: return 5;
    }
  }

  // Update initial width when step changes to enable animation
  useEffect(() => {
    setAnimating(true);
    // Animation cleanup
    return () => setAnimating(false);
  }, [currentStep]);

  return (
    <div className="relative">
      {/* Progress Bar Track */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* Animated Progress Fill */}
        <motion.div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-gray-600 to-black relative"
          initial={{ width: `${initialWidth}%` }}
          animate={{ 
            width: `${getProgressPercentage(currentStep)}%` 
          }}
          transition={{
            type: 'spring',
            stiffness: 60,
            damping: 20,
            mass: 1,
            duration: 0.5
          }}
        >
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between mt-4">
        {steps.map((step) => {
          const isActive = step.number <= currentStep;
          const isCurrent = step.number === currentStep;
          
          return (
            <div
              key={step.number}
              className="flex flex-col items-center"
              style={{
                flex: '1 1 0%', // Equal width for all steps
                textAlign: 'center'
              }}
            >
              {/* Step Circle */}
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                  isActive ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
                }`}
                animate={{ 
                  scale: isCurrent ? [1, 1.1, 1] : 1,
                  boxShadow: isCurrent 
                    ? ['0 0 0 0 rgba(0, 0, 0, 0)', '0 0 0 10px rgba(0, 0, 0, 0.1)', '0 0 0 0 rgba(0, 0, 0, 0)']
                    : 'none'
                }}
                transition={{
                  duration: 2,
                  repeat: isCurrent ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                {step.number}
              </motion.div>
              
              {/* Step Label */}
              <div 
                className="text-sm font-medium text-gray-600"
                style={{
                  maxWidth: '120px',
                  margin: '0 auto'
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;