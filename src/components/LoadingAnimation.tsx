import React, { useState, useEffect, useRef } from 'react';
import { Loader2, XCircle, AlertTriangle, XSquare, Clock, MapPin, MapPinOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface LoadingAnimationProps {
  className?: string;
  loadingComplete?: boolean;
  onCancel?: () => void;
  onTryDifferentRoute?: () => void;
  error?: string | null;
  startTime?: number;
  isSlowConnection?: boolean;
  geocodingErrorField?: 'pickup' | 'dropoff' | null;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  className = '',
  loadingComplete = false,
  onCancel,
  onTryDifferentRoute,
  error = null,
  startTime = Date.now(),
  isSlowConnection = false,
  geocodingErrorField = null
}) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [networkQuality, setNetworkQuality] = useState('good');
  const { t } = useLanguage();

  // Translated loading messages
  const loadingMessages = [
    t('loading.mapping_routes', 'Mapping optimal routes...'),
    t('loading.analyzing_traffic', 'Analyzing traffic conditions...'),
    t('loading.calculating_distance', 'Calculating distance and duration...'),
    t('loading.sourcing_vehicles', 'Sourcing available premium vehicles...'),
    t('loading.matching_transfer', 'Matching you with the most efficient transfer...'),
    t('loading.securing_rate', 'Securing the best real-time rate...'),
    t('loading.finalizing_quote', 'Finalizing your tailored quote...')
  ];

  // Refs for cleanup
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Ref for focus management
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const tryDifferentRouteButtonRef = useRef<HTMLButtonElement | null>(null);

  // Clean up all intervals and timeouts when unmounting
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
    };
  }, []);

  // Handle elapsed time tracking
  useEffect(() => {
    if (loadingComplete || error) return;

    // Update elapsed time every second
    timerIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
      
      // After 5 seconds, provide an estimate of time remaining
      if (elapsed > 5 && progress > 0) {
        // Simple estimate: if progress% took elapsed seconds, 
        // then (100-progress)% will take (elapsed * (100-progress) / progress) seconds
        const estimatedTotal = elapsed * 100 / progress;
        const remaining = Math.max(1, Math.ceil(estimatedTotal - elapsed));
        setEstimatedTimeRemaining(remaining);
      }
      
      // Assess network quality based on elapsed time
      if (elapsed > 10 && progress < 50) {
        setNetworkQuality('poor');
      } else if (elapsed > 5 && progress < 50) {
        setNetworkQuality('fair');
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [loadingComplete, error, startTime, progress]);

  // Handle progress updates
  useEffect(() => {
    // Clear any existing progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (loadingComplete || error || geocodingErrorField) {
      // If loading is complete or error occurred, immediately set progress to 100%
      setProgress(100);
      return;
    }

    // Start with 0% progress
    setProgress(0);

    // Calculate dynamic interval based on connection speed
    const interval = isSlowConnection ? 800 : 500;

    // Schedule progress increments - more conservative 10% every interval until 85%
    progressIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setProgress(prev => {
        // Slow down progress as we get closer to 85%
        const increment = prev < 30 ? 10 : prev < 60 ? 8 : 5;
        const nextProgress = prev + increment;
        
        if (nextProgress >= 85) {
          // Stop at 85%, the rest will fill when loading is complete
          clearInterval(progressIntervalRef.current!);
          return 85;
        }
        return nextProgress;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [loadingComplete, error, isSlowConnection, geocodingErrorField]);

  // Handle message cycling
  useEffect(() => {
    // Clear any existing message interval
    if (messageIntervalRef.current) {
      clearInterval(messageIntervalRef.current);
    }

    if (loadingComplete || error || geocodingErrorField) {
      // Set to the "complete" message
      setMessageIndex(loadingMessages.length);
      return;
    }

    // Cycle through messages every 1.5 seconds
    messageIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 1500);

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [loadingComplete, error, loadingMessages.length, geocodingErrorField]);

  // Show cancel button after 10 seconds
  useEffect(() => {
    if (loadingComplete || error || geocodingErrorField) return;
    
    cancelTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setShowCancelButton(true);
      
      // Set focus on cancel button when it appears
      setTimeout(() => {
        if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 100);
    }, 10000);

    return () => {
      if (cancelTimeoutRef.current) clearTimeout(cancelTimeoutRef.current);
    };
  }, [loadingComplete, error, geocodingErrorField]);

  // Keyboard trap for accessibility - keep focus inside modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle escape key to cancel
      if (event.key === 'Escape' && onCancel) {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  // Determine what message to show
  let currentMessage = "";
  let statusIcon = <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" aria-hidden="true" />;

  if (error) {
    currentMessage = `${t('loading.error', 'Error')}: ${error}`;
    statusIcon = <XCircle className="w-12 h-12 text-red-600 mb-6" aria-hidden="true" />;
  } else if (geocodingErrorField) {
    // Show geocoding-specific error message
    currentMessage = geocodingErrorField === 'pickup'
      ? t('loading.geocoding_error_pickup', "Could not locate your pickup address. Please try a different address.")
      : t('loading.geocoding_error_dropoff', "Could not locate your dropoff address. Please try a different address.");
    statusIcon = <MapPinOff className="w-12 h-12 text-amber-600 mb-6" aria-hidden="true" />;
  } else if (loadingComplete) {
    currentMessage = t('loading.complete', "All set! Redirecting...");
    statusIcon = <CheckCircle className="w-12 h-12 text-green-600 mb-6" aria-hidden="true" />;
  } else {
    currentMessage = loadingMessages[messageIndex];
  }

  return (
    <div className={`text-center ${className}`} role="dialog" aria-live="polite" aria-modal="true">
      <div className="flex flex-col items-center justify-center">
        {statusIcon}

        <div className="min-h-20 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-lg text-gray-700"
              aria-live="polite"
            >
              {currentMessage}
            </motion.div>
          </AnimatePresence>

          {/* Show elapsed time for slow connections */}
          {!loadingComplete && !error && elapsedTime > 5 && (
            <div 
              className="text-xs text-gray-500 mt-2 flex items-center" 
              aria-live="polite"
            >
              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
              <span>
                {t('loading.elapsed', '{{time}}s elapsed', { time: elapsedTime })}
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                  <span> • {t('loading.remaining', '~{{time}}s remaining', { time: estimatedTimeRemaining })}</span>
                )}
              </span>
            </div>
          )}
          
          {/* Connection speed warning */}
          {isSlowConnection && !loadingComplete && !error && (
            <div className="flex items-center text-xs text-amber-700 mt-2">
              <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
              <span>{t('loading.slow_connection', 'Slow connection detected')}</span>
            </div>
          )}
          
          {/* Network quality indicator for long-running requests */}
          {networkQuality !== 'good' && elapsedTime > 5 && !loadingComplete && !error && (
            <div className={`flex items-center text-xs mt-1 ${
              networkQuality === 'poor' ? 'text-red-600' : 'text-amber-600'
            }`}>
              <span>{t('loading.network_quality', 'Network quality: {{quality}}', { quality: t(`loading.${networkQuality}`, networkQuality) })}</span>
            </div>
          )}
        </div>

        <div className="w-full max-w-md h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: "0%" }}
            animate={{ 
              width: `${progress}%`,
              backgroundColor: error || geocodingErrorField ? "#ef4444" : "#2563eb" 
            }}
            transition={{
              type: "tween",
              duration: loadingComplete || error || geocodingErrorField ? 0.3 : 0.5,
              ease: "easeOut"
            }}
          />
        </div>

        {/* Show cancel and other action buttons */}
        <AnimatePresence>
          {/* Show different buttons based on state */}
          <div className="mt-6 space-y-3">
            {/* Try Different Route button for geocoding errors */}
            {geocodingErrorField && onTryDifferentRoute && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <button
                  ref={tryDifferentRouteButtonRef}
                  onClick={onTryDifferentRoute}
                  className="px-4 py-2 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 transition-colors flex items-center justify-center mx-auto"
                  aria-label={t('loading.try_different_address', 'Enter a different address')}
                >
                  <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t('loading.try_different_address_button', 'Try Different Address')}
                </button>
              </motion.div>
            )}
            
            {/* Cancel button */}
            {(showCancelButton || error || geocodingErrorField) && onCancel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <button
                  ref={cancelButtonRef}
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center mx-auto"
                  aria-label={t('loading.cancel_loading', 'Cancel loading process')}
                >
                  <XSquare className="w-4 h-4 mr-1" aria-hidden="true" />
                  {error || geocodingErrorField ? t('loading.go_back', 'Go Back') : t('common.cancel', 'Cancel')}
                </button>
              </motion.div>
            )}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoadingAnimation;