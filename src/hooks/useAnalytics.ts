import { useCallback, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';

// Initialize Google Analytics
const initializeGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
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
    initializeGA();
  }, []);

  // Track page views when location changes
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title
      });
    }
    
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
    // Log to console in development
    console.log(`Analytics Event: ${category} - ${action}${label ? ` - ${label}` : ''}${value !== undefined ? ` - ${value}` : ''}${nonInteraction ? ' (Non-interaction)' : ''}`);
    
    // Track with React GA4
    ReactGA.event({
      category,
      action,
      label,
      value,
      nonInteraction
    });
    
    // Also track with gtag if available
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', action, {
          'event_category': category,
          'event_label': label,
          'value': value,
          'non_interaction': nonInteraction
        });
      }
    } catch (error) {
      console.error('Error tracking with gtag:', error);
    }
  }, []);

  // Function to set user ID
  const setUserId = useCallback((id: string) => {
    if (!id) return;
    
    // Set for React GA4
    ReactGA.set({ userId: id });
    
    // Set for gtag if available
    try {
      if (window.gtag) {
        window.gtag('set', { 'user_id': id });
      }
    } catch (error) {
      console.error('Error setting user ID with gtag:', error);
    }
  }, []);

  return { 
    trackEvent,
    setUserId
  };
};

