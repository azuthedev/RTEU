import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, Language } from '../contexts/LanguageContext';

// Language display names and image paths
const languages: Record<Language, { name: string; localName: string; code: string }> = {
  en: { name: 'English', localName: 'English', code: 'english' },
  es: { name: 'Spanish', localName: 'Español', code: 'spanish' },
  fr: { name: 'French', localName: 'Français', code: 'french' },
  it: { name: 'Italian', localName: 'Italiano', code: 'italian' },
  de: { name: 'German', localName: 'Deutsch', code: 'german' },
  ru: { name: 'Russian', localName: 'Русский', code: 'russian' },
  se: { name: 'Swedish', localName: 'Svenska', code: 'swedish' }
};

const LanguageSelector: React.FC<{
  className?: string;
  variant?: 'dropdown' | 'horizontal' | 'minimal';
}> = ({ className = '', variant = 'dropdown' }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.language-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  // Flag image component with WebP and fallback - rectangular shape
  const FlagImage = ({ code, alt }: { code: string; alt: string }) => (
    <picture className="inline-flex overflow-hidden rounded-sm border border-gray-200">
      <source srcSet={`https://files.royaltransfereu.com/assets/flags/${code}.webp`} type="image/webp" />
      <img 
        src={`https://files.royaltransfereu.com/assets/flags/${code}.jpg`} 
        alt={alt} 
        className="w-7 h-5 object-cover" // 16:9 aspect ratio for flags
        loading="lazy"
      />
    </picture>
  );

  // Render horizontal selector (for footer or expanded views)
  if (variant === 'horizontal') {
    return (
      <div className={`flex flex-wrap justify-center gap-2 items-center ${className}`}>
        {Object.entries(languages).map(([code, { localName, name }]) => (
          <button
            key={code}
            onClick={() => selectLanguage(code as Language)}
            className={`flex items-center px-2 py-1 rounded-md transition-colors ${
              language === code 
                ? 'bg-blue-100 text-blue-800 font-semibold' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label={`Change language to ${localName}`}
            type="button"
          >
            <span className="mr-2">
              <FlagImage code={languages[code as Language].code} alt={name} />
            </span>
            <span className="text-sm">{localName}</span>
          </button>
        ))}
      </div>
    );
  }
  
  // Render minimal selector (just the flag)
  if (variant === 'minimal') {
    return (
      <div className={`relative language-selector ${className}`}>
        <button
          onClick={toggleDropdown}
          className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none p-1"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select language"
          type="button"
        >
          <FlagImage code={languages[language].code} alt={languages[language].name} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 py-2 w-40 bg-white rounded-md shadow-lg z-50"
              role="listbox"
            >
              {Object.entries(languages).map(([code, { name, localName }]) => (
                <button
                  key={code}
                  onClick={() => selectLanguage(code as Language)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                    language === code ? 'bg-blue-50 text-blue-800' : ''
                  }`}
                  role="option"
                  aria-selected={language === code}
                  type="button"
                >
                  <span className="mr-2">
                    <FlagImage code={languages[code as Language].code} alt={name} />
                  </span>
                  <span>{localName}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Default dropdown selector
  return (
    <div className={`relative language-selector ${className}`}>
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none p-1"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        type="button"
      >
        <span className="mr-1">
          <FlagImage code={languages[language].code} alt={languages[language].name} />
        </span>
        <span className="hidden sm:inline-block">{languages[language].localName}</span>
        <ChevronDown className="ml-1 h-4 w-4" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 py-2 w-40 bg-white rounded-md shadow-lg z-50"
            role="listbox"
          >
            {Object.entries(languages).map(([code, { name, localName }]) => (
              <button
                key={code}
                onClick={() => selectLanguage(code as Language)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                  language === code ? 'bg-blue-50 text-blue-800' : ''
                }`}
                role="option"
                aria-selected={language === code}
                type="button"
              >
                <span className="mr-2">
                  <FlagImage code={languages[code as Language].code} alt={name} />
                </span>
                <span>{localName}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
