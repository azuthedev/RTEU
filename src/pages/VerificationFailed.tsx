import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const VerificationFailed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { t, isLoading } = useLanguage();
  
  // Get error reason from URL
  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  
  // If translations are still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  let errorMessage = t('errors.generic', 'There was a problem verifying your email.');
  if (reason === 'expired') {
    errorMessage = t('errors.expired', 'The verification link has expired. Please request a new verification email.');
  } else if (reason === 'invalid') {
    errorMessage = t('errors.invalid', 'The verification link is invalid or has already been used.');
  }
  
  const handleTryAgain = () => {
    trackEvent('Authentication', 'Verification Failed Retry');
    navigate('/login');
  };
  
  const handleGoHome = () => {
    trackEvent('Authentication', 'Verification Failed Home');
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Verification Failed | Royal Transfer EU')}</title>
        <meta 
          name="description" 
          content={t('meta.description', 'Email verification failed. Please try again or request a new verification link.')} 
        />
      </Helmet>
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-md mx-auto px-4">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">{t('title', 'Verification Failed')}</h2>
            <p className="text-gray-600 mb-8">
              {errorMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleTryAgain}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('buttons.tryAgain', 'Try Again')}
              </button>
              
              <button
                onClick={handleGoHome}
                className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                {t('buttons.goHome', 'Go Home')} <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </main>

    </div>
  );
};

export default VerificationFailed;