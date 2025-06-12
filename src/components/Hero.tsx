import React, { useEffect } from 'react';
import SearchForm from './SearchForm';
import { motion } from 'framer-motion';
import { getFallbackImageUrl, getPrimaryDomainUrl } from '../utils/imageFallbacks';
import OptimizedImage from './OptimizedImage';
import { useLanguage } from '../contexts/LanguageContext';

const Hero = () => {
  const { t, language } = useLanguage();
  
  // Force re-render on language change
  useEffect(() => {
    // This effect will run whenever the language changes
    // The key props on motion components will cause them to re-render
    console.log(`Language changed to ${language} in Hero component`);
  }, [language]);
  
  return (
    <div id="booking-form" className="relative h-[800px] md:h-auto md:min-h-[700px]">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <picture className="w-full h-full">
          {/* Mobile Image */}
          <source
            media="(max-width: 767px)"
            srcSet="https://files.royaltransfereu.com/assets/mobileherotest.webp"
            type="image/webp"
            fetchPriority="high"
          />
          <source
            media="(max-width: 767px)"
            srcSet="https://files.royaltransfereu.com/assets/mobileherotest.png"
            type="image/png"
            fetchPriority="high"
          />
          
          {/* Desktop Image */}
          <source
            media="(min-width: 768px)"
            srcSet="https://files.royaltransfereu.com/assets/newherotest.webp"
            type="image/webp"
            fetchPriority="high"
          />
          <source
            media="(min-width: 768px)"
            srcSet="https://files.royaltransfereu.com/assets/newherotest.png"
            type="image/png"
            fetchPriority="high"
          />
          
          {/* Fallback Image */}
          <OptimizedImage 
            src="https://files.royaltransfereu.com/assets/newherotest.png"
            alt="Luxury sedan transfer service by Royal Transfer EU - professional driver waiting by an elegant black car on a scenic European road"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 md:pb-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="text-white text-center md:text-right">
            <div className="md:absolute md:right-[50%] md:translate-x-[-2rem] md:top-[200px] w-full">
              <motion.h1 
                key={`headline-${language}`} // Force re-render on language change
                className="text-[32px] md:text-6xl mb-4 font-serif"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <span className="block" data-testid="hero-headline">{t('hero.headline')}</span>
                <span className="block" data-testid="hero-headline1">{t('hero.headline1')}</span>
              </motion.h1>
              <motion.p 
                key={`subhead-${language}`} // Force re-render on language change
                className="text-[18px] mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                data-testid="hero-subhead"
              >
                {t('hero.subhead')}
              </motion.p>
            </div>
          </div>
          
          <motion.div 
            className="w-full md:max-w-xl lg:max-w-2xl"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <SearchForm />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;