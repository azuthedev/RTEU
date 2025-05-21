import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, AlertCircle, Loader2, Mail, Lock, Phone, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { supabase } from '../lib/supabase';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import { useAnalytics } from '../hooks/useAnalytics';
import EmailValidator from '../components/EmailValidator';
import { sendOtpEmail } from '../utils/emailValidator';
import OTPVerificationModal from '../components/OTPVerificationModal';
import BookingReferenceInput from '../components/BookingReferenceInput';
import { validateBookingReference } from '../utils/bookingReferenceValidator';

const CustomerSignup = () => {
  const navigate = useNavigate();
  const { signUp, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const { trackEvent } = useAnalytics();
  const inviteCode = searchParams.get('invite');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteCode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [bookingReference, setBookingReference] = useState<string>('');
  const [bookingData, setBookingData] = useState<any>(null);
  const [userHasAccount, setUserHasAccount] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [emailVerified, setEmailVerified] = useState(false);

  // Define validation rules
  const validationRules = {
    name: [
      { required: true, message: 'Please enter your name' }
    ],
    password: [
      { required: true, message: 'Please enter a password' },
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
    handleBlur,
    touchedFields,
    resetForm
  } = useFormValidation(formData, validationRules);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check invite code validity when component mounts
  useEffect(() => {
    if (inviteCode) {
      checkInviteValidity(inviteCode);
    }
  }, [inviteCode]);

  // Set formTouched to true when any field is touched
  useEffect(() => {
    if (touchedFields.length > 0 && !formTouched) {
      setFormTouched(true);
    }
  }, [touchedFields, formTouched]);

  const checkInviteValidity = async (code: string) => {
    setInviteLoading(true);
    try {
      console.log('Checking invite code validity:', code);
      
      const { data, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('code', code)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error validating invite code:', error);
        setError('Invalid or expired invite code');
        return;
      }

      console.log('Invite details:', data);

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // Mark as expired
        const { error: updateError } = await supabase
          .from('invite_links')
          .update({ status: 'expired' })
          .eq('id', data.id);

        if (updateError) console.error('Error updating invite status:', updateError);
        
        setError('This invite link has expired');
        return;
      }

      setInviteDetails(data);
    } catch (error: any) {
      console.error('Error checking invite:', error);
      setError('Unable to validate invite code');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleValidBookingFound = async (data: any) => {
    // Set booking data
    setBookingData(data);
    
    // Set booking reference
    setBookingReference(data.booking_reference);
    
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.customer_email)
        .maybeSingle();
        
      const exists = !userError && userData !== null;
      setUserHasAccount(exists);
      
      if (exists) {
        // Track event - found existing account
        trackEvent('Authentication', 'Existing Account Found', 'Via Booking Reference');
      }
    }
    
    if (data.customer_phone) {
      setFormData(prev => ({
        ...prev,
        phone: data.customer_phone
      }));
    }
    
    // Track event
    trackEvent('Form', 'Booking Reference Auto-Fill', data.booking_reference);
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

  const handleEmailValidationChange = (isValid: boolean) => {
    setEmailValid(isValid);
    
    // Check if a user with this email exists when validation passes
    if (isValid && formData.email) {
      checkUserExists(formData.email);
    }
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
    } catch (error) {
      console.error('Error checking user existence:', error);
    }
  };

  const handleOtpVerified = () => {
    setEmailVerified(true);
    setShowOtpModal(false);
    trackEvent('Authentication', 'Email Verified');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate all fields before submitting
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      return;
    }

    // Require email verification
    if (!emailVerified) {
      setError('Please verify your email address first');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Debug logging
      console.log('Submitting with invite code:', inviteCode);
      console.log('Form data:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
      
      // Call signUp function with invite code
      const { error: signUpError, data: signupData } = await signUp(
        formData.email, 
        formData.password,
        formData.name,
        formData.phone,
        inviteCode || undefined
      );

      if (signUpError) {
        console.error('Signup error details:', signUpError);
        throw signUpError;
      }

      // If we have a booking reference, link the booking to the new user
      if (bookingReference && signupData?.user) {
        // Update the trip's user_id to link it to the new account
        const { error: updateError } = await supabase
          .from('trips')
          .update({ user_id: signupData.user.id })
          .eq('booking_reference', bookingReference);
        
        if (updateError) {
          console.error('Error linking booking to user:', updateError);
          // Don't fail the account creation just because linking failed
          // But we'll track it for monitoring
          trackEvent('Authentication', 'Booking Link Error', updateError.message);
        } else {
          trackEvent('Authentication', 'Booking Link Success', bookingReference);
        }
      }

      // Navigate to login with success message
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please sign in to continue.',
          ...(bookingReference ? { bookingReference } : {})
        } 
      });
    } catch (error: any) {
      console.error('Error during sign up:', error);
      setError(error.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGoToLogin = () => {
    trackEvent('Authentication', 'Redirect to Login', 'From Signup - Existing User');
    navigate('/login', { 
      state: { 
        bookingReference: bookingReference || undefined,
        email: formData.email 
      } 
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // Helper function to determine if the button should be disabled
  const isButtonDisabled = () => {
    // Only disable if the form has been touched and is invalid, or if submission is in progress
    return (formTouched && !isValid) || isSubmitting || !emailVerified;
  };

  if (loading || inviteLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header hideSignIn />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-8">
              <User className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-center mb-8">Create Account</h1>
            
            {inviteCode && (
              <div className="bg-blue-50 text-blue-600 p-3 rounded-md mb-6 text-sm">
                {inviteDetails ? (
                  <>
                    <p className="font-medium">Using invite code: {inviteCode}</p>
                    {inviteDetails.role && (
                      <p className="mt-1">You will be registered as: <span className="font-medium capitalize">{inviteDetails.role}</span></p>
                    )}
                    {inviteDetails.note && (
                      <p className="mt-1 text-gray-600">{inviteDetails.note}</p>
                    )}
                  </>
                ) : (
                  <p>Using invite code: {inviteCode}</p>
                )}
              </div>
            )}
            
            {bookingReference && bookingData && (
              <div className="bg-blue-50 text-blue-600 p-3 rounded-md mb-6 text-sm">
                <p className="font-medium">Using booking reference: {bookingReference}</p>
                <p className="mt-1">This booking will be linked to your new account.</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {!isValid && formTouched && (
              <div className="bg-yellow-50 text-yellow-600 p-3 rounded-md mb-6 text-sm">
                Please fill in all required fields correctly before submitting.
              </div>
            )}

            {/* Booking Reference Input - New component */}
            <BookingReferenceInput
              value={bookingReference}
              onChange={setBookingReference}
              onValidBookingFound={handleValidBookingFound}
              className="mb-6"
            />

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
              
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <EmailValidator
                value={formData.email}
                onChange={handleEmailChange}
                onValidationChange={handleEmailValidationChange}
                label="Email Address"
                id="email"
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
                id="name"
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('name')}
                required
                icon={<User className="h-5 w-5" />}
                error={errors.name}
                autoComplete="name"
              />

              <FormField
                id="phone"
                name="phone"
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                icon={<Phone className="h-5 w-5" />}
                helpText="Optional, but recommended for booking notifications"
                autoComplete="tel"
              />

              <div className="relative">
                <FormField
                  id="password"
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('password')}
                  required
                  icon={<Lock className="h-5 w-5" />}
                  error={errors.password}
                  autoComplete="new-password"
                  helpText="Must be at least 6 characters"
                  inputClassName="pr-10"
                  validateOnChange={true}
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative">
                <FormField
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                  icon={<Lock className="h-5 w-5" />}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  inputClassName="pr-10"
                  validateOnChange={true}
                />
                <button 
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isButtonDisabled() || userHasAccount}
                aria-busy={isSubmitting}
                className={`w-full py-3 rounded-md transition-all duration-300 flex justify-center items-center mt-6
                  ${(isButtonDisabled() || userHasAccount) 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign In
                </Link>
              </p>
            </div>

            {/* Back Link */}
            <div className="mt-8 text-center">
              <Link
                to="/"
                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center mt-6">
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Need Help? Contact Support
            </Link>
          </div>
        </div>
      </main>

      {/* OTP Verification Modal */}
      <OTPVerificationModal 
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        email={formData.email}
        verificationId={verificationId}
      />
    </div>
  );
};

export default CustomerSignup;