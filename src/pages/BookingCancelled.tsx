import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const BookingCancelled = () => {
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  
  useEffect(() => {
    // Track cancellation
    trackEvent('Booking', 'Booking Cancelled', undefined, 0, true);
  }, [trackEvent]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Booking Cancelled | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Your booking has been cancelled. No payment has been processed.')} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" aria-hidden="true" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{t('title', 'Booking Cancelled')}</h1>
            <p className="text-lg text-gray-600 mb-8">
              {t('message', 'Your booking process has been cancelled. No payment has been processed.')}
            </p>
            
            <div className="border-t border-b py-6 my-6">
              <h2 className="text-xl font-semibold mb-4">{t('nextSteps.title', 'What Would You Like to Do Next?')}</h2>
              <p className="text-gray-600 mb-4">
                {t('nextSteps.description', 'You can try booking again or contact our support team if you need assistance.')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  trackEvent('Navigation', 'Post-Cancellation Click', 'Return to Home');
                  navigate('/');
                }}
                className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all duration-300 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
                {t('buttons.home', 'Return to Home')}
              </button>
              <Link
                to="/contact"
                onClick={() => trackEvent('Navigation', 'Post-Cancellation Click', 'Contact Support')}
                className="border border-black text-black px-6 py-3 rounded-md hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
              >
                {t('buttons.contact', 'Contact Support')}
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default BookingCancelled;