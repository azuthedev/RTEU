import { useState, useEffect, useCallback } from "react"
import { Banner } from "./banner"
import { Button } from "./button"
import { setCookie, getCookie } from "../../utils/cookieUtils"
import { useAnalytics } from "../../hooks/useAnalytics"
import { Link } from "react-router-dom"
import { useFeatureFlags } from "../FeatureFlagProvider"

const CONSENT_COOKIE_NAME = "royal_transfer_cookie_consent"
const CONSENT_COOKIE_EXPIRY_DAYS = 365

export type ConsentPreferences = {
  necessary: boolean; // Always true, can't be toggled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const { trackEvent } = useAnalytics();
  const { flags, setFeatureFlag } = useFeatureFlags();
  
  // Helper function to check if cookie consent exists
  const hasConsentCookie = useCallback(() => {
    return getCookie(CONSENT_COOKIE_NAME) !== null;
  }, []);

  // Check screen size for responsive layout
  useEffect(() => {
    const checkScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };
    
    // Initial check
    checkScreenWidth();
    
    // Listen for resize events
    window.addEventListener('resize', checkScreenWidth);
    
    return () => {
      window.removeEventListener('resize', checkScreenWidth);
    };
  }, []);

  // Check if user has already set cookie preferences
  useEffect(() => {
    // Only show banner if the feature flag is enabled and consent isn't already given
    if (flags.showCookieBanner && !hasConsentCookie()) {
      // Small delay to prevent banner from flashing if consent already exists
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [flags.showCookieBanner, hasConsentCookie]);
  
  // Listen for parent window messages (for cross-domain communication)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate message source (optional security improvement)
      // if (event.origin !== 'https://admin.yoursite.com') return;
      
      if (event.data && event.data.type === 'updateFeatureFlags') {
        const newFlags = event.data.flags;
        if (typeof newFlags.showCookieBanner === 'boolean') {
          setFeatureFlag('showCookieBanner', newFlags.showCookieBanner);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setFeatureFlag]);

  // Save consent preferences to cookie
  const saveConsent = (consentType: "all" | "necessary"): void => {
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics: consentType === "all",
      marketing: consentType === "all",
      preferences: consentType === "all"
    };

    setCookie(
      CONSENT_COOKIE_NAME,
      JSON.stringify(preferences),
      CONSENT_COOKIE_EXPIRY_DAYS
    );
    
    trackEvent(
      'Cookie Consent',
      consentType === "all" ? 'Accept All' : 'Necessary Only',
      '',
      0,
      true
    );
    
    // Apply consent settings
    if (typeof window !== 'undefined') {
      // Set GA opt-out based on analytics preference
      window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] = !preferences.analytics;
      
      // Additional logic for other cookie types could be added here
    }
    
    setIsVisible(false);
    
    // Also update the feature flag to hide the banner
    setFeatureFlag('showCookieBanner', false);
  };

  // Accept all cookie types
  const acceptAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveConsent("all");
  };

  // Accept only necessary cookies
  const acceptNecessary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveConsent("necessary");
  };

  // Handle learn more link click
  const handleLearnMoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackEvent('Cookie Consent', 'Learn More Click', '');
    window.open("/cookie-policy", "_blank");
  };

  // Don't render if flag is disabled or banner shouldn't be visible
  if (!flags.showCookieBanner || !isVisible) return null;
  
  // Determine which layout to use based on screen width
  const isMobile = screenWidth < 485;    // < 640px = Mobile
  const isTablet = screenWidth >= 485 && screenWidth < 724; // 640-1024px = Tablet
  const isDesktop = screenWidth >= 724;  // >= 1024px = Desktop

  return (
    <div 
      className="fixed bottom-4 inset-x-0 z-[999] flex justify-center px-4 pointer-events-none"
      onClick={(e) => e.stopPropagation()}
    >
      <Banner 
        rounded="pill"
        size="sm"
        className="max-w-max shadow-lg shadow-black/10 bg-white border-gray-200 pointer-events-auto"
      >
        {isMobile && (
          // Mobile layout - stacked with Learn more below buttons
          <div className="w-full px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-0.5">
              {/* Text first */}
              <p className="text-xs text-center mb-1">
                We use cookies for a better experience
              </p>
              
              {/* Buttons next */}
              <div className="flex justify-center items-center gap-2 w-full mb-1">
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs py-1 h-7 px-3"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={acceptNecessary}
                  className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-xs py-1 h-7 px-3"
                >
                  Reject
                </Button>
              </div>
              
              {/* Learn More link at bottom */}
              <Link 
                to="/cookie-policy"
                className="text-[10px] text-center text-gray-500 hover:text-gray-700 hover:underline mx-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  trackEvent("Cookie Consent", "Learn More Click", "");
                }}
              >
                Learn more
              </Link>
            </div>
          </div>
        )}
        
        {isTablet && (
          // Tablet layout - text and Learn more on one line, buttons below
          <div className="w-full px-2 py-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-1">
              {/* Combined text with Learn More in parentheses */}
              <p className="text-sm text-center mb-1">
                We use cookies for a better experience
                <Link
                  to="/cookie-policy"
                  className="text-xs text-gray-500 hover:text-gray-700 hover:underline ml-1"
                  onClick={handleLearnMoreClick}
                >
                  (Learn more)
                </Link>
              </p>
              
              {/* Buttons below */}
              <div className="flex justify-center items-center gap-2">
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs py-1 h-7 px-3"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={acceptNecessary}
                  className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-xs py-1 h-7 px-3"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {isDesktop && (
          // Desktop layout - fully inline: text on left, buttons on right
          <div className="w-full px-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              {/* Text with Learn More in parentheses */}
              <p className="text-sm mr-4 flex-grow">
                We use cookies for a better experience
                <Link
                  to="/cookie-policy"
                  className="text-xs text-gray-500 hover:text-gray-700 hover:underline ml-1"
                  onClick={handleLearnMoreClick}
                >
                  (Learn more)
                </Link>
              </p>
              
              {/* Buttons on right */}
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Button 
                  size="sm"
                  onClick={acceptAll}
                  className="bg-blue-600 text-white hover:bg-blue-700 text-xs py-1 h-7 px-3"
                >
                  Accept All
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={acceptNecessary}
                  className="bg-gray-100 border-gray-200 hover:bg-gray-200 text-xs py-1 h-7 px-3"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </Banner>
    </div>
  )
}