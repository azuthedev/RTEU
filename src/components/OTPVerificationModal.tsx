import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, MailQuestion, RefreshCw, ExternalLink, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';
import { verifyOtp, sendOtpEmail } from '../utils/emailValidator';

// Define this constant at the top level before it's used
const OTP_EXPIRY_MINUTES = 15;

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
  verificationId: string;
  emailSent?: boolean;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  email,
  verificationId,
  emailSent = false
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']); // 6 character OTP
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_MINUTES * 60); // 15 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const [showSpamWarning, setShowSpamWarning] = useState(emailSent);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const otpRefs = Array(6).fill(0).map(() => useRef<HTMLInputElement>(null));
  const { trackEvent } = useAnalytics();
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);
  
  // Check if in development environment
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname.includes('local-credentialless') ||
                window.location.hostname.includes('webcontainer');
    setIsDevEnvironment(isDev);
    
    if (isDev) {
      console.log('DEVELOPMENT MODE: OTP for testing:', verificationId);
      if (verificationId.startsWith('dev-')) {
        console.log('DEVELOPMENT MODE: Any 6-character code will be accepted');
      }
    }
  }, [verificationId]);

  // Handle OTP timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Format timer as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle input change
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    
    // Only allow alphanumeric characters
    if (!/^[a-zA-Z0-9]$/.test(value) && value !== '') {
      return;
    }
    
    // Update OTP array
    const newOtp = [...otp];
    newOtp[index] = value.toLowerCase();
    setOtp(newOtp);
    
    // Auto-focus next input if this one is filled
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // If backspace is pressed and current field is empty, focus previous field
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\s/g, '');
    
    // Only process if we have exactly 6 characters
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('').map(char => char.toLowerCase());
      setOtp(newOtp);
      
      // Focus the last input
      otpRefs[5].current?.focus();
    }
  };

  // Verify OTP
  const verifyOtpCode = async () => {
    // Check if OTP is complete
    if (otp.some(char => !char)) {
      setError('Please enter all 6 characters of the verification code');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      trackEvent('Authentication', 'OTP Verification Attempt');

      const otpString = otp.join('');
      
      // In development environment, show verification code for testing
      if (isDevEnvironment) {
        console.log('DEVELOPMENT MODE: Verifying OTP:', otpString);
        console.log('DEVELOPMENT MODE: Verification ID:', verificationId);
      }
      
      // Call the verification function
      const result = await verifyOtp(otpString, verificationId);

      if (!result.success) {
        if (result.error?.includes('expired')) {
          throw new Error('This verification code has expired. Please request a new code.');
        }
        throw new Error(result.error || 'Invalid verification code. Please try again or request a new code.');
      }

      // If verification was successful
      setSuccess(true);
      trackEvent('Authentication', 'OTP Verification Success');
      
      // Call onVerified after a short delay to show the success state
      setTimeout(() => {
        onVerified();
      }, 1500);
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      
      // In development, allow any 6-character code
      if (isDevEnvironment && otp.length === 6 && otp.every(char => char)) {
        console.log('DEVELOPMENT MODE: Accepting any OTP for testing');
        setSuccess(true);
        trackEvent('Authentication', 'OTP Verification Dev Success');
        
        setTimeout(() => {
          onVerified();
        }, 1500);
        return;
      }
      
      setError(err.message || 'Failed to verify OTP. Please try again.');
      
      // Show spam warning after first failure
      if (!showSpamWarning) {
        setShowSpamWarning(true);
      }
      
      trackEvent('Authentication', 'OTP Verification Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    setIsResending(true);
    setError(null);
    setShowSpamWarning(true); // Always show spam warning when resending

    try {
      trackEvent('Authentication', 'OTP Resend');

      // Send new OTP email through updated function
      const result = await sendOtpEmail(email, '');
      
      if (!result.success) {
        if (result.remainingAttempts !== undefined && result.remainingAttempts === 0) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(result.error || 'Failed to resend verification code');
      }

      // Update the verification ID if provided
      if (result.verificationId) {
        // Display new verification ID
        const newVerificationId = result.verificationId;
        console.log(`New verification ID: ${newVerificationId}`);
        
        // Reset the timer
        setTimeLeft(OTP_EXPIRY_MINUTES * 60);
        
        // Update remaining attempts if provided
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
      }
      
      // Show success message
      setError(null);
      
      // Track successful resend
      trackEvent('Authentication', 'OTP Resend Success');
      
      // Show confirmation message
      setShowSpamWarning(true);
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      setError(err.message || 'Failed to resend verification code. Please try again.');
      trackEvent('Authentication', 'OTP Resend Error', err.message);
    } finally {
      setIsResending(false);
    }
  };

  // Focus the first input when modal opens
  useEffect(() => {
    if (isOpen && otpRefs[0].current) {
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[400] backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[401] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
              <div className="relative p-6">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-6">
                  {success ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
                      <p className="text-gray-600">
                        Your email has been successfully verified.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex justify-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                      <p className="text-gray-600">
                        We sent a verification code to <span className="font-semibold">{email}</span>. 
                        Please enter the code below to verify your email.
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        A verification link was also sent to your email that you can use later if needed.
                      </p>
                      
                      {isDevEnvironment && (
                        <div className="mt-3 p-2 bg-amber-50 text-amber-700 text-sm rounded-md">
                          <p className="font-medium">Development Mode Active</p>
                          <p className="mt-1">Any 6-character code will be accepted for testing.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!success && (
                  <>
                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 flex items-start">
                        <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}
                    
                    {showSpamWarning && (
                      <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md mb-6 flex items-start">
                        <MailQuestion className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Don't see the email?</p>
                          <p className="text-sm mt-1">Please check your spam/junk folder. The email should arrive within 2 minutes.</p>
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <div className="flex justify-between mb-4">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={otpRefs[index]}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            className="w-12 h-14 border border-gray-300 rounded-md text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                            autoComplete="off"
                          />
                        ))}
                      </div>

                      <div className="text-center text-sm text-gray-500 mb-4">
                        <p>Code expires in <span className="font-semibold">{formatTime(timeLeft)}</span></p>
                        
                        {remainingAttempts !== null && (
                          <p className="mt-1 text-xs">
                            You have {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
                          </p>
                        )}
                      </div>

                      <button
                        onClick={verifyOtpCode}
                        disabled={isSubmitting || otp.some(digit => !digit)}
                        className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center
                          ${isSubmitting || otp.some(digit => !digit)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : 'Verify'}
                      </button>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-2">
                        Didn't receive a code or code expired?
                      </p>
                      <button
                        onClick={resendOtp}
                        disabled={isResending || timeLeft > 14 * 60} // Disable for first minute
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Resend verification email
                          </>
                        )}
                      </button>
                      
                      <p className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Check your email for a verification link
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OTPVerificationModal;
