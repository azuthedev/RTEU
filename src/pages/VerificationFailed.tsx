import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { useAnalytics } from '../hooks/useAnalytics';

const VerificationFailed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  
  // Get error reason from URL
  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  
  let errorMessage = 'There was a problem verifying your email.';
  if (reason === 'expired') {
    errorMessage = 'The verification link has expired. Please request a new verification email.';
  } else if (reason === 'invalid') {
    errorMessage = 'The verification link is invalid or has already been used.';
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
            
            <h2 className="text-2xl font-semibold mb-4">Verification Failed</h2>
            <p className="text-gray-600 mb-8">
              {errorMessage}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleTryAgain}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </button>
              
              <button
                onClick={handleGoHome}
                className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                Go Home <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default VerificationFailed;