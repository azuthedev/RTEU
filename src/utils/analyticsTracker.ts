/**
 * Analytics tracking utility for monitoring user interaction and application performance
 */

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  nonInteraction?: boolean;
  dimensions?: Record<string, string>;
  metrics?: Record<string, number>;
  timestamp?: number;
}

// Queue for storing events while analytics is loading
let eventQueue: AnalyticsEvent[] = [];
let isAnalyticsLoaded = false;
// Maximum queue size to prevent memory issues
const MAX_QUEUE_SIZE = 100;

// User context
let userId: string | null = null;
let userSessionId: string | null = null;

/**
 * Ensure analytics initialization
 */
export const initAnalytics = () => {
  if (typeof window === 'undefined') return;
  
  if (typeof window.gtag !== 'function') {
    console.warn('Google Analytics not initialized');
    return;
  }
  
  isAnalyticsLoaded = true;
  
  // Get or create session ID
  userSessionId = sessionStorage.getItem('session_id');
  if (!userSessionId) {
    userSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('session_id', userSessionId);
  }
  
  // Set session ID in analytics
  if (window.gtag && userSessionId) {
    window.gtag('set', { 'session_id': userSessionId });
  }
  
  // Process queued events
  if (eventQueue.length > 0) {
    eventQueue.forEach(event => {
      trackEventImmediate(event);
    });
    eventQueue = [];
  }
};

/**
 * Track an event immediately if analytics is loaded
 */
const trackEventImmediate = (eventData: AnalyticsEvent) => {
  if (typeof window === 'undefined') return;
  
  const { category, action, label, value, nonInteraction = false, dimensions, metrics } = eventData;
  
  // Create params object with all event data
  const params: Record<string, any> = {
    event_category: category,
    event_label: label,
    value: value,
    non_interaction: nonInteraction,
    session_id: userSessionId || undefined,
    user_id: userId || undefined,
    timestamp: Date.now()
  };
  
  // Add custom dimensions if provided
  if (dimensions) {
    Object.entries(dimensions).forEach(([key, value]) => {
      params[key] = value;
    });
  }
  
  // Add custom metrics if provided
  if (metrics) {
    Object.entries(metrics).forEach(([key, value]) => {
      params[key] = value;
    });
  }
  
  // Track with GA4
  try {
    if (window.gtag) {
      window.gtag('event', action, params);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
  
  // Also track with console log in debug mode
  if (process.env.NODE_ENV !== 'production' || localStorage.getItem('DEBUG_ANALYTICS') === 'true') {
    console.log('📊 [Analytics]', {
      category,
      action,
      label,
      value,
      nonInteraction,
      dimensions,
      metrics,
      sessionId: userSessionId,
      userId
    });
  }
};

/**
 * Track an analytics event
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
  nonInteraction: boolean = false,
  dimensions?: Record<string, string>,
  metrics?: Record<string, number>
) => {
  const eventData = {
    category,
    action,
    label,
    value,
    nonInteraction,
    dimensions,
    metrics,
    timestamp: Date.now()
  };
  
  if (!isAnalyticsLoaded) {
    // Queue the event for later if queue isn't too large
    if (eventQueue.length < MAX_QUEUE_SIZE) {
      eventQueue.push(eventData);
    }
    
    // Try to initialize analytics
    initAnalytics();
    return;
  }
  
  trackEventImmediate(eventData);
};

/**
 * Set user ID for analytics tracking
 */
export const setUserId = (id: string) => {
  userId = id;
  
  // Update in GA
  if (window.gtag && id) {
    window.gtag('set', { 'user_id': id });
    
    // Store in localStorage for error tracking
    try {
      const userInfo = { userId: id };
      localStorage.setItem('user_info', JSON.stringify(userInfo));
    } catch (e) {
      console.warn('Failed to store user info in localStorage:', e);
    }
  }
};

/**
 * Set user email for analytics and error tracking
 */
export const setUserEmail = (email: string) => {
  if (!email) return;
  
  // Store in localStorage for error tracking
  try {
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    userInfo.email = email;
    localStorage.setItem('user_info', JSON.stringify(userInfo));
  } catch (e) {
    console.warn('Failed to store user email in localStorage:', e);
  }
};

/**
 * Track a user error event
 */
export const trackError = (
  errorType: string,
  message: string,
  source: string,
  isFatal: boolean = false
) => {
  trackEvent(
    'Error',
    errorType,
    `${source}: ${message}`,
    undefined,
    !isFatal, // Non-interaction if not fatal
    {
      error_type: errorType,
      error_source: source,
      error_fatal: isFatal ? 'true' : 'false',
      session_id: userSessionId || 'unknown'
    }
  );
  
  // Send exception to GA if fatal
  if (isFatal && window.gtag) {
    window.gtag('event', 'exception', {
      description: `${errorType} in ${source}: ${message}`,
      fatal: true
    });
  }
};

/**
 * Track a performance timing
 */
export const trackTiming = (
  category: string,
  variable: string,
  timeInMs: number,
  label?: string
) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: variable,
        value: timeInMs,
        event_category: category,
        event_label: label
      });
    }
  } catch (error) {
    console.error('Error tracking timing:', error);
  }
  
  // Log to console in debug mode
  if (process.env.NODE_ENV !== 'production' || localStorage.getItem('DEBUG_ANALYTICS') === 'true') {
    console.log('⏱️ [Performance]', {
      category,
      variable,
      timeInMs,
      label
    });
  }
};

// Initialize analytics on load
if (typeof window !== 'undefined') {
  // Try to initialize immediately if the page has already loaded
  if (document.readyState === 'complete') {
    initAnalytics();
  } else {
    // Otherwise wait for the page to load
    window.addEventListener('load', initAnalytics);
  }
}

// Add types for global window object
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}