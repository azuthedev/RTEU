import React, { useState } from 'react';
import { Phone, Mail, MapPin, ChevronDown, ChevronRight, Instagram, Github, Linkedin } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { smoothScrollTo } from '../utils/smoothScroll';
import { useAnalytics } from '../hooks/useAnalytics';

// Accordion component for mobile collapsible sections
const FooterAccordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 pb-2 md:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-left font-bold text-base md:text-lg"
        aria-expanded={isOpen}
      >
        {title}
        <ChevronDown 
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          aria-hidden="true" 
        />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sitemap = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const currentYear = new Date().getFullYear();
  
  // Handle scrolling to top when clicking Home link
  const handleHomeClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault(); // Prevent default navigation
      // Dispatch a custom event to trigger the scroll
      const forceScrollEvent = new Event('forceScrollToTop');
      window.dispatchEvent(forceScrollEvent);
      
      // Also manually scroll to top with smooth behavior
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
      
      trackEvent('Navigation', 'Footer Click', 'Home (Scroll to Top)');
    } else {
      // Normal navigation if not on homepage
      trackEvent('Navigation', 'Footer Click', 'Home');
    }
  };
  
  // Define essential quick links for mobile
  const essentialQuickLinks = [
    { path: '/', label: t('sitemap.quicklinks.home', 'Home'), onClick: handleHomeClick },
    { path: '/about', label: t('sitemap.quicklinks.about', 'About Us') },
    { path: '/services', label: t('sitemap.quicklinks.services', 'Services') },
    { path: '/blogs/destinations', label: t('sitemap.quicklinks.destinations', 'Destinations') },
    { path: '/contact', label: t('sitemap.quicklinks.contact', 'Contact') },
  ];
  
  // Define help links
  const helpLinks = [
    { path: '/booking-support', label: t('sitemap.gethelp.bookingsupport', 'Booking Support') },
    { path: '/payment-info', label: t('sitemap.gethelp.payment', 'Payment Information') },
    { path: '/terms', label: t('sitemap.gethelp.terms', 'Terms & Conditions') },
    { path: '/privacy', label: t('sitemap.gethelp.privacy', 'Privacy Policy') },
  ];

  // Handle Book Now click - similar to the header implementation
  const handleCTAClick = () => {
    trackEvent('Navigation', 'Book Now Click', 'Footer');

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
          const isMobile = window.innerWidth < 768;
          const offset = 70;
          
          if (!isMobile) {
            smoothScrollTo(0, 1050);
            return;
          }

          const heroText = bookingForm.querySelector('h1');
          if (heroText) {
            const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
            smoothScrollTo(scrollPosition, 1050);
          }
        }
      }, 100);
    } else {
      const bookingForm = document.getElementById('booking-form');
      if (bookingForm) {
        const isMobile = window.innerWidth < 768;
        const offset = 70;
        
        if (!isMobile) {
          smoothScrollTo(0, 1050);
          return;
        }

        const heroText = bookingForm.querySelector('h1');
        if (heroText) {
          const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
          smoothScrollTo(scrollPosition, 1050);
        }
      }
    }
  };

  return (
    <footer className="bg-gray-900 text-white pt-12 pb-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile footer - completely different layout */}
        <div className="md:hidden space-y-6">
          {/* Contact information - TOP PRIORITY */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">{t('sitemap.contact.head', 'Contact Information')}</h2>
            
            <a 
              href="tel:+393517482244" 
              className="flex items-center py-3 text-lg font-medium"
            >
              <Phone className="h-6 w-6 mr-3 text-blue-400" />
              <span>+39 351 748 2244</span>
            </a>
            
            <a 
              href="mailto:contact@royaltransfer.eu" 
              className="flex items-center py-3"
            >
              <Mail className="h-6 w-6 mr-3 text-blue-400" />
              <span>contact@royaltransfer.eu</span>
            </a>
            
            <a 
              href="https://maps.google.com/?q=Rome,+Italy" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center py-3"
            >
              <MapPin className="h-6 w-6 mr-3 text-blue-400" />
              <span>Rome, Italy</span>
            </a>
          </div>
          
          {/* Primary CTA - Book Now Button - Updated to use handleCTAClick */}
          <div className="my-6">
            <button
              onClick={handleCTAClick}
              className="block w-full py-3 bg-blue-600 text-white text-center rounded-md font-bold text-lg hover:bg-blue-700 transition-colors"
            >
              {t('nav.bookNow', 'Book Now')}
            </button>
          </div>
          
          {/* Quick Links Accordion */}
          <FooterAccordion title={t('sitemap.quicklinks.head', 'Quick Links')}>
            <nav className="space-y-3 py-3">
              {essentialQuickLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="block py-2 hover:text-blue-300 transition-colors flex items-center"
                  onClick={link.onClick}
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </FooterAccordion>
          
          {/* Get Help Accordion */}
          <FooterAccordion title={t('sitemap.gethelp.head', 'Get Help')}>
            <div className="space-y-3 py-3">
              {helpLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="block py-2 hover:text-blue-300 transition-colors flex items-center"
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
                  {link.label}
                </Link>
              ))}
            </div>
          </FooterAccordion>
          
          {/* Social Icons - Properly sized for touch */}
          <div className="py-6">
            <div className="flex justify-center space-x-6">
              <a 
                href="https://instagram.com/royaltransfer1991" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 hover:text-blue-400 transition-colors" 
                aria-label="Instagram"
              >
                <Instagram className="w-8 h-8" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 hover:text-blue-400 transition-colors" 
                aria-label="LinkedIn"
              >
                <Linkedin className="w-8 h-8" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 hover:text-blue-400 transition-colors" 
                aria-label="GitHub"
              >
                <Github className="w-8 h-8" />
              </a>
            </div>
          </div>
          
          {/* Copyright - minimal */}
          <div className="pt-6 text-center text-gray-400 text-sm">
            <p>{t('footer.copyright', '© 2025 Royal Transfer EU. All rights reserved.')}</p>
          </div>
        </div>
        
        {/* Desktop footer - traditional multi-column layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* First column - Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('sitemap.quicklinks.head', 'Quick Links')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/" 
                    className="hover:text-blue-300 transition-colors"
                    onClick={handleHomeClick}
                  >
                    {t('sitemap.quicklinks.home', 'Home')}
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-blue-300 transition-colors">{t('sitemap.quicklinks.faqs', 'FAQs')}</Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-blue-300 transition-colors">{t('sitemap.quicklinks.about', 'About Us')}</Link>
                </li>
                <li>
                  <Link to="/partners" className="hover:text-blue-300 transition-colors">{t('sitemap.quicklinks.partners', 'Partners')}</Link>
                </li>
                <li>
                  <Link to="/blogs/destinations" className="hover:text-blue-300 transition-colors">{t('sitemap.quicklinks.destinations', 'Destinations')}</Link>
                </li>
                <li>
                  <Link to="/services" className="hover:text-blue-300 transition-colors">{t('sitemap.quicklinks.services', 'Services')}</Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-blue-300 transition-colors">{t('sitemap.quicklinks.contact', 'Contact')}</Link>
                </li>
              </ul>
            </div>
            
            {/* Second column - Get Help */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('sitemap.gethelp.head', 'Get Help')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/booking-support" className="hover:text-blue-300 transition-colors">{t('sitemap.gethelp.bookingsupport', 'Booking Support')}</Link>
                </li>
                <li>
                  <Link to="/payment-info" className="hover:text-blue-300 transition-colors">{t('sitemap.gethelp.payment', 'Payment Information')}</Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-blue-300 transition-colors">{t('sitemap.gethelp.terms', 'Terms & Conditions')}</Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-blue-300 transition-colors">{t('sitemap.gethelp.privacy', 'Privacy Policy')}</Link>
                </li>
                <li>
                  <Link to="/cookie-policy" className="hover:text-blue-300 transition-colors">{t('sitemap.gethelp.cookies', 'Cookie Settings')}</Link>
                </li>
              </ul>
            </div>
            
            {/* Third column - Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('sitemap.contact.head', 'Contact Information')}</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-blue-400" />
                  <a href="tel:+393517482244" className="hover:text-blue-300 transition-colors">+39 351 748 2244</a>
                </li>
                <li className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-blue-400" />
                  <a href="mailto:contact@royaltransfer.eu" className="hover:text-blue-300 transition-colors">contact@royaltransfer.eu</a>
                </li>
                <li className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-400" />
                  <a 
                    href="https://maps.google.com/?q=Rome,+Italy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-300 transition-colors"
                  >
                    Rome, Italy
                  </a>
                </li>
              </ul>
              
              {/* Social Icons */}
              <div className="mt-6">
                <h4 className="text-sm uppercase tracking-wider mb-3">Follow Us</h4>
                <div className="flex space-x-4">
                  <a 
                    href="https://instagram.com/royaltransfer1991" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-gray-400 hover:text-white"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a 
                    href="https://linkedin.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="text-gray-400 hover:text-white"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a 
                    href="https://github.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="text-gray-400 hover:text-white"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* Fourth column - Newsletter and CTA */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Stay Connected</h3>
              <p className="text-gray-300 mb-4">Get exclusive offers, news, and updates about our services.</p>
              
              {/* Updated to use handleCTAClick */}
              <button
                onClick={handleCTAClick}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors mb-6"
              >
                {t('nav.bookNow', 'Book Now')}
              </button>
              
              <div className="mt-6">
                <h4 className="text-sm uppercase tracking-wider mb-3">We Accept</h4>
                <div className="flex flex-wrap gap-2">
                  <div className="bg-white p-1 rounded h-8">
                    <img 
                      src="https://files.royaltransfereu.com/assets/Visa.png" 
                      alt="Visa" 
                      className="h-full object-contain"
                    />
                  </div>
                  <div className="bg-white p-1 rounded h-8">
                    <img 
                      src="https://files.royaltransfereu.com/assets/Mastercard-logo.svg" 
                      alt="Mastercard" 
                      className="h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Copyright - Desktop */}
          <div className="mt-12 pt-8 border-t border-gray-800 text-gray-400 text-sm flex justify-between items-center">
            <p>{t('footer.copyright', '© 2025 Royal Transfer EU. All rights reserved.')}</p>
            <div className="flex space-x-6">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Sitemap;
