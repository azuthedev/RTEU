/**
 * Optimized Google Analytics/Google Tag Manager loader
 * - Async loading with performance optimization
 * - Delayed initialization until idle
 * - Consent-based loading
 */

// Configuration interface
interface AnalyticsConfig {
  measurementId: string;
  debug?: boolean;
  enableConsentMode?: boolean;
  delayLoad?: boolean;
  delayInitialize?: boolean;
  trackPageViews?: boolean;
  anonymizeIp?: boolean;
}

// Default configuration values
const defaultConfig: AnalyticsConfig = {
  measurementId: '',
  debug: false,
  enableConsentMode: true,
  delayLoad: true,
  delayInitialize: true,
  trackPageViews: true,
  anonymizeIp: true,
};

// Track if analytics has been initialized
let analyticsInitialized = false;

/**
 * Initialize Google Analytics with performance optimizations
 * @param config Analytics configuration options
 */
export const initializeAnalytics = (config: Partial<AnalyticsConfig> = {}): void => {
  // Skip if already initialized
  if (analyticsInitialized) return;
  
  // Merge configuration with defaults
  const mergedConfig: AnalyticsConfig = { ...defaultConfig, ...config };
  
  // Skip if no measurement ID is provided
  if (!mergedConfig.measurementId) {
    console.warn('Google Analytics initialization skipped: No measurement ID provided');
    return;
  }
  
  // Create dataLayer if it doesn't exist
  window.dataLayer = window.dataLayer || [];
  
  // Define gtag function (use function declaration instead of arrow function for better compatibility)
  function gtag() {
    // Using arguments object directly rather than string eval
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  
  // Initialize gtag
  gtag('js', new Date());
  
  // Configure with minimal settings initially
  gtag('config', mergedConfig.measurementId, {
    send_page_view: !mergedConfig.delayInitialize && mergedConfig.trackPageViews,
    anonymize_ip: mergedConfig.anonymizeIp,
    transport_type: 'beacon',
    debug_mode: mergedConfig.debug
  });
  
  // Setup consent mode if enabled
  if (mergedConfig.enableConsentMode) {
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied',
      'wait_for_update': 500 // Wait for consent decisions
    });
    
    // Check for existing consent cookie
    try {
      const cookieConsent = localStorage.getItem('royal_transfer_cookie_consent');
      if (cookieConsent) {
        const consent = JSON.parse(cookieConsent);
        updateConsent(consent);
      }
    } catch (e) {
      console.warn('Error reading consent cookie:', e);
    }
  }
  
  // Load the analytics script
  const loadScript = () => {
    // Skip if the script is already loaded
    if (document.getElementById('ga-script')) return;
    
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${mergedConfig.measurementId}`;
    script.id = 'ga-script';
    script.async = true;
    script.defer = true;
    
    // Append to document
    document.head.appendChild(script);
    
    // Initialize full tracking once the script is loaded
    if (mergedConfig.delayInitialize) {
      script.onload = () => {
        // Complete initialization
        if (mergedConfig.trackPageViews) {
          trackPageview();
        }
        analyticsInitialized = true;
      };
    } else {
      analyticsInitialized = true;
    }
  };
  
  // Use delayed loading strategy if enabled
  if (mergedConfig.delayLoad) {
    // Determine the best loading strategy
    if ('requestIdleCallback' in window) {
      // Load when the browser is idle (best option)
      window.requestIdleCallback(() => loadScript(), { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(loadScript, 2000);
    }
    
    // Ensure script is loaded eventually, even if the page never becomes idle
    setTimeout(loadScript, 10000);
  } else {
    // Load immediately
    loadScript();
  }
  
  // Listen for consent changes
  window.addEventListener('consentUpdated', (e: any) => {
    if (e.detail) {
      updateConsent(e.detail);
    }
  });
};

/**
 * Update consent settings for Google Analytics
 */
export const updateConsent = (consentOptions: {
  analytics?: boolean;
  marketing?: boolean;
  preferences?: boolean;
}): void => {
  if (!window.gtag) return;
  
  window.gtag('consent', 'update', {
    'analytics_storage': consentOptions.analytics ? 'granted' : 'denied',
    'ad_storage': consentOptions.marketing ? 'granted' : 'denied',
    'personalization_storage': consentOptions.preferences ? 'granted' : 'denied'
  });
  
  // Update opt-out flag for GA
  if (typeof window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] !== 'undefined') {
    window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] = !consentOptions.analytics;
  }
};

/**
 * Track a pageview in Google Analytics
 */
export const trackPageview = (path?: string, title?: string): void => {
  if (!window.gtag) return;
  
  window.gtag('event', 'page_view', {
    page_path: path || window.location.pathname + window.location.search,
    page_title: title || document.title,
    page_location: path ? `${window.location.origin}${path}` : window.location.href
  });
};

/**
 * Track an event in Google Analytics
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
  nonInteraction: boolean = false
): void => {
  if (!window.gtag) return;
  
  window.gtag('event', action, {
    'event_category': category,
    'event_label': label,
    'value': value,
    'non_interaction': nonInteraction
  });
  
  // Log to console in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Analytics Event: ${category} - ${action}${label ? ` - ${label}` : ''}${value !== undefined ? ` - ${value}` : ''}${nonInteraction ? ' (Non-interaction)' : ''}`);
  }
};

/**
 * Set the user ID for Google Analytics
 */
export const setUserId = (userId: string): void => {
  if (!window.gtag) return;
  
  window.gtag('set', { 'user_id': userId });
};

// Define types for global window object
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    [key: string]: any; // For GA disable property
  }
}