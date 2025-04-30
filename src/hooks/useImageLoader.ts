import { useState, useEffect, useCallback, useRef } from 'react';
import { getFallbackImageUrl } from '../utils/imageFallbacks';

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
type RetryStrategy = 'sequential' | 'fallback-only';

interface UseImageLoaderOptions {
  src: string;
  fallbackSrc?: string;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
  retryStrategy?: RetryStrategy;
}

interface UseImageLoaderResult {
  src: string;
  status: LoadStatus;
  error: Error | null;
  isLoaded: boolean;
  retry: () => void;
}

/**
 * Custom hook for handling image loading with error handling and retries
 */
const useImageLoader = ({
  src,
  fallbackSrc,
  retryCount = 2,
  retryDelay = 1000,
  timeout = 15000,
  retryStrategy = 'sequential'
}: UseImageLoaderOptions): UseImageLoaderResult => {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const attemptedSources = useRef<Set<string>>(new Set());
  const currentAttempt = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  // Get a fallback URL either explicitly provided or from mapping
  const getFallback = useCallback((): string => {
    if (fallbackSrc) return fallbackSrc;
    
    const mappedFallback = getFallbackImageUrl(src);
    return mappedFallback !== src ? mappedFallback : src;
  }, [src, fallbackSrc]);

  // Clear any existing timeout
  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Set up a new timeout
  const setupLoadTimeout = useCallback(() => {
    clearLoadTimeout();
    
    timeoutRef.current = window.setTimeout(() => {
      if (status === 'loading') {
        setStatus('error');
        setError(new Error(`Image load timed out after ${timeout}ms`));
        
        // Try fallback or next attempt
        if (currentAttempt.current < retryCount) {
          retry();
        }
      }
    }, timeout);
  }, [status, timeout, retryCount, clearLoadTimeout]);

  // Retry loading with next source
  const retry = useCallback(() => {
    clearLoadTimeout();
    currentAttempt.current += 1;
    
    if (currentAttempt.current <= retryCount) {
      // Choose the next source based on strategy
      let nextSrc: string;
      
      if (retryStrategy === 'fallback-only') {
        // Only try fallback after original source
        nextSrc = currentAttempt.current === 1 ? getFallback() : `${src}?cb=${Date.now()}`;
      } else {
        // Sequential strategy:
        // 1st retry: Add cache buster
        // 2nd retry: Try fallback
        // Additional: Fallback with cache buster
        if (currentAttempt.current === 1) {
          nextSrc = `${src}?cb=${Date.now()}`;
        } else if (currentAttempt.current === 2) {
          nextSrc = getFallback();
        } else {
          nextSrc = `${getFallback()}?cb=${Date.now()}`;
        }
      }
      
      // Skip if we've already tried this source
      if (attemptedSources.current.has(nextSrc)) {
        currentAttempt.current += 1;
        retry();
        return;
      }
      
      // Record this attempt
      attemptedSources.current.add(nextSrc);
      
      // Delay before trying the next source
      setTimeout(() => {
        setCurrentSrc(nextSrc);
        setStatus('loading');
        setError(null);
        setupLoadTimeout();
      }, retryDelay * Math.min(currentAttempt.current, 3));
    }
  }, [src, getFallback, retryCount, retryDelay, retryStrategy, clearLoadTimeout, setupLoadTimeout]);

  // Load the image
  useEffect(() => {
    if (!src) {
      setStatus('error');
      setError(new Error('No source provided'));
      return;
    }

    // Reset state when src changes
    if (src !== currentSrc && status !== 'idle') {
      setCurrentSrc(src);
      setStatus('idle');
      setError(null);
      currentAttempt.current = 0;
      attemptedSources.current.clear();
    }

    if (status === 'idle') {
      setStatus('loading');
      attemptedSources.current.add(src);
      setupLoadTimeout();
      
      const img = new Image();
      
      img.onload = () => {
        clearLoadTimeout();
        setStatus('loaded');
      };
      
      img.onerror = () => {
        clearLoadTimeout();
        
        if (currentAttempt.current < retryCount) {
          retry();
        } else {
          setStatus('error');
          setError(new Error('Failed to load image after retries'));
        }
      };
      
      img.src = currentSrc;
    }

    return () => {
      clearLoadTimeout();
    };
  }, [src, currentSrc, status, retryCount, clearLoadTimeout, setupLoadTimeout, retry]);

  return {
    src: currentSrc,
    status,
    error,
    isLoaded: status === 'loaded',
    retry
  };
};

export default useImageLoader;