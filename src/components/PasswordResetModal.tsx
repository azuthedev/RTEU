import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Mail, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import EmailValidator from './EmailValidator';
import { normalizeEmail } from '../utils/emailNormalizer';

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
  const [rateLimited, setRateLimited] = useState(false);
  const [nextAllowedTime, setNextAllowedTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  
  const { requestPasswordReset } = useAuth();
  const { trackEvent } = useAnalytics();
  
  // Reset state when modal is opened with new data
  useEffect(() => {
    if (isOpen) {
      setResetEmail(email);
      setError(null);
      setSuccess(false);
      setRateLimited(false);
      setNextAllowedTime(null);
      
      // Auto-validate pre-filled email
      if (email) {
        validatePrefilledEmail(email);
      }
    }
  }, [isOpen, email]);
  
  // Update time remaining display
  useEffect(() => {
    if (!rateLimited || !nextAllowedTime) {
      return;
    }
    
    // Initial calculation
    updateTimeRemaining();
    
    // Update every minute
    const interval = setInterval(() => {
      updateTimeRemaining();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [rateLimited, nextAllowedTime]);
  
  // Update the time remaining display
  const updateTimeRemaining = () => {
    if (!nextAllowedTime) {
      setTimeRemaining(null);
      return;
    }
    
    const now = new Date();
    
    // If we've reached the time, clear rate limiting
    if (nextAllowedTime <= now) {
      setRateLimited(false);
      setNextAllowedTime(null);
      setTimeRemaining(null);
      return;
    }
    
    // Otherwise, format the time remaining
    try {
      const timeString = formatDistanceToNow(nextAllowedTime, { addSuffix: true });
      setTimeRemaining(timeString);
    } catch (e) {
      console.error('Error formatting time:', e);
      setTimeRemaining('soon');
    }
  };
  
  // Validate pre-filled email when the modal opens
  const validatePrefilledEmail = async (emailToValidate: string) => {
    if (emailToValidate) {
      try {
        // Basic format check first
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToValidate)) {
          setEmailValid(true);
        }
      } catch (error) {
        console.error('Error validating prefilled email:', error);
        // Default to valid in case of error to avoid blocking legitimate reset attempts
        setEmailValid(true);
      }
    }
  };
  
  const handleEmailChange = (value: string) => {
    setResetEmail(value);
    setError(null);
    
    // Clear rate limit if user changes email
    if (value !== resetEmail) {
      setRateLimited(false);
      setNextAllowedTime(null);
    }
  };
  
  const handleEmailValidationChange = (isValid: boolean) => {
    setEmailValid(isValid);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // If email is empty or explicitly invalid, show error
    if (!resetEmail || (resetEmail && !emailValid)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Check if rate limited
    if (rateLimited) {
      setError(`Too many reset attempts. Please try again ${timeRemaining || 'later'}.`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log(`[PasswordResetModal] Submitting reset request for email: "${resetEmail}"`);
      trackEvent('Authentication', 'Password Reset Request', resetEmail);
      
      // Ensure email is properly formatted and not URL-encoded
      const normalizedEmail = normalizeEmail(resetEmail);
      console.log(`[PasswordResetModal] Normalized email: "${normalizedEmail}"`);
      
      const result = await requestPasswordReset(normalizedEmail);
      
      console.log(`[PasswordResetModal] Reset request result:`, result);
      
      // Check for rate limiting
      if (result.rateLimitExceeded) {
        setRateLimited(true);
        
        // Set next allowed time if provided
        if (result.nextAllowedAttempt) {
          setNextAllowedTime(new Date(result.nextAllowedAttempt));
          updateTimeRemaining();
        }
        
        setError('Too many password reset attempts. Please try again later.');
        return;
      }
      
      if (!result.success) {
        console.error(`[PasswordResetModal] Error from requestPasswordReset:`, result.error);
        throw new Error(result.error || 'Failed to send verification email');
      }
      
      // Always show success message to prevent user enumeration
      setSuccess(true);
      trackEvent('Authentication', 'Password Reset Request Completed');
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        onClose();
      }, 5000);
    } catch (error: any) {
      console.error('[PasswordResetModal] Error requesting password reset:', error);
      
      // Display user-friendly error message
      if (error.message && error.message.includes('No account found')) {
        setError(error.message || 'No account found with this email address. Please sign up first.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
      
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
                
                {success ? (
                  <div className="text-center py-6">
                    <div className="mb-4 flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Check Your Email</h3>
                    <p className="text-gray-600 mb-6">
                      If an account with that email exists, a password reset link has been sent to your inbox. 
                      The link will expire in 1 hour.
                    </p>
                    <p className="text-sm text-gray-500">
                      This window will close automatically in a few seconds.
                    </p>
                  </div>
                ) : rateLimited ? (
                  <div className="text-center py-6">
                    <div className="mb-4 flex justify-center">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="w-10 h-10 text-amber-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">Too Many Attempts</h3>
                    <p className="text-gray-600 mb-6">
                      You've made too many password reset requests. For security reasons, please wait 
                      {timeRemaining ? ` until ${timeRemaining}` : ' and try again later'}.
                    </p>
                    <button
                      onClick={onClose}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <p className="text-gray-600 mb-6">
                      Enter your email address below and we'll send you a secure link to reset your password.
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
                      className="w-full mt-6 py-3 rounded-md transition-all duration-300 flex items-center justify-center
                        bg-blue-600 text-white hover:bg-blue-700"
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

// Helper function to format time distance
function formatDistanceToNow(date: Date, options: { addSuffix: boolean }): string {
  const now = new Date();
  const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `in ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;
  
  if (minutes === 0) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `in ${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export default PasswordResetModal;