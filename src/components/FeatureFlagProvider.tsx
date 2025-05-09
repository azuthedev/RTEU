import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCookie, setCookie } from '../utils/cookieUtils';

// Define the feature flags type
interface FeatureFlags {
  showCookieBanner: boolean;
  // Add more feature flags as needed
}

// Default state for feature flags
const defaultFeatureFlags: FeatureFlags = {
  showCookieBanner: true,
  // Set defaults for other flags
};

// Create context for feature flags
const FeatureFlagContext = createContext<{
  flags: FeatureFlags;
  setFeatureFlag: (key: keyof FeatureFlags, value: boolean) => void;
}>({
  flags: defaultFeatureFlags,
  setFeatureFlag: () => {},
});

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

export const FeatureFlagProvider: React.FC<FeatureFlagProviderProps> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    // Try to load flags from cookies first
    try {
      const cookieValue = getCookie('featureFlags');
      if (cookieValue) {
        return { ...defaultFeatureFlags, ...JSON.parse(cookieValue) };
      }
      
      // Fall back to localStorage for backward compatibility
      const savedFlags = localStorage.getItem('featureFlags');
      if (savedFlags) {
        const parsedFlags = JSON.parse(savedFlags);
        // Save to cookie for future cross-domain access
        setCookie('featureFlags', savedFlags);
        return { ...defaultFeatureFlags, ...parsedFlags };
      }
      
      return defaultFeatureFlags;
    } catch (error) {
      console.error('Error loading feature flags:', error);
      return defaultFeatureFlags;
    }
  });

  // Effect to handle cookie consent changes
  useEffect(() => {
    const handleCookieConsentChange = (event: CustomEvent) => {
      if (event.detail && event.detail.name === 'royal_transfer_cookie_consent') {
        try {
          const consentValue = event.detail.value;
          if (consentValue) {
            const parsedConsent = JSON.parse(decodeURIComponent(consentValue));
            // If consent is accepted or rejected, we've shown the banner so no need to show it again
            if (parsedConsent) {
              setFlags(prev => ({ ...prev, showCookieBanner: false }));
            }
          }
        } catch (error) {
          console.error('Error parsing cookie consent change:', error);
        }
      }
    };
    
    // Listen for custom cookie consent changed events
    window.addEventListener('cookieConsentChanged', handleCookieConsentChange as EventListener);
    
    return () => {
      window.removeEventListener('cookieConsentChanged', handleCookieConsentChange as EventListener);
    };
  }, []);

  // Effect to fetch flags from a remote source if needed
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        // Check for URL parameters to override flags for testing
        const urlParams = new URLSearchParams(window.location.search);
        const showBanner = urlParams.get('show_cookies_banner');
        
        if (showBanner !== null) {
          const shouldShow = showBanner === '1' || showBanner.toLowerCase() === 'true';
          setFlags(prev => ({ ...prev, showCookieBanner: shouldShow }));
        }
      } catch (error) {
        console.error('Error fetching feature flags:', error);
      }
    };

    fetchFlags();
    
    // Listen for storage events from other tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'featureFlags') {
        try {
          const newFlags = event.newValue ? JSON.parse(event.newValue) : defaultFeatureFlags;
          setFlags(prev => ({ ...prev, ...newFlags }));
        } catch (error) {
          console.error('Error parsing feature flags from storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save flags to cookies and localStorage when they change
  useEffect(() => {
    try {
      const flagsJson = JSON.stringify(flags);
      
      // Set as cookie with domain attribute for cross-domain sharing
      setCookie('featureFlags', flagsJson);
      
      // Also save to localStorage for backward compatibility
      localStorage.setItem('featureFlags', flagsJson);
      
      // Dispatch storage event to notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'featureFlags',
        newValue: flagsJson
      }));
    } catch (error) {
      console.error('Error saving feature flags:', error);
    }
  }, [flags]);

  // Function to set a specific feature flag
  const setFeatureFlag = (key: keyof FeatureFlags, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
  };

  // Define a global function for admin panel integration
  useEffect(() => {
    // Expose a global function to set feature flags from the admin panel
    window.setFeatureFlag = (key: string, value: boolean) => {
      if (key === 'show_cookies_banner') {
        setFeatureFlag('showCookieBanner', value);
        return true;
      }
      // Add more mappings as needed
      return false;
    };
    
    // Check periodically for cookie changes from other domains
    const checkForCookieChanges = () => {
      const cookieValue = getCookie('featureFlags');
      if (cookieValue) {
        try {
          const parsedFlags = JSON.parse(cookieValue);
          // Only update state if different from current
          if (parsedFlags.showCookieBanner !== flags.showCookieBanner) {
            setFlags(prev => ({ ...prev, ...parsedFlags }));
          }
        } catch (error) {
          console.error('Error parsing cookie feature flags:', error);
        }
      }
    };
    
    const intervalId = setInterval(checkForCookieChanges, 5000);
    
    // Clean up
    return () => {
      clearInterval(intervalId);
      delete window.setFeatureFlag;
    };
  }, [flags.showCookieBanner]);

  return (
    <FeatureFlagContext.Provider value={{ flags, setFeatureFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

// Hook to use feature flags
export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
};

// Extend the Window interface to include our global function
declare global {
  interface Window {
    setFeatureFlag?: (key: string, value: boolean) => boolean;
  }
}