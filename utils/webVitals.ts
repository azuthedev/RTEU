import { ReportHandler, getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';
import { trackEvent } from './optimizeAnalytics';

/**
 * Report web vitals metrics to Google Analytics
 */
export const reportWebVitals = (): void => {
  // Only run if we have GA measurement ID
  if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
  
  // Metrics handler function
  const sendToAnalytics = ({ name, delta, id, value }: { 
    name: string; 
    delta: number; 
    id: string; 
    value: number;
  }) => {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`Web Vital: ${name}`, { id, value, delta });
    }
    
    // Report to GA
    trackEvent(
      'Web Vitals',
      name,
      id,
      // CLS values are typically < 1, so we multiply by 1000 for better precision
      name === 'CLS' ? Math.round(value * 1000) : Math.round(value),
      true // Non-interaction event
    );
  };
  
  // Register all web vitals
  getCLS(sendToAnalytics); // Cumulative Layout Shift
  getFID(sendToAnalytics); // First Input Delay
  getLCP(sendToAnalytics); // Largest Contentful Paint
  getFCP(sendToAnalytics); // First Contentful Paint
  getTTFB(sendToAnalytics); // Time To First Byte
};