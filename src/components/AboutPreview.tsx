import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AboutPreview = () => {
  const { t } = useLanguage();
  
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl mb-4">{t('about.head')}</h2>
          <p className="text-gray-600 mb-6">
            {t('about.sub')}
          </p>
          <a 
            href="/about" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            {t('about.cta')} →
          </a>
        </div>
      </div>
    </section>
  );
};

export default AboutPreview;