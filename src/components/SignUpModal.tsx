import React, { useState } from 'react';
import { X, User, Mail, Lock, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import FormField from './ui/form-field';
import useFormValidation from '../hooks/useFormValidation';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      return;
    }

    setIsSubmitting(true);

    try {
      trackEvent('Authentication', 'Post-Booking Sign Up Attempt', bookingReference);

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
        .eq('booking_reference', bookingReference);

      if (updateError) {
        console.error('Error linking booking to user:', updateError);
        // Don't fail the account creation just because link failed
      } else {
        console.log(`Successfully linked booking ${bookingReference} to user ${data.user.id}`);
      }

      // Track success
      trackEvent('Authentication', 'Post-Booking Sign Up Success', bookingReference);
      
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

                    <div className="bg-blue-50 p-3 rounded-md mb-6">
                      <p className="text-blue-700 flex items-center">
                        <span className="font-medium">Booking Reference:</span>
                        <span className="font-mono ml-2">{bookingReference}</span>
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <FormField
                        id="modal-email"
                        name="email"
                        label="Email Address"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('email')}
                        error={errors.email}
                        required
                        icon={<Mail className="h-5 w-5" />}
                        autoComplete="email"
                      />

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
                        disabled={isSubmitting || !isValid}
                        className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center mt-4
                          ${isSubmitting || !isValid
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
  );
};

export default SignUpModal;