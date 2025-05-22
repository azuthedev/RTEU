import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';

const VerifyEmail = () => {
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [redirectTo, setRedirectTo] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent, setUserId } = useAnalytics();
  const { user, signIn } = useAuth();

  useEffect(() => {
    const verifyEmailToken = async () => {
      try {
        // Get the token from the URL
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const redirect = searchParams.get('redirect') || '/';
        
        if (!token) {
          setVerificationStatus('error');
          setErrorMessage('Missing verification token');
          trackEvent('Authentication', 'Email Verification Failed', 'Missing Token');
          return;
        }

        setRedirectTo(redirect);

        // Call the Edge Function to verify the token
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-verification/verify?token=${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to verify email');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Verification failed');
        }

        setVerificationStatus('success');
        trackEvent('Authentication', 'Email Verification Success', 'Magic Link');
        
        // If we have user data and credentials, sign the user in
        if (data.userId && data.email) {
          setUserId(data.userId);
        }

      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('error');
        setErrorMessage(error.message || 'Failed to verify your email. The link may have expired.');
        trackEvent('Authentication', 'Email Verification Failed', error.message);
      }
    };

    verifyEmailToken();
  }, [location.search, trackEvent, navigate, setUserId, signIn]);

  const handleContinue = () => {
    if (redirectTo) {
      navigate(redirectTo);
    } else {
      navigate('/');
    }
  };

  const handleTryAgain = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-md mx-auto px-4">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {verificationStatus === 'loading' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Verifying Your Email</h2>
                <p className="text-gray-600">
                  Please wait while we verify your email address...
                </p>
              </div>
            )}
            
            {verificationStatus === 'success' && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold mb-4">Email Verified!</h2>
                <p className="text-gray-600 mb-8">
                  Thank you for verifying your email address. Your account is now active.
                </p>
                <button
                  onClick={handleContinue}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            )}
            
            {verificationStatus === 'error' && (
              <div className="text-center py-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold mb-4">Verification Failed</h2>
                <p className="text-gray-600 mb-8">
                  {errorMessage || 'There was a problem verifying your email. The verification link may have expired or already been used.'}
                </p>
                <button
                  onClick={handleTryAgain}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
                >
                  Try Again <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default VerifyEmail;