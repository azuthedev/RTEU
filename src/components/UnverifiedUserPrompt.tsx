import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, RefreshCw, ArrowRight, LogOut, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import OTPVerificationModal from './OTPVerificationModal';
import Header from './Header';

interface UnverifiedUserPromptProps {
  email: string;
  redirectUrl?: string;
}

const UnverifiedUserPrompt = ({ email, redirectUrl = '/' }: UnverifiedUserPromptProps) => {
  const { sendVerificationEmail, signOut, refreshSession } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  
  const handleResendVerification = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    
    try {
      trackEvent('Authentication', 'Resend Verification Email', 'From Protected Route');
      
      // Send verification email
      const result = await sendVerificationEmail(email);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send verification email');
      }
      
      setVerificationId(result.verificationId || '');
      setShowOtpModal(true);
      setSuccess('Verification email sent! Please check your inbox.');
      
      // Track success
      trackEvent('Authentication', 'Resend Verification Success');
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      setError(err.message || 'Failed to send verification email');
      
      trackEvent('Authentication', 'Resend Verification Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerificationComplete = async () => {
    setShowOtpModal(false);
    setSuccess('Email verified successfully! Redirecting...');
    
    // Track verification success
    trackEvent('Authentication', 'Email Verification Success', 'From Protected Route');
    
    // Refresh session to update claims
    await refreshSession();
    
    // Short delay before redirecting
    setTimeout(() => {
      navigate(redirectUrl);
      // Reload the page to ensure fresh state
      window.location.reload();
    }, 1500);
  };
  
  const handleLogout = async () => {
    trackEvent('Authentication', 'Logout', 'From Verification Prompt');
    await signOut();
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
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center mb-4">Email Verification Required</h2>
            <p className="text-gray-600 mb-8 text-center">
              Please verify your email address to access this page. 
              We've sent a verification email to <strong>{email}</strong>.
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md text-sm">
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-md text-sm">
                <p className="font-medium">Success</p>
                <p>{success}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </button>
              
              <div className="flex space-x-4">
                <button
                  onClick={handleLogout}
                  className="w-1/2 border border-gray-300 text-gray-600 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="w-1/2 border border-blue-600 text-blue-600 py-3 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Go Home
                </button>
              </div>
            </div>
            
            <div className="mt-8 border-t pt-6 text-sm text-gray-500">
              <p className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Check your spam folder if you don't see the email.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      
      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleVerificationComplete}
        email={email}
        verificationId={verificationId}
        emailSent={true}
      />
    </div>
  );
};

export default UnverifiedUserPrompt;