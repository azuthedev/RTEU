import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const VerificationSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { refreshSession } = useAuth();
  const { t, isLoading } = useLanguage();
  
  useEffect(() => {
    // Track successful verification
    trackEvent('Authentication', 'Email Verification Success Page');
    
    // Try to refresh the session to update JWT claims
    refreshSession();
    
    // Get redirect parameter
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get('redirect') || '/login';
    
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate(redirectUrl);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [location, navigate, trackEvent, refreshSession]);
  
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
  
  const handleContinue = () => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get('redirect') || '/login';
    navigate(redirectUrl);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Email Verified Successfully | Royal Transfer EU')}</title>
        <meta 
          name="description" 
          content={t('meta.description', 'Your email has been successfully verified. You can now access your account and book our services.')} 
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">{t('title', 'Email Verified!')}</h2>
            <p className="text-gray-600 mb-8">
              {t('message', 'Thank you for verifying your email address. Your account is now active.')}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md mb-8">
              <p className="text-sm text-gray-600">
                {t('autoRedirect', 'You will be redirected to the login page in a few seconds...')}
              </p>
            </div>
            
            <button
              onClick={handleContinue}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
            >
              {t('button.continue', 'Continue')} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </main>

    </div>
  );
};

export default VerificationSuccess;