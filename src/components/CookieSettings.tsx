import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCookie, setCookie } from '../utils/cookieUtils';
import { useAnalytics } from '../hooks/useAnalytics';
import { ConsentPreferences } from './ui/CookieBanner';

interface CookieSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONSENT_COOKIE_NAME = 'royal_transfer_cookie_consent';
const CONSENT_COOKIE_EXPIRY_DAYS = 365;

const CookieSettings: React.FC<CookieSettingsProps> = ({ isOpen, onClose }) => {
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false
  });
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (isOpen) {
      // Load current preferences from cookie when dialog opens
      const consentCookie = getCookie(CONSENT_COOKIE_NAME);
      if (consentCookie) {
        try {
          const savedPreferences = JSON.parse(consentCookie);
          setPreferences(savedPreferences);
        } catch (error) {
          console.error('Error parsing consent cookie:', error);
        }
      }
    }
  }, [isOpen]);

  const savePreferences = () => {
    setCookie(
      CONSENT_COOKIE_NAME,
      JSON.stringify(preferences),
      CONSENT_COOKIE_EXPIRY_DAYS
    );
    
    trackEvent(
      'Cookie Consent',
      'Update Settings',
      `Analytics: ${preferences.analytics ? 'Accepted' : 'Rejected'}, Marketing: ${preferences.marketing ? 'Accepted' : 'Rejected'}`,
      0,
      true
    );
    
    // Apply consent settings
    if (typeof window !== 'undefined') {
      // Set GA opt-out based on analytics preference
      window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] = !preferences.analytics;
      
      // Additional logic for other cookie types could be added here
    }
    
    onClose();
  };

  // Toggle individual preferences
  const togglePreference = (key: keyof Omit<ConsentPreferences, 'necessary'>) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Accept all cookie types
  const acceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    
    setPreferences(allAccepted);
    setCookie(
      CONSENT_COOKIE_NAME,
      JSON.stringify(allAccepted),
      CONSENT_COOKIE_EXPIRY_DAYS
    );
    
    trackEvent('Cookie Consent', 'Accept All (Settings)', '', 0, true);
    
    // Apply consent settings
    if (typeof window !== 'undefined') {
      window['ga-disable-' + import.meta.env.VITE_GA_MEASUREMENT_ID] = false;
    }
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[250]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[251] flex items-center justify-center p-4 sm:p-6"
          >
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()} // Prevent clicks from reaching the backdrop
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Cookie Settings</h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 rounded-full p-1 transition-colors duration-200"
                  aria-label="Close cookie settings"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  Manage your cookie preferences. Necessary cookies are required for the website to function and cannot be disabled.
                </p>
                
                <div className="space-y-4 mb-6">
                  {/* Necessary Cookies - Always enabled */}
                  <div className="border border-gray-200 rounded-md p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Necessary Cookies</div>
                      <div className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                        Required
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      These cookies are essential for the website to function properly and cannot be switched off.
                      They are usually only set in response to actions made by you which amount to a request for services,
                      such as setting your privacy preferences, logging in or filling in forms.
                    </p>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border border-gray-200 rounded-md p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Analytics Cookies</div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={preferences.analytics}
                          onChange={() => togglePreference('analytics')}
                          aria-label="Enable analytics cookies"
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
                    <p className="text-xs sm:text-sm text-gray-600">
                      These cookies help us understand how visitors interact with our website, helping us improve
                      our services and provide you with a better experience. We use Google Analytics which
                      collects anonymous information about how you use our site.
                    </p>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="border border-gray-200 rounded-md p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Marketing Cookies</div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={preferences.marketing}
                          onChange={() => togglePreference('marketing')}
                          aria-label="Enable marketing cookies"
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
                    <p className="text-xs sm:text-sm text-gray-600">
                      These cookies are used to track visitors across websites to display relevant
                      advertisements that are meaningful to you and your interests. They remember that
                      you have visited our site and help us measure the effectiveness of our advertising campaigns.
                    </p>
                  </div>

                  {/* Preference Cookies */}
                  <div className="border border-gray-200 rounded-md p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Preference Cookies</div>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={preferences.preferences}
                          onChange={() => togglePreference('preferences')}
                          aria-label="Enable preference cookies"
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
                    <p className="text-xs sm:text-sm text-gray-600">
                      These cookies enable personalized website functionality based on your preferences.
                      They help remember your preferred settings and choices to enhance your browsing experience.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t p-4 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors sm:order-2"
                >
                  Accept All
                </button>
                <button
                  onClick={savePreferences}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors sm:order-3"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CookieSettings;