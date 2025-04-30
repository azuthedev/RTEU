import { getCLS, getFID, getLCP, getFCP, getTTFB, Metric } from 'web-vitals';

type MetricName = 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB';

interface PerformanceMetrics {
  [key: string]: Metric;
}

// Store metrics for access throughout the app
let metrics: PerformanceMetrics = {};

// Callbacks for metric updates
const metricCallbacks: ((name: MetricName, value: number) => void)[] = [];

/**
 * Track and report Core Web Vitals to Google Analytics
 */
export const trackWebVitals = (): void => {
  const reportMetric = (metric: Metric): void => {
    // Store the metric
    metrics[metric.name] = metric;
    
    // Log in development
    if (import.meta.env.DEV) {
      console.log(`Web Vital: ${metric.name}`, metric);
    }
    
    // Report to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_name: metric.name,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
        non_interaction: true,
      });
    }
    
    // Invoke callbacks
    metricCallbacks.forEach(callback => {
      callback(metric.name as MetricName, metric.value);
    });
  };
  
  // Track all Core Web Vitals
  getCLS(reportMetric); // Cumulative Layout Shift
  getFID(reportMetric); // First Input Delay
  getLCP(reportMetric); // Largest Contentful Paint
  getFCP(reportMetric); // First Contentful Paint
  getTTFB(reportMetric); // Time to First Byte
};

/**
 * Track image loading performance
 * @param src Image source URL
 * @param loadTime Time taken to load the image in ms
 * @param success Whether the image loaded successfully
 */
export const trackImagePerformance = (
  src: string, 
  loadTime: number, 
  success: boolean
): void => {
  if (!window.gtag) return;
  
  try {
    // Extract domain for grouping
    const domain = new URL(src).hostname;
    
    window.gtag('event', success ? 'image_load_success' : 'image_load_failure', {
      event_category: 'Image Performance',
      event_label: domain,
      value: loadTime,
      image_url: src.substring(0, 100), // Truncate for privacy/size
      image_domain: domain,
      non_interaction: true
    });
  } catch (err) {
    // Ignore URL parsing errors
    console.error('Error tracking image performance:', err);
  }
};

/**
 * Track the First Contentful Paint (FCP) time for important content
 * @param startTime The time when the component began loading
 * @param componentName Name of the component for identification
 */
export const trackComponentFCP = (
  startTime: number,
  componentName: string
): void => {
  // Calculate time since component started loading
  const fcpTime = performance.now() - startTime;
  
  if (window.gtag) {
    window.gtag('event', 'component_fcp', {
      event_category: 'Component Performance',
      event_label: componentName,
      value: Math.round(fcpTime),
      component_name: componentName,
      non_interaction: true
    });
  }
};

/**
 * Subscribe to performance metric updates
 * @param callback Function to call when metrics are updated
 * @returns Unsubscribe function
 */
export const subscribeToMetrics = (
  callback: (name: MetricName, value: number) => void
): () => void => {
  metricCallbacks.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = metricCallbacks.indexOf(callback);
    if (index >= 0) {
      metricCallbacks.splice(index, 1);
    }
  };
};

/**
 * Get the current value of a performance metric
 * @param name Name of the metric
 * @returns The metric value or undefined if not available
 */
export const getMetric = (name: MetricName): number | undefined => {
  return metrics[name]?.value;
};

/**
 * Get all current performance metrics
 * @returns Object with all available metrics
 */
export const getAllMetrics = (): PerformanceMetrics => {
  return { ...metrics };
};

export default {
  trackWebVitals,
  trackImagePerformance,
  trackComponentFCP,
  subscribeToMetrics,
  getMetric,
  getAllMetrics
};