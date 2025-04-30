import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Info } from 'lucide-react';
import { setCookie, getCookie } from '../utils/cookieUtils';
import { useAnalytics } from '../hooks/useAnalytics';

export type ConsentPreferences = {
  necessary: boolean; // Always true, can't be toggled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

interface CookieConsentProps {
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  zIndex?: number;
}

const CONSENT_COOKIE_NAME = 'royal_transfer_cookie_consent';
const CONSENT_COOKIE_EXPIRY_DAYS = 365;

const CookieConsent: React.FC<CookieConsentProps> = ({
  privacyPolicyUrl = '/privacy',
  cookiePolicyUrl = '/cookie-policy',
  zIndex = 50
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false
  });
  const { trackEvent } = useAnalytics();

  // Check if user has already set cookie preferences
  useEffect(() => {
    // Small delay to prevent banner from flashing if consent already exists
    const timer = setTimeout(() => {
      const consentCookie = getCookie(CONSENT_COOKIE_NAME);
      if (!consentCookie) {
        setIsVisible(true);
      } else {
        try {
          // If we have existing preferences, parse and use them
          const savedPreferences = JSON.parse(consentCookie);
          setPreferences(savedPreferences);

          // Apply saved preferences
          if (savedPreferences.analytics) {
            enableAnalytics();
          }
        } catch (error) {
          console.error('Error parsing consent cookie:', error);
          setIsVisible(true);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Save consent preferences to cookie
  const saveConsent = (newPreferences: ConsentPreferences) => {
    setCookie(
      CONSENT_COOKIE_NAME,
      JSON.stringify(newPreferences),
      CONSENT_COOKIE_EXPIRY_DAYS
    );
    
    trackEvent(
      'Cookie Consent',
      'Consent Updated',
      `Analytics: ${newPreferences.analytics ? 'Accepted' : 'Rejected'}, Marketing: ${newPreferences.marketing ? 'Accepted' : 'Rejected'}`,
      0,
      true
    );
    
    // Apply consent settings
    if (newPreferences.analytics) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }
    
    setIsVisible(false);
  };

  // Accept all cookies
  const acceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    
    setPreferences(allAccepted);
    saveConsent(allAccepted);
    trackEvent('Cookie Consent', 'Accept All', '', 0, true);
  };

  // Accept only necessary cookies
  const acceptNecessary = () => {
    const necessaryOnly: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    
    setPreferences(necessaryOnly);
    saveConsent(necessaryOnly);
    trackEvent('Cookie Consent', 'Necessary Only', '', 0, true);
  };

  // Save current preferences
  const savePreferences = () => {
    saveConsent(preferences);
    trackEvent('Cookie Consent', 'Custom Preferences', '', 0, true);
  };

  // Toggle individual preferences
  const togglePreference = (key: keyof Omit<ConsentPreferences, 'necessary'>) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Enable analytics based on consent
  const enableAnalytics = () => {
    // Enable Google Analytics
    if (typeof window !== 'undefined') {
      // Remove GA opt-out if it was set
      if (window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID]) {
        window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] = false;
      }
    }
  };

  // Disable analytics based on consent
  const disableAnalytics = () => {
    // Disable Google Analytics
    if (typeof window !== 'undefined') {
      window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] = true;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-0 left-0 right-0 shadow-lg z-[${zIndex}]`}
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
        >
          <div className="bg-white p-6 border-t border-gray-200 max-w-7xl mx-auto">
            {!showDetails ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 id="cookie-consent-title" className="text-lg font-semibold">Cookie Consent</h2>
                  <button 
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    onClick={() => setIsVisible(false)}
                    aria-label="Close cookie consent banner"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <p id="cookie-consent-description" className="text-gray-600 mb-4">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                  By clicking "Accept All", you consent to our use of cookies. You can manage your preferences or learn more in our{' '}
                  <a href={cookiePolicyUrl} className="text-blue-600 hover:underline">cookie policy</a> and{' '}
                  <a href={privacyPolicyUrl} className="text-blue-600 hover:underline">privacy policy</a>.
                </p>
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={acceptNecessary}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Necessary Only
                  </button>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Customize
                  </button>
                  <button
                    onClick={acceptAll}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Cookie Settings</h2>
                  <button 
                    className="text-gray-500 hover:text-gray-800 transition-colors"
                    onClick={() => setShowDetails(false)}
                    aria-label="Back to simple cookie consent"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Necessary Cookies - Always enabled */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Necessary Cookies</div>
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                        Required
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      These cookies are essential for the website to function properly and cannot be switched off.
                    </p>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Analytics Cookies</div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={preferences.analytics}
                          onChange={() => togglePreference('analytics')}
                        />
                        <div className={`relative w-10 h-6 rounded-full transition-colors ${
                          preferences.analytics ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform ${
                            preferences.analytics ? 'translate-x-4' : ''
                          }`} />
                        </div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">
                      These cookies help us analyze how visitors use the website, helping us improve performance and usability.
                    </p>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Marketing Cookies</div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={preferences.marketing}
                          onChange={() => togglePreference('marketing')}
                        />
                        <div className={`relative w-10 h-6 rounded-full transition-colors ${
                          preferences.marketing ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform ${
                            preferences.marketing ? 'translate-x-4' : ''
                          }`} />
                        </div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">
                      These cookies are used to track visitors across websites to deliver more relevant advertisements.
                    </p>
                  </div>

                  {/* Preference Cookies */}
                  <div className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Preference Cookies</div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={preferences.preferences}
                          onChange={() => togglePreference('preferences')}
                        />
                        <div className={`relative w-10 h-6 rounded-full transition-colors ${
                          preferences.preferences ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform transform ${
                            preferences.preferences ? 'translate-x-4' : ''
                          }`} />
                        </div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">
                      These cookies enable personalized website functionality and remember your preferences.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={savePreferences}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 flex items-start">
              <Info className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                You can change your preferences at any time by clicking on the "Cookie Settings" link in the footer.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;