import { ReportHandler, getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

// Function to report web vitals metrics
const reportWebVitalsToGA = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Import all web vitals functions
    getCLS(onPerfEntry); // Cumulative Layout Shift
    getFID(onPerfEntry); // First Input Delay
    getLCP(onPerfEntry); // Largest Contentful Paint
    getFCP(onPerfEntry); // First Contentful Paint
    getTTFB(onPerfEntry); // Time to First Byte
  }
};

// Create a function to report web vitals to Google Analytics
export const reportWebVitals = () => {
  // Only run if we have GA measurement ID
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    reportWebVitalsToGA((metric) => {
      // Log to console in development
      if (import.meta.env.DEV) {
        console.log(`Web Vital: ${metric.name}`, metric);
      }
      
      // Report to GA
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), // CLS values are typically < 1
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
          metric_rating: metric.rating, // 'good', 'needs-improvement', or 'poor'
          non_interaction: true // Prevents this from affecting bounce rate
        });
      }
      
      // You can also send to a custom endpoint for performance monitoring
      sendToPerformanceAPI(metric);
    });
  }
};

// Send metrics to a custom API endpoint for more detailed tracking
const sendToPerformanceAPI = (metric) => {
  // This is a placeholder for a custom implementation
  // You could send to your own API, a third-party service, etc.
  if (import.meta.env.DEV) return; // Skip in development
  
  try {
    // Example custom endpoint
    // const endpoint = 'https://api.royaltransfer.eu/metrics';
    
    // const payload = {
    //   name: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    //   id: metric.id,
    //   path: window.location.pathname,
    //   timestamp: new Date().toISOString(),
    //   userAgent: navigator.userAgent,
    //   deviceType: getDeviceType(),
    //   connectionType: getConnectionType()
    // };
    
    // You could send this data using fetch:
    // fetch(endpoint, {
    //   method: 'POST',
    //   body: JSON.stringify(payload),
    //   headers: {
    //     'Content-Type': 'application/json'
    //   }
    // });
  } catch (error) {
    console.error('Error sending performance data:', error);
  }
};

// Helper function to determine device type
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Helper function to determine connection type
const getConnectionType = () => {
  // @ts-ignore: Connection API not in all browsers
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return connection ? connection.effectiveType : 'unknown';
};