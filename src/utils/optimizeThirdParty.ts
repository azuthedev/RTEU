/**
 * Utility to optimize and defer third-party script loading
 */
import { throttle } from 'lodash-es';

// Keep track of Google Maps loading state
let googleMapsLoading = false;
let googleMapsLoaded = false;
let googleMapsPromise: Promise<boolean> | null = null;
let googleMapsInitialized = false;
let loadInitiated = false;

/**
 * Initializes Google Maps API with proper promise-based tracking
 * This function ensures Google Maps loads only once with the correct libraries
 */
export const initGoogleMaps = (apiKey: string, libraries: string[] = ['places']): Promise<boolean> => {
  // If already initialized, return resolved promise
  if (googleMapsLoaded && window.google?.maps) {
    return Promise.resolve(true);
  }
  
  // If already loading, return existing promise
  if (googleMapsLoading && googleMapsPromise) {
    return googleMapsPromise;
  }

  // Prevent multiple init attempts
  if (loadInitiated) {
    return googleMapsPromise || Promise.resolve(false);
  }
  
  // Mark as loading and initiated
  googleMapsLoading = true;
  loadInitiated = true;
  
  // Create a new loading promise
  googleMapsPromise = new Promise((resolve) => {
    console.log('Loading Google Maps API...');
    
    // Create a global callback for when Maps loads
    const callbackName = `initGoogleMaps_${Date.now()}`;
    window[callbackName] = () => {
      console.log('Google Maps API loaded successfully');
      googleMapsLoaded = true;
      googleMapsLoading = false;
      googleMapsInitialized = true;
      resolve(true);
      delete window[callbackName];
    };
    
    // Build the script URL with libraries
    const libraryParams = libraries.join(',');
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraryParams}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    // Handle loading errors
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      googleMapsLoading = false;
      googleMapsLoaded = false;
      googleMapsPromise = null;
      loadInitiated = false; // Allow retry on error
      resolve(false);
    };
    
    document.head.appendChild(script);
    
    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (!googleMapsLoaded) {
        console.warn('Google Maps API loading timed out');
        googleMapsLoading = false;
        googleMapsPromise = null;
        loadInitiated = false; // Allow retry after timeout
        resolve(false);
      }
    }, 15000);
  });
  
  return googleMapsPromise;
};

// Check if Google Maps is ready to use
export const isGoogleMapsLoaded = (): boolean => {
  return googleMapsLoaded && !!window.google?.maps;
};

/**
 * Initializes Google Analytics with minimal impact on performance
 */
export const initGoogleAnalytics = (measurementId: string, options = { delayLoad: true }): void => {
  if (!measurementId) return;
  
  // Set up dataLayer and gtag function immediately
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  
  // Configure with minimal initial settings
  gtag('config', measurementId, {
    send_page_view: false,
    transport_type: 'beacon',
  });
  
  // Load the actual script with delay if specified
  const loadAnalyticsScript = () => {
    if (document.getElementById('ga-script')) return;
    
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.id = 'ga-script';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  };
  
  // Defer loading for better performance
  if (options.delayLoad) {
    if (document.readyState === 'complete') {
      setTimeout(loadAnalyticsScript, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(loadAnalyticsScript, 1000);
      });
    }
  } else {
    // Load immediately
    loadAnalyticsScript();
  }
};

/**
 * Initializes Voiceflow chat with optimal loading strategy
 */
export const initVoiceflowChat = (
  projectId: string,
  options: {
    delay?: number;
    waitForIdle?: boolean;
    waitForInteraction?: boolean;
  } = {}
): void => {
  // Don't initialize if already loaded
  if (document.getElementById('voiceflow-script') || window.voiceflow?.chat) return;
  
  const { 
    delay = 3000, 
    waitForIdle = false, 
    waitForInteraction = false 
  } = options;
  
  const loadVoiceflow = () => {
    const script = document.createElement('script');
    script.id = 'voiceflow-script';
    script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setTimeout(() => {
        if (window.voiceflow?.chat) {
          window.voiceflow.chat.load({
            verify: { projectID: projectId },
            url: 'https://general-runtime.voiceflow.com',
            versionID: 'production',
            voice: {
              url: "https://runtime-api.voiceflow.com"
            }
          });
        }
      }, 500);
    };
    
    document.body.appendChild(script);
  };
  
  // Determine loading strategy
  if (waitForInteraction) {
    // Load after user interaction
    const interactionEvents = ['click', 'scroll', 'touchstart'];
    const interactionHandler = throttle(() => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, interactionHandler);
      });
      loadVoiceflow();
    }, 1000, { leading: true });
    
    interactionEvents.forEach(event => {
      document.addEventListener(event, interactionHandler, { passive: true });
    });
    
    // Fallback: Load after 15 seconds anyway
    setTimeout(() => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, interactionHandler);
      });
      loadVoiceflow();
    }, 15000);
  } else if (waitForIdle && 'requestIdleCallback' in window) {
    // Load when browser is idle
    window.requestIdleCallback(() => loadVoiceflow());
  } else {
    // Load after specified delay
    if (document.readyState === 'complete') {
      setTimeout(loadVoiceflow, delay);
    } else {
      window.addEventListener('load', () => {
        setTimeout(loadVoiceflow, delay);
      });
    }
  }
};

// Define global types
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    voiceflow?: {
      chat?: {
        load: (config: any) => void;
        open: () => void;
      }
    };
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (input: HTMLInputElement, options: any) => any;
        };
      };
    };
    [key: string]: any; // For dynamic callback functions
  }
}