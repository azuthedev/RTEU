import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';
import { verifyOtp } from '../utils/emailValidator';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
  verificationId: string;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  email,
  verificationId
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 character OTP
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const otpRefs = Array(6).fill(0).map(() => useRef<HTMLInputElement>(null));
  const { trackEvent } = useAnalytics();

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
      
      // Call the verification function
      const result = await verifyOtp(otpString, verificationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to verify code');
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
      setError(err.message || 'Failed to verify OTP. Please try again.');
      trackEvent('Authentication', 'OTP Verification Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    setIsResending(true);
    setError(null);

    try {
      trackEvent('Authentication', 'OTP Resend');

      // Call the Edge Function to send a new OTP
      const { data, error: functionError } = await supabase.functions.invoke('email-verification', {
        body: { 
          action: 'send-otp', 
          email
        }
      });

      if (functionError || !data.success) {
        throw new Error(functionError?.message || data?.error || 'Failed to resend verification code');
      }

      // Update the verification ID
      if (data.verificationId) {
        // Reset the timer
        setTimeLeft(15 * 60);
      }
      
      // Show success message
      setError('Verification code sent! Please check your email.');
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
                      <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                      <p className="text-gray-600">
                        We sent a verification code to <span className="font-semibold">{email}</span>. 
                        Please enter the code below to verify your email.
                      </p>
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
                        ) : 'Resend code'}
                      </button>
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