import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle, Loader2, Mail, Lock, Phone, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import FormField from './ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import EmailValidator from './EmailValidator';
import OTPVerificationModal from './OTPVerificationModal';
import { sendOtpEmail } from '../utils/emailValidator';
import BookingReferenceInput from './BookingReferenceInput';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  bookingReference: string;
  name?: string;
  phone?: string;
}

const SignUpModal = ({ isOpen, onClose, email, bookingReference, name = '', phone = '' }: SignUpModalProps) => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { trackEvent } = useAnalytics();
  const [formData, setFormData] = useState({
    email: email,
    name: name,
    phone: phone || '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [userHasAccount, setUserHasAccount] = useState(false);
  const [currentBookingReference, setCurrentBookingReference] = useState(bookingReference);
  const [bookingData, setBookingData] = useState<any>(null);

  // Define validation rules
  const validationRules = {
    email: [
      { required: true, message: 'Email is required' },
      { 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
        message: 'Please enter a valid email address' 
      }
    ],
    name: [
      { required: true, message: 'Name is required' }
    ],
    password: [
      { required: true, message: 'Password is required' },
      { 
        validate: (value) => value.length >= 6,
        message: 'Password must be at least 6 characters long' 
      }
    ],
    confirmPassword: [
      { required: true, message: 'Please confirm your password' },
      { 
        validate: (value) => value === formData.password,
        message: 'Passwords do not match' 
      }
    ]
  };

  const {
    errors,
    isValid,
    validateAllFields,
    handleBlur
  } = useFormValidation(formData, validationRules);

  // Reset the form when the modal is opened with new data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: email,
        name: name,
        phone: phone || '',
        password: '',
        confirmPassword: ''
      });
      setCurrentBookingReference(bookingReference);
      setError(null);
      setSuccess(false);
      setEmailVerified(false);
    }
  }, [isOpen, email, name, phone, bookingReference]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      email: value
    }));
    
    // Reset email verification if email changes
    if (value !== formData.email) {
      setEmailVerified(false);
      setUserHasAccount(false);
    }
  };

  const handleValidBookingFound = (data: any) => {
    setBookingData(data);
    
    // Pre-fill form with booking data
    if (data.customer_name) {
      setFormData(prev => ({
        ...prev,
        name: data.customer_name
      }));
    }
    
    if (data.customer_email) {
      setFormData(prev => ({
        ...prev,
        email: data.customer_email
      }));
      
      // Check if a user with this email exists
      checkUserExists(data.customer_email);
    }
    
    if (data.customer_phone) {
      setFormData(prev => ({
        ...prev,
        phone: data.customer_phone
      }));
    }
    
    // Track event
    trackEvent('Form', 'Booking Reference Auto-Fill in Modal', data.booking_reference);
  };

  const checkUserExists = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
        
      const exists = !error && data !== null;
      setUserHasAccount(exists);
      
      if (exists) {
        // Track event - found existing account
        trackEvent('Authentication', 'Existing Account Found', 'Via Modal');
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
    }
  };

  const handleEmailValidationChange = (isValid: boolean) => {
    setEmailValid(isValid);
    
    // Check if a user with this email exists when validation passes
    if (isValid && formData.email) {
      checkUserExists(formData.email);
    }
  };

  const sendVerificationCode = async () => {
    if (!emailValid) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      trackEvent('Authentication', 'Send OTP Attempt', formData.email);
      
      const result = await sendOtpEmail(formData.email, formData.name);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send verification code');
      }
      
      trackEvent('Authentication', 'Send OTP Success');
      
      // Store verification ID for later validation
      if (result.verificationId) {
        setVerificationId(result.verificationId);
        setShowOtpModal(true);
      } else {
        throw new Error('Missing verification ID');
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Failed to send verification code');
      trackEvent('Authentication', 'Send OTP Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerified = () => {
    setEmailVerified(true);
    setShowOtpModal(false);
    trackEvent('Authentication', 'Email Verified');
  };

  const handleGoToLogin = () => {
    onClose();
    navigate('/login', { 
      state: { 
        bookingReference: currentBookingReference || undefined,
        email: formData.email 
      } 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      return;
    }
    
    // Require email verification
    if (!emailVerified) {
      setError('Please verify your email address first');
      return;
    }

    setIsSubmitting(true);

    try {
      trackEvent('Authentication', 'Post-Booking Sign Up Attempt', currentBookingReference);

      // Call the signUp function
      const { error: signUpError, data } = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.phone
      );

      if (signUpError) {
        throw signUpError;
      }

      if (!data?.user) {
        throw new Error('User creation failed');
      }

      // Update trip to link to the new user
      const { error: updateError } = await supabase
        .from('trips')
        .update({ user_id: data.user.id })
        .eq('booking_reference', currentBookingReference);

      if (updateError) {
        console.error('Error linking booking to user:', updateError);
        // Don't fail the account creation just because link failed
      } else {
        console.log(`Successfully linked booking ${currentBookingReference} to user ${data.user.id}`);
      }

      // Track success
      trackEvent('Authentication', 'Post-Booking Sign Up Success', currentBookingReference);
      
      setSuccess(true);
      
      // After a brief delay, redirect to bookings page
      setTimeout(() => {
        onClose();
        navigate('/bookings');
      }, 2000);
    } catch (error: any) {
      console.error('Error during sign up:', error);
      setError(error.message || 'An unexpected error occurred');
      trackEvent('Authentication', 'Post-Booking Sign Up Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Create an Account</h2>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {success ? (
                    <div className="text-center py-8">
                      <div className="mb-4 flex justify-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">Account Created!</h3>
                      <p className="text-gray-600 mb-6">
                        Your account has been created successfully and linked to your booking.
                      </p>
                      <p className="text-sm text-gray-500">
                        Redirecting you to your bookings...
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-6">
                        Your booking was successful! Create an account to easily manage this booking and future ones.
                      </p>

                      {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-start">
                          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                          <p>{error}</p>
                        </div>
                      )}

                      {/* Booking Reference Display */}
                      {currentBookingReference && (
                        <div className="bg-blue-50 p-3 rounded-md mb-6">
                          <p className="text-blue-700 flex items-center">
                            <span className="font-medium">Booking Reference:</span>
                            <span className="font-mono ml-2">{currentBookingReference}</span>
                          </p>
                        </div>
                      )}

                      {/* Alternative Booking Reference Input */}
                      {!currentBookingReference && (
                        <BookingReferenceInput
                          value={currentBookingReference}
                          onChange={setCurrentBookingReference}
                          onValidBookingFound={handleValidBookingFound}
                          className="mb-6"
                        />
                      )}

                      {/* Show login button if user has an account */}
                      {userHasAccount && (
                        <div className="bg-blue-100 p-4 rounded-md mb-6">
                          <h3 className="font-semibold text-blue-800 mb-2">Account Found</h3>
                          <p className="text-blue-700 text-sm mb-4">
                            An account with this email already exists. Please sign in to link this booking to your account.
                          </p>
                          <button
                            type="button"
                            onClick={handleGoToLogin}
                            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          >
                            Sign In Instead
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <EmailValidator
                          value={formData.email}
                          onChange={handleEmailChange}
                          onValidationChange={handleEmailValidationChange}
                          label="Email Address"
                          id="modal-email"
                          name="email"
                          required={true}
                        />

                        {emailValid && !emailVerified && (
                          <div className="flex justify-end">
                            <button 
                              type="button"
                              onClick={sendVerificationCode}
                              disabled={isSubmitting || !emailValid}
                              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                'Verify Email'
                              )}
                            </button>
                          </div>
                        )}
                        
                        {emailVerified && (
                          <div className="bg-green-50 p-2 rounded-md flex items-center text-green-700 text-sm mb-2">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Email verified successfully
                          </div>
                        )}

                        <FormField
                          id="modal-name"
                          name="name"
                          label="Full Name"
                          value={formData.name}
                          onChange={handleInputChange}
                          onBlur={() => handleBlur('name')}
                          error={errors.name}
                          required
                          icon={<User className="h-5 w-5" />}
                          autoComplete="name"
                        />

                        <FormField
                          id="modal-phone"
                          name="phone"
                          label="Phone (Optional)"
                          value={formData.phone}
                          onChange={handleInputChange}
                          icon={<Phone className="h-5 w-5" />}
                          helpText="For booking notifications"
                          autoComplete="tel"
                        />

                        <div className="relative">
                          <FormField
                            id="modal-password"
                            name="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur('password')}
                            error={errors.password}
                            required
                            icon={<Lock className="h-5 w-5" />}
                            inputClassName="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>

                        <div className="relative">
                          <FormField
                            id="modal-confirm-password"
                            name="confirmPassword"
                            label="Confirm Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur('confirmPassword')}
                            error={errors.confirmPassword}
                            required
                            icon={<Lock className="h-5 w-5" />}
                            inputClassName="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !isValid || !emailVerified || userHasAccount}
                          className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center mt-4
                            ${isSubmitting || !isValid || !emailVerified || userHasAccount
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </button>
                      </form>

                      <div className="mt-6 text-center">
                        <button
                          onClick={onClose}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          I'll do this later
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

      {/* OTP Verification Modal */}
      <OTPVerificationModal 
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        email={formData.email}
        verificationId={verificationId}
      />
    </>
  );
};

export default SignUpModal;