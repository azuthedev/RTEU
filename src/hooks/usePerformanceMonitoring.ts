import { useState, useEffect } from 'react';
import { subscribeToMetrics, getAllMetrics } from '../utils/performanceMonitoring';

type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';
type MetricData = Record<MetricName, number | undefined>;

interface PerformanceMonitoringResult {
  metrics: MetricData;
  isLoading: boolean;
  hasAllMetrics: boolean;
}

/**
 * Hook to access performance metrics in components
 */
const usePerformanceMonitoring = (): PerformanceMonitoringResult => {
  const [metrics, setMetrics] = useState<MetricData>({
    CLS: undefined,
    FID: undefined,
    LCP: undefined,
    FCP: undefined,
    TTFB: undefined
  });
  
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Initialize with any existing metrics
    const currentMetrics = getAllMetrics();
    const initialMetrics: MetricData = {
      CLS: currentMetrics.CLS?.value,
      FID: currentMetrics.FID?.value,
      LCP: currentMetrics.LCP?.value,
      FCP: currentMetrics.FCP?.value,
      TTFB: currentMetrics.TTFB?.value
    };
    
    setMetrics(initialMetrics);
    
    // Subscribe to new metric updates
    const unsubscribe = subscribeToMetrics((name, value) => {
      setMetrics(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Check if we have all metrics now
      setIsLoading(false);
    });
    
    // Check if we already have most metrics after the first render
    const hasMetrics = Object.values(initialMetrics).some(m => m !== undefined);
    if (hasMetrics) {
      setIsLoading(false);
    } else {
      // Set a timeout to stop showing loading state
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 10000); // If we don't have metrics after 10s, stop showing loading state
      
      return () => clearTimeout(timeout);
    }
    
    return unsubscribe;
  }, []);
  
  // Check if we have all core metrics
  const hasAllMetrics = 
    metrics.LCP !== undefined &&
    metrics.FID !== undefined &&
    metrics.CLS !== undefined;
  
  return { metrics, isLoading, hasAllMetrics };
};

export default usePerformanceMonitoring;