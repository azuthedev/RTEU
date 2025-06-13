interface ScriptLoadOptions {
  id?: string;
  async?: boolean;
  defer?: boolean;
  delay?: number;
  callback?: () => void;
}

/**
 * Utility to load external scripts dynamically and efficiently
 */
export const loadExternalScript = (
  src: string, 
  options: ScriptLoadOptions = {}
): Promise<boolean> => {
  const { 
    id = `script-${Math.random().toString(36).substring(2, 9)}`,
    async = true, 
    defer = true, 
    delay = 0,
    callback
  } = options;
  
  // Check if script is already loaded
  if (document.getElementById(id)) {
    return Promise.resolve(true);
  }
  
  return new Promise((resolve) => {
    // Delay script loading if specified
    setTimeout(() => {
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.type = 'text/javascript';
      script.async = async;
      script.defer = defer;
      
      script.onload = () => {
        if (callback) callback();
        resolve(true);
      };
      
      script.onerror = () => {
        console.error(`Failed to load script: ${src}`);
        resolve(false);
      };
      
      // Add to document
      document.body.appendChild(script);
    }, delay);
  });
};

/**
 * Loads Voiceflow chat widget with optimized timing
 */
export const loadVoiceflowChat = (
  projectID: string, 
  options: {
    delay?: number;
    waitForIdle?: boolean;
    waitForInteraction?: boolean;
  } = {}
): Promise<boolean> => {
  const { 
    delay = 3000,
    waitForIdle = true, 
    waitForInteraction = false 
  } = options;
  
  const loadScript = () => {
    return loadExternalScript(
      "https://cdn.voiceflow.com/widget-next/bundle.mjs", 
      {
        id: 'voiceflow-script',
        delay,
        callback: () => {
          // Initialize Voiceflow chat with a small delay
          setTimeout(() => {
            if (window.voiceflow && window.voiceflow.chat) {
              window.voiceflow.chat.load({
                verify: { projectID },
                url: 'https://general-runtime.voiceflow.com',
                versionID: 'production',
                voice: {
                  url: "https://runtime-api.voiceflow.com"
                }
              });
            }
          }, 500);
        }
      }
    );
  };
  
  // Strategy based on options
  if (waitForInteraction) {
    // Wait for user interaction
    const handleInteraction = () => {
      loadScript();
      
      // Remove event listeners after first interaction
      ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
    
    ['click', 'scroll', 'keydown', 'touchstart'].forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true });
    });
    
    // Fallback: load anyway after 20 seconds
    setTimeout(loadScript, 20000);
    
    return Promise.resolve(true);
  } else if (waitForIdle && 'requestIdleCallback' in window) {
    // Use idle callback if available
    window.requestIdleCallback(() => loadScript());
    return Promise.resolve(true);
  } else {
    // Otherwise just load with delay
    return loadScript();
  }
};

/**
 * Loads Google Maps API with optimized timing
 */
export const loadGoogleMapsApi = (
  apiKey: string,
  libraries: string[] = ['places']
): Promise<boolean> => {
  if (window.google?.maps) {
    return Promise.resolve(true);
  }
  
  return new Promise((resolve) => {
    // Create a global callback function
    const callbackName = `initGoogleMaps${Date.now()}`;
    window[callbackName] = () => {
      resolve(true);
      delete window[callbackName];
    };
    
    const librariesParam = libraries.join(',');
    const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${librariesParam}&callback=${callbackName}`;
    
    loadExternalScript(src, {
      id: 'google-maps-script'
    });
  });
};

/**
 * Hook for lazy loading Google Maps
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export const useGoogleMaps = (options: { 
  apiKey?: string, 
  libraries?: string[], 
  loadOnMount?: boolean 
} = {}) => {
  const { 
    apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries = ['places'],
    loadOnMount = false
  } = options;
  
  const [isLoaded, setIsLoaded] = useState(false);
  const hasAttemptedLoad = useRef(false);
  
  const load = useCallback(() => {
    if (hasAttemptedLoad.current) return;
    
    hasAttemptedLoad.current = true;
    loadGoogleMapsApi(apiKey, libraries)
      .then(() => setIsLoaded(true))
      .catch(() => {
        hasAttemptedLoad.current = false;
      });
  }, [apiKey, libraries]);
  
  useEffect(() => {
    if (loadOnMount) {
      load();
    }
  }, [load, loadOnMount]);
  
  return { isLoaded, load };
};

declare global {
  interface Window {
    voiceflow?: {
      chat?: {
        load: (config: any) => void;
        open: () => void;
      }
    };
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    [key: string]: any; // For dynamic Google Maps callback
  }
}