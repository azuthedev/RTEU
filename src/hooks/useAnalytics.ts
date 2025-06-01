import { useCallback, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';
import { trackEvent as trackGlobalEvent, trackPageview, setUserId as setGlobalUserId } from '../utils/optimizeAnalytics';

// Initialize Google Analytics
const initializeGA = (measurementId: string) => {
  if (measurementId) {
    ReactGA.initialize(measurementId, {
      gaOptions: {
        debug_mode: import.meta.env.DEV,
        send_page_view: false
      }
    });
  }
};

export const useAnalytics = () => {
  const location = useLocation();

  // Initialize analytics on first render
  useEffect(() => {
    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId) {
      initializeGA(measurementId);
    }
  }, []);

  // Track page views when location changes
  useEffect(() => {
    // Track page view in global GA
    trackPageview(location.pathname + location.search);
    
    // Track in ReactGA4 as well for backward compatibility
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
      title: document.title
    });
  }, [location]);

  // Function to track events
  const trackEvent = useCallback((
    category: string, 
    action: string,
    label?: string,
    value?: number,
    nonInteraction: boolean = false
  ) => {
    // Track with global GA
    trackGlobalEvent(category, action, label, value, nonInteraction);
    
    // Track with React GA4 for backward compatibility
    ReactGA.event({
      category,
      action,
      label,
      value,
      nonInteraction
    });
  }, []);

  // Function to set user ID
  const setUserId = useCallback((id: string) => {
    if (!id) return;
    
    // Set for global GA
    setGlobalUserId(id);
    
    // Set for React GA4
    ReactGA.set({ userId: id });
  }, []);

  return { 
    trackEvent,
    setUserId
  };
};