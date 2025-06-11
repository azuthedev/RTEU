import React from 'react';
import { smoothScrollTo } from '../utils/smoothScroll';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLanguage } from '../contexts/LanguageContext';

const CallToAction = () => {
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  
  const scrollToBooking = () => {
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
      const isMobile = window.innerWidth < 768;
      const offset = 70; // Adjustable offset in pixels
      
      // Track CTA click
      trackEvent('Engagement', 'CTA Click', 'Book Your Ride');
      
      // On desktop, scroll to top of the hero section
      if (!isMobile) {
        smoothScrollTo(0, 2000); // 2 seconds duration
        return;
      }

      // On mobile, scroll to just below the hero text
      const heroText = bookingForm.querySelector('h1');
      if (heroText) {
        const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
        smoothScrollTo(scrollPosition, 2000); // 2 seconds duration
      }
    }
  };

  return (
    <section className="py-16 bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl text-white mb-6">{t('cta.head')}</h2>
        <button 
          onClick={scrollToBooking}
          className="bg-white text-blue-600 px-8 py-3 rounded-md hover:bg-gray-100 transition-all duration-300 font-bold"
        >
          {t('cta.button')}
        </button>
      </div>
    </section>
  );
};

export default CallToAction;