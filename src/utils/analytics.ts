import { ReportHandler } from 'web-vitals';

interface AnalyticsOptions {
  measurementId: string;
  debug?: boolean;
  delayLoad?: boolean;
  anonymizeIp?: boolean;
  sendPageView?: boolean;
}

/**
 * Optimized analytics initialization and tracking
 */
export const initAnalytics = (options: AnalyticsOptions): void => {
  const {
    measurementId,
    debug = false,
    delayLoad = true,
    anonymizeIp = true,
    sendPageView = false
  } = options;
  
  if (!measurementId) {
    console.warn('Google Analytics Measurement ID is missing');
    return;
  }
  
  // Set up dataLayer and gtag function
  window.dataLayer = window.dataLayer || [];
  const gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag = gtag;
  
  // Initialize gtag
  gtag('js', new Date());
  
  // Configure with minimal settings
  gtag('config', measurementId, {
    send_page_view: sendPageView,
    anonymize_ip: anonymizeIp,
    transport_type: 'beacon',
    debug_mode: debug
  });
  
  // Load script with delay
  const loadScript = () => {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);
  };
  
  if (delayLoad) {
    // Load after DOM content loaded + delay
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(loadScript, 3000);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(loadScript, 3000);
      });
    }
  } else {
    // Load immediately
    loadScript();
  }
};

/**
 * Track web vitals and performance metrics
 */
export const trackPerformanceMetrics = (): void => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  // Import web-vitals dynamically
  import('web-vitals').then(({ getCLS, getFID, getLCP, getFCP, getTTFB }) => {
    // Helper function to send metric to GA
    const sendToGA = (metric: any) => {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        non_interaction: true
      });
    };

    getCLS(sendToGA);
    getFID(sendToGA);
    getLCP(sendToGA);
    getFCP(sendToGA);
    getTTFB(sendToGA);
  });
};

// Declare global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}