import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle, Settings } from 'lucide-react';
import CookieSettings from './CookieSettings';
import { useAnalytics } from '../hooks/useAnalytics';
import { getCookie } from '../utils/cookieUtils';
import { useLanguage } from '../contexts/LanguageContext';

const Sitemap = () => {
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();

  // Check for cookie consent on mount to update UI if needed
  useEffect(() => {
    const checkCookieConsent = () => {
      const consentCookie = getCookie('royal_transfer_cookie_consent');
      if (consentCookie) {
        try {
          // We could use this to update any UI elements that should change based on consent
          // const consent = JSON.parse(consentCookie);
          // console.log('Current cookie consent:', consent);
        } catch (error) {
          console.error('Error parsing consent cookie:', error);
        }
      }
    };
    
    // Check on mount
    checkCookieConsent();
    
    // Listen for cookie changes
    const handleCookieChange = () => {
      checkCookieConsent();
    };
    
    window.addEventListener('cookieConsentChanged', handleCookieChange);
    
    return () => {
      window.removeEventListener('cookieConsentChanged', handleCookieChange);
    };
  }, []);

  const openCookieSettings = () => {
    setCookieSettingsOpen(true);
    trackEvent('Engagement', 'Open Cookie Settings', 'Footer');
  };

  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-4">
          {/* Quick Links - Mobile: Custom order and alignment, Desktop: Original layout */}
          <div className="flex flex-col md:col-span-4">
            <h3 className="text-lg ml-4 mb-4 md:text-center md:ml-[50px] text-center">{t('sitemap.quicklinks.head')}</h3>
            <div className="flex md:hidden">
              <div className="w-1/2 pl-4">
                <div className="space-y-2 text-left">
                  <a href="/" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.home')}</a>
                  <a href="/faq" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.faqs')}</a>
                  <a href="/about" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.about')}</a>
                  <a href="/partners" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.partners')}</a>
                </div>
              </div>
              <div className="w-1/2 pr-0">
                <div className="space-y-2 text-right">
                  <a href="/destinations" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.destinations')}</a>
                  <a href="/rent" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.rentacar')}</a>
                  <a href="/services" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.services')}</a>
                  <a href="/contact" className="block text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.contact')}</a>
                </div>
              </div>
            </div>
            {/* Desktop Layout */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-2 md:pl-[100px]">
              <a href="/" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.home')}</a>
              <a href="/about" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.about')}</a>
              <a href="/services" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.services')}</a>
              <a href="/faq" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.faqs')}</a>
              <a href="/partners" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.partners')}</a>
              <a href="/rent" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.rentacar')}</a>
              <a href="/destinations" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.destinations')}</a>
              <a href="/contact" className="text-gray-600 hover:text-blue-600">{t('sitemap.quicklinks.contact')}</a>
            </div>
          </div>

          {/* Contact Information - Center aligned on mobile */}
          <div className="flex flex-col col-span-2 md:col-span-4 order-last md:order-none">
            <h3 className="text-lg mb-4 text-center">{t('sitemap.contact.head')}</h3>
            <ul className="space-y-4 max-w-[250px] mx-auto md:max-w-none">
              <li className="flex items-start md:justify-center">
                <MapPin className="h-5 w-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-gray-600 text-left">123 Transfer Street, EU 12345</span>
              </li>
              <li className="flex items-center md:justify-center">
                <Phone className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-gray-600 text-left">24/7: +39 351 748 22 44</span>
              </li>
              <li className="flex items-center md:justify-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" aria-hidden="true" />
                <span className="text-gray-600 text-left">contact@royaltransfer.eu</span>
              </li>
            </ul>
            
            {/* Social Media Icons - Only visible on mobile */}
            <div className="md:hidden flex justify-center space-x-4 mt-6">
              <a 
                href="#" 
                className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-300"
                aria-label="Facebook - Connect with Royal Transfer EU"
              >
                <Facebook className="w-5 h-5 text-white" aria-hidden="true" />
              </a>
              <a 
                href="https://www.instagram.com/royaltransfer1991/" 
                className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-300"
                aria-label="Instagram - Follow Royal Transfer EU"
              >
                <Instagram className="w-5 h-5 text-white" aria-hidden="true" />
              </a>
              <a 
                href="https://wa.me/3517482244" 
                className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-300"
                aria-label="WhatsApp - Message Royal Transfer EU"
              >
                <MessageCircle className="w-5 h-5 text-white" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Get Help - Original layout preserved */}
          <div className="flex flex-col md:col-span-4 md:pl-32">
            <h3 className="text-lg mb-4">{t('sitemap.gethelp.head')}</h3>
            <ul className="space-y-2">
              <li><a href="/booking-support" className="text-gray-600 hover:text-blue-600">{t('sitemap.gethelp.bookingsupport')}</a></li>
              <li><a href="/payment-info" className="text-gray-600 hover:text-blue-600">{t('sitemap.gethelp.payment')}</a></li>
              <li><a href="/terms" className="text-gray-600 hover:text-blue-600">{t('sitemap.gethelp.terms')}</a></li>
              <li><a href="/privacy" className="text-gray-600 hover:text-blue-600">{t('sitemap.gethelp.privacy')}</a></li>
              <li>
                <button 
                  id="cookie-settings"
                  onClick={openCookieSettings} 
                  className="text-gray-600 hover:text-blue-600 flex items-center"
                  aria-label="Manage cookie settings"
                >
                  <Settings className="h-4 w-4 mr-1" aria-hidden="true" />
                  {t('sitemap.gethelp.cookies')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright - Hidden on mobile, visible on desktop */}
        <div className="mt-12 text-center">
          {/* Social Media */}
          <div className="hidden md:flex justify-center space-x-4 mb-6">
            <a 
              href="#" 
              className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-300"
              aria-label="Facebook - Connect with Royal Transfer EU"
            >
              <Facebook className="w-5 h-5 text-white" aria-hidden="true" />
            </a>
            <a 
              href="https://www.instagram.com/royaltransfer1991/" 
              className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-300"
              aria-label="Instagram - Follow Royal Transfer EU"
            >
              <Instagram className="w-5 h-5 text-white" aria-hidden="true" />
            </a>
            <a 
              href="https://wa.me/3517482244" 
              className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors duration-300"
              aria-label="WhatsApp - Message Royal Transfer EU"
            >
              <MessageCircle className="w-5 h-5 text-white" aria-hidden="true" />
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-500">{t('footer.copyright')}</p>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <CookieSettings 
        isOpen={cookieSettingsOpen}
        onClose={() => setCookieSettingsOpen(false)}
      />
    </footer>
  );
};

export default Sitemap;