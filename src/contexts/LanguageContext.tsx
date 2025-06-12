import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Define available languages
export type Language = 'en' | 'es' | 'fr' | 'it' | 'de' | 'ru' | 'se';

// Define the shape of our language context
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Record<string, any>;
  t: (key: string, params?: Record<string, string>) => string;
  isLoading: boolean;
}

// Create context with default values
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define props for LanguageProvider
interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Get initial language from localStorage or use browser language if available, fallback to 'en'
  const getBrowserLanguage = (): Language => {
    const browserLang = navigator.language.split('-')[0];
    return ['en', 'es', 'fr', 'it', 'de', 'ru', 'se'].includes(browserLang) 
      ? browserLang as Language 
      : 'en';
  };
  
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem('language') as Language) || getBrowserLanguage()
  );
  
  // Separate states for global and page-specific translations
  const [globalTranslations, setGlobalTranslations] = useState<Record<string, any>>({});
  const [pageTranslations, setPageTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const loadedPagesRef = useRef<Set<string>>(new Set());
  
  // Memoize the translations object to avoid unnecessary re-renders
  const translations = useMemo(() => {
    return {
      ...globalTranslations,
      ...pageTranslations
    };
  }, [globalTranslations, pageTranslations]);

  // Fallback translations for common elements if regular translations fail
  const fallbackTranslations = {
    'nav.home': 'Home',
    'nav.about': 'About Us',
    'nav.services': 'Services',
    'nav.destinations': 'Destinations',
    'nav.faqs': 'FAQs',
    'nav.partners': 'Partners',
    'nav.contact': 'Contact',
    'nav.login': 'Sign In',
    'nav.bookNow': 'Book Now',
    'nav.bookings': 'Your Bookings',
    'nav.profile': 'Your Profile',
    'nav.adminPortal': 'Admin Portal',
    'nav.partnerPortal': 'Partner Portal',
    'nav.signOut': 'Sign Out',
    'searchform.oneway': 'One Way',
    'searchform.roundtrip': 'Round Trip',
    'searchform.pickup': 'Pickup location',
    'searchform.dropoff': 'Dropoff location',
    'searchform.date': 'Select departure date',
    'searchform.dates': 'Select departure & return dates',
    'searchform.passenger': 'Passenger',
    'searchform.passengers': 'Passengers',
    'searchform.cta': 'See Prices',
    'hero.headline': 'The road is part of',
    'hero.headline1': 'the adventure',
    'hero.subhead': 'Enjoy the trip — we\'ll handle the rest',
    'common.loading': 'Loading...',
    'footer.copyright': '© 2025 Royal Transfer EU. All rights reserved.',
  };

  // Create a memoized setLanguage function
  const setLanguage = useCallback((newLanguage: Language) => {
    // Update localStorage first
    localStorage.setItem('language', newLanguage);
    // Then update state
    setLanguageState(newLanguage);
  }, []);

  // Function to load global translations - memoized
  const loadGlobalTranslations = useCallback(async (lang: Language) => {
    console.log(`Loading global translations for ${lang}`);
    
    try {
      let globalModule: Record<string, any> = {};
      try {
        globalModule = await import(`../../locales/${lang}/global.json`);
      } catch (error) {
        console.warn(`Failed to load global translations for ${lang}, falling back to English`, error);
        try {
          // Try English global as fallback
          globalModule = await import('../../locales/en/global.json');
        } catch (fallbackError) {
          console.error('Failed to load English fallback for global translations', fallbackError);
          // If even English fails, use fallback translations
          globalModule = { ...fallbackTranslations };
        }
      }
      
      // Set global translations
      setGlobalTranslations(globalModule.default || globalModule);
    } catch (error) {
      console.error(`Critical failure loading global translations for ${lang}`, error);
      // Set minimal translations to avoid breaking UI
      setGlobalTranslations(fallbackTranslations);
    }
  }, []);

  // Function to load page-specific translations - memoized
  const loadPageTranslations = useCallback(async (lang: Language, page: string) => {
    console.log(`Loading page translations for ${lang}/${page}`);
    setIsLoading(true);
    
    try {
      // Only load each page once per language change to avoid unnecessary loads
      const pageKey = `${lang}:${page}`;
      if (loadedPagesRef.current.has(pageKey)) {
        console.log(`Already loaded ${pageKey}`);
        setIsLoading(false);
        return;
      }
      
      // Try to load page-specific translations
      let pageModule: Record<string, any> = {};
      try {
        pageModule = await import(`../../locales/${lang}/${page}.json`);
        console.log(`Successfully loaded translations for ${lang}/${page}`);
      } catch (error) {
        console.warn(`Failed to load page translations for ${lang}/${page}, falling back to English`, error);
        try {
          // Try English page as fallback
          pageModule = await import(`../../locales/en/${page}.json`);
          console.log(`Successfully loaded English fallback for ${page}`);
        } catch (fallbackError) {
          console.error(`Failed to load English fallback for ${page} translations`, fallbackError);
          // If even English fails, use an empty object
          pageModule = {};
        }
      }
      
      // Set page translations
      setPageTranslations(prev => ({
        ...prev,
        ...(pageModule.default || pageModule)
      }));
      
      loadedPagesRef.current.add(pageKey);
    } catch (error) {
      console.error(`Critical failure loading page translations for ${lang}/${page}`, error);
    } finally {
      // Always set loading to false after attempting to load, whether successful or not
      setIsLoading(false);
    }
  }, []);

  // Determine current page for loading page-specific translations
  const getPageName = useCallback((): string => {
    const pathname = window.location.pathname;
    // Remove leading '/' and get the first segment of the path
    const path = pathname.substring(1).split('/')[0];
    
    // If we're at root, return 'index'
    if (path === '') return 'index';
    
    // Map path to known pages
    const pageMap: Record<string, string> = {
      'transfer': 'bookingFlow', // Special case for booking flow pages
      'booking-success': 'bookingSuccess',
      'booking-cancelled': 'bookingCancelled',
      'blogs': 'blogs'
    };
    
    return pageMap[path] || path;
  }, []);

  // Update localStorage when language changes and load translations
  useEffect(() => {
    // Reset loaded pages when language changes
    loadedPagesRef.current = new Set();
    
    // First load global translations
    loadGlobalTranslations(language);
    
    // Then load page-specific translations
    const page = getPageName();
    loadPageTranslations(language, page);
    
    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', language);
  }, [language, loadGlobalTranslations, loadPageTranslations, getPageName]);

  // Listen for route changes to update translations
  useEffect(() => {
    const handleRouteChange = () => {
      const page = getPageName();
      loadPageTranslations(language, page);
    };

    // Listen for popstate events
    window.addEventListener('popstate', handleRouteChange);
    
    // Clean up
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [language, loadPageTranslations, getPageName]);

  // Fixed translation function to handle flat key structure - memoized
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    try {
      // First try direct lookup (for flat keys in the translation files)
      if (key in translations && typeof translations[key] === 'string') {
        let value = translations[key];
        
        // Process parameters if any
        if (params) {
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            value = value.replace(`{{${paramKey}}}`, paramValue);
          });
        }
        return value;
      }
      
      // If direct lookup fails, try nested lookup
      const keyParts = key.split('.');
      let value: any = translations;
      
      for (const part of keyParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          // Key not found in main translations
          value = undefined;
          break;
        }
      }
      
      // If a valid string translation was found, return it
      if (typeof value === 'string') {
        // Process parameters if any
        if (params) {
          Object.entries(params).forEach(([paramKey, paramValue]) => {
            value = value.replace(`{{${paramKey}}}`, paramValue);
          });
        }
        return value;
      }
      
      // If not found in main translations, try fallback
      if (key in fallbackTranslations) {
        return fallbackTranslations[key];
      }
      
      // As last resort, return the key itself
      console.warn(`Translation key not found: ${key}`);
      return key;
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error);
      return fallbackTranslations[key] || key;
    }
  }, [translations]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ 
    language, 
    setLanguage, 
    translations, 
    t, 
    isLoading 
  }), [language, setLanguage, translations, t, isLoading]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook for using the language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};