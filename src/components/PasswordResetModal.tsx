import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Loader2, Mail, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import EmailValidator from './EmailValidator';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ 
  isOpen, 
  onClose,
  email = '' 
}) => {
  const [resetEmail, setResetEmail] = useState(email);
  const [emailValid, setEmailValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);
  
  const { requestPasswordReset } = useAuth();
  const { trackEvent } = useAnalytics();
  
  // Check if in development environment
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('local-credentialless') ||
                  window.location.hostname.includes('webcontainer');
    setIsDevEnvironment(isDev);
  }, []);
  
  // Reset state when modal opens with new email
  useEffect(() => {
    if (isOpen) {
      setResetEmail(email);
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen, email]);
  
  const handleEmailChange = (value: string) => {
    setResetEmail(value);
    setError(null);
  };
  
  const handleEmailValidationChange = (isValid: boolean) => {
    setEmailValid(isValid);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailValid || !resetEmail) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      trackEvent('Authentication', 'Password Reset Request', resetEmail);
      
      const result = await requestPasswordReset(resetEmail);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send password reset email');
      }
      
      setSuccess(true);
      trackEvent('Authentication', 'Password Reset Email Sent');
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        onClose();
      }, 5000);
    } catch (error: any) {
      console.error('Error requesting password reset:', error);
      
      // In development mode, show success anyway for testing
      if (isDevEnvironment) {
        console.log('DEVELOPMENT MODE: Showing success despite error:', error.message);
        setSuccess(true);
        return;
      }
      
      setError(error.message || 'Failed to send password reset email');
      trackEvent('Authentication', 'Password Reset Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[300] backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Reset Password</h2>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {isDevEnvironment && (
                  <div className="mb-4 bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p className="text-amber-800 text-sm">
                      <strong>Development Mode:</strong> Password reset emails will be simulated.
                    </p>
                  </div>
                )}
                
                {success ? (
                  <div className="text-center py-6">
                    <div className="mb-4 flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Reset Link Sent!</h3>
                    <p className="text-gray-600 mb-6">
                      We've sent a password reset link to <strong>{resetEmail}</strong>. 
                      Please check your inbox and follow the instructions to reset your password.
                    </p>
                    <p className="text-sm text-gray-500">
                      This window will close automatically in a few seconds.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <p className="text-gray-600 mb-6">
                      Enter your email address below and we'll send you a link to reset your password.
                    </p>
                    
                    <EmailValidator
                      value={resetEmail}
                      onChange={handleEmailChange}
                      onValidationChange={handleEmailValidationChange}
                      name="reset-email"
                      id="reset-email"
                      required={true}
                      label="Email Address"
                    />
                    
                    {error && (
                      <div className="mt-4 bg-red-50 text-red-600 p-3 rounded-md flex items-start">
                        <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || !emailValid}
                      className={`w-full mt-6 py-3 rounded-md transition-all duration-300 flex items-center justify-center
                        ${isSubmitting || !emailValid
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5 mr-2" />
                          Send Reset Link
                        </>
                      )}
                    </button>
                    
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PasswordResetModal;