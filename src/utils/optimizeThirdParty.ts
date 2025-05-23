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
let retryCount = 0;
const MAX_RETRIES = 3;

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
      retryCount = 0; // Reset retry count on success
      resolve(true);
      delete window[callbackName];
    };
    
    // Remove any existing Google Maps script
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.remove();
    }
    
    // Build the script URL with libraries
    const libraryParams = libraries.join(',');
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraryParams}&callback=${callbackName}`;
    script.async = true; // Ensure async attribute is set
    
    // Handle loading errors
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      
      // Remove the script element that failed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      
      // Check if we should retry
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying Google Maps API load (attempt ${retryCount}/${MAX_RETRIES})...`);
        googleMapsLoading = false;
        loadInitiated = false;
        
        // Retry with exponential backoff
        setTimeout(() => {
          initGoogleMaps(apiKey, libraries)
            .then(resolve)
            .catch(() => {
              googleMapsLoading = false;
              googleMapsLoaded = false;
              googleMapsPromise = null;
              loadInitiated = false;
              resolve(false);
            });
        }, Math.pow(2, retryCount) * 1000); // 2s, 4s, 8s backoff
      } else {
        // Give up after max retries
        console.error(`Failed to load Google Maps API after ${MAX_RETRIES} attempts`);
        googleMapsLoading = false;
        googleMapsLoaded = false;
        googleMapsPromise = null;
        loadInitiated = false;
        resolve(false);
      }
    };
    
    document.head.appendChild(script);
    
    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (!googleMapsLoaded) {
        console.warn('Google Maps API loading timed out');
        
        // Remove the script element that timed out
        const scriptElement = document.getElementById('google-maps-script');
        if (scriptElement && scriptElement.parentNode) {
          scriptElement.parentNode.removeChild(scriptElement);
        }
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying Google Maps API load after timeout (attempt ${retryCount}/${MAX_RETRIES})...`);
          googleMapsLoading = false;
          loadInitiated = false;
          
          // Retry with exponential backoff
          setTimeout(() => {
            initGoogleMaps(apiKey, libraries)
              .then(resolve)
              .catch(() => {
                googleMapsLoading = false;
                googleMapsLoaded = false;
                googleMapsPromise = null;
                loadInitiated = false;
                resolve(false);
              });
          }, Math.pow(2, retryCount) * 1000);
        } else {
          googleMapsLoading = false;
          googleMapsPromise = null;
          loadInitiated = false;
          resolve(false);
        }
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
    script.defer = true; // Add defer attribute to reduce main thread blocking
    document.head.appendChild(script);
  };
  
  // Defer loading for better performance
  if (options.delayLoad) {
    if (document.readyState === 'complete') {
      setTimeout(loadAnalyticsScript, 2000); // Increase delay for better performance
    } else {
      window.addEventListener('load', () => {
        setTimeout(loadAnalyticsScript, 2000); // Increase delay for better performance
      });
    }
  } else {
    // Load immediately
    loadAnalyticsScript();
  }
};

// Track Voiceflow chat loading state
let voiceflowLoading = false;
let voiceflowRetryCount = 0;
const VOICEFLOW_MAX_RETRIES = 3;

/**
 * Initializes Voiceflow chat with reliable loading strategy and improved error handling
 */
export const initVoiceflowChat = (
  projectId: string,
  options: {
    delay?: number;
    waitForIdle?: boolean;
    waitForInteraction?: boolean;
  } = {}
): void => {
  // Don't initialize if already loaded or loading
  if (document.getElementById('voiceflow-script') || window.voiceflow?.chat || voiceflowLoading) return;
  
  const { 
    delay = 2000,
    waitForIdle = false, 
    waitForInteraction = false // Changed default to false to load immediately
  } = options;
  
  const loadVoiceflow = () => {
    // Mark as loading
    voiceflowLoading = true;
    
    // Ensure DOM is ready before attempting to load
    if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
      window.addEventListener('DOMContentLoaded', () => {
        voiceflowLoading = false;
        loadVoiceflow();
      });
      return;
    }
    
    // Check if the container exists before loading script
    const container = document.getElementById('voiceflow-chat-container');
    if (!container) {
      console.error('Voiceflow chat container not found in the DOM, attempting to create one');
      const newContainer = document.createElement('div');
      newContainer.id = 'voiceflow-chat-container';
      document.body.appendChild(newContainer);
    }
    
    // Create the Voiceflow script with proper error handling
    const script = document.createElement('script');
    script.id = 'voiceflow-script';
    script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
    script.type = 'module';
    script.async = true;
    
    // Add proper error handling
    script.onload = () => {
      console.log('Voiceflow script loaded, initializing...');
      
      // Give the script a moment to fully initialize
      setTimeout(() => {
        if (window.voiceflow?.chat) {
          try {
            console.log('Initializing Voiceflow chat...');
            // Initialize with comprehensive error handling
            window.voiceflow.chat.load({
              verify: { projectID: projectId },
              url: 'https://general-runtime.voiceflow.com',
              versionID: 'production',
              voice: {
                url: "https://runtime-api.voiceflow.com"
              }
            });
            
            // Mark as no longer loading
            voiceflowLoading = false;
            voiceflowRetryCount = 0;
            console.log('Voiceflow chat initialized successfully');
          } catch (e) {
            console.error('Error initializing Voiceflow chat:', e);
            handleVoiceflowLoadError();
          }
        } else {
          console.warn('Voiceflow chat object not available after script load');
          handleVoiceflowLoadError();
        }
      }, 1000);
    };
    
    // Handle script load error
    script.onerror = (error) => {
      console.error('Failed to load Voiceflow chat script:', error);
      handleVoiceflowLoadError();
    };
    
    // Add the script to head for better loading sequence
    document.head.appendChild(script);
  };
  
  // Helper function to handle Voiceflow load errors
  const handleVoiceflowLoadError = () => {
    // Clean up any failed script
    const failedScript = document.getElementById('voiceflow-script');
    if (failedScript && failedScript.parentNode) {
      failedScript.parentNode.removeChild(failedScript);
    }
    
    // Reset loading state
    voiceflowLoading = false;
    
    // Retry logic with exponential backoff
    if (voiceflowRetryCount < VOICEFLOW_MAX_RETRIES) {
      voiceflowRetryCount++;
      console.log(`Retrying Voiceflow chat load (attempt ${voiceflowRetryCount}/${VOICEFLOW_MAX_RETRIES})...`);
      
      // Retry with exponential backoff
      setTimeout(loadVoiceflow, Math.pow(2, voiceflowRetryCount) * 1000);
    } else {
      console.error(`Failed to load Voiceflow chat after ${VOICEFLOW_MAX_RETRIES} attempts`);
    }
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
    
    // Fallback: Load after 10 seconds anyway
    setTimeout(() => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, interactionHandler);
      });
      if (!document.getElementById('voiceflow-script') && !window.voiceflow?.chat && !voiceflowLoading) {
        loadVoiceflow();
      }
    }, 10000);
  } else if (waitForIdle && 'requestIdleCallback' in window) {
    // Load when browser is idle
    window.requestIdleCallback(() => loadVoiceflow(), { timeout: 10000 });
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
          Autocomplete?: new (input: HTMLInputElement, options: any) => any;
          PlaceAutocompleteElement?: new (options: any) => {
            inputElement: HTMLInputElement;
            getPlace: () => any;
            addEventListener: (event: string, callback: () => void) => void;
          };
        };
        Geocoder?: new () => {
          geocode: (request: { address: string } | { location: { lat: number, lng: number } }, 
                    callback: (
                      results: google.maps.GeocoderResult[] | null, 
                      status: google.maps.GeocoderStatus
                    ) => void) => void;
        };
        GeocoderStatus?: {
          OK: string;
          ZERO_RESULTS: string;
          OVER_QUERY_LIMIT: string;
          REQUEST_DENIED: string;
          INVALID_REQUEST: string;
          UNKNOWN_ERROR: string;
        };
        GeocoderResult?: any;
        event?: {
          addListener: (instance: any, event: string, handler: Function) => any;
          removeListener: (listener: any) => void;
          clearInstanceListeners: (instance: any) => void;
        };
      };
    };
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    [key: string]: any; // For dynamic callback functions
  }
}