import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, AlertCircle, Loader2, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import { useAnalytics } from '../hooks/useAnalytics';
import EmailValidator from '../components/EmailValidator';
import OTPVerificationModal from '../components/OTPVerificationModal';
import BookingReferenceInput from '../components/BookingReferenceInput';
import { sendOtpEmail } from '../utils/emailValidator';
import { supabase } from '../lib/supabase';

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
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);

  // Check if in development environment
  useEffect(() => {
    // Check if we're in a development environment
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('local-credentialless') ||
                  window.location.hostname.includes('webcontainer');
    setIsDevEnvironment(isDev);
  }, []);

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
      
      // Try to fetch invite details
      try {
        const { data, error } = await supabase
          .from('invite_links')
          .select('*')
          .eq('code', code)
          .eq('status', 'active')
          .single();

        if (error) {
          console.error('Error validating invite code:', error);
          throw new Error('Invalid or expired invite code');
        }

        console.log('Invite details:', data);

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          // Mark as expired
          try {
            const { error: updateError } = await supabase
              .from('invite_links')
              .update({ status: 'expired' })
              .eq('id', data.id);

            if (updateError) console.error('Error updating invite status:', updateError);
          } catch (updateErr) {
            console.error('Failed to update invite status:', updateErr);
          }
          
          throw new Error('This invite link has expired');
        }

        setInviteDetails(data);
      } catch (err) {
        if (isDevEnvironment) {
          // In development, create mock invite details for testing
          console.log('DEVELOPMENT MODE: Using mock invite details for code:', code);
          setInviteDetails({
            id: 'dev-' + Date.now(),
            code: code,
            role: 'customer',
            note: 'Development mock invite - no database connection required'
          });
        } else {
          throw err;
        }
      }
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
      
      await checkUserExists(data.customer_email);
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
    
    // Reset verification state if email changes
    if (value !== formData.email) {
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
      let exists = false;

      // Try checking via Supabase query
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
          
        exists = !error && data !== null;
      } catch (err) {
        console.warn('Failed to check user existence via API, using development fallback:', err);
        
        // In development environment, assume user doesn't exist for testing purposes
        if (isDevEnvironment) {
          // Special test cases to simulate existing users in development
          const testEmails = ['test@example.com', 'existing@user.com', 'admin@example.com'];
          exists = testEmails.includes(email.toLowerCase());
          console.log(`DEVELOPMENT MODE: User existence check for ${email}: ${exists ? 'User exists' : 'User does not exist'}`);
        }
      }

      setUserHasAccount(exists);
      
      if (exists) {
        // Track event - found existing account
        trackEvent('Authentication', 'Existing Account Found', 'Via Email Check');
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
      // Default to not existing in case of error
      setUserHasAccount(false);
    }
  };

  const handleOtpVerified = () => {
    setShowOtpModal(false);
    trackEvent('Authentication', 'Email Verified');
    
    // Continue with signup now that email is verified
    completeSignup();
  };

  const sendVerificationCode = async () => {
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
      
      return true;
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      setError(err.message || 'Failed to send verification code');
      trackEvent('Authentication', 'Send OTP Error', err.message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
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

  const completeSignup = async () => {
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
        
        if (isDevEnvironment) {
          // In development, show a specific message but allow proceeding for testing
          console.log('DEVELOPMENT MODE: Signup would fail in production but continuing for testing');
          
          // Navigate to login with success message
          navigate('/login', { 
            state: { 
              message: 'DEVELOPMENT: Registration successful! Your email has been verified. Please sign in to continue.',
              ...(bookingReference ? { bookingReference } : {})
            } 
          });
          return;
        }
        
        throw signUpError;
      }

      // If we have a booking reference and user was created, link the booking to the user
      if (bookingReference && signupData?.user) {
        // Update the trip's user_id to link it to the new account
        try {
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
        } catch (linkErr) {
          console.error('Failed to link booking:', linkErr);
          // Non-critical error, continue with signup
        }
      }

      // Navigate to login with success message
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Your email has been verified. Please sign in to continue.',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate all fields before submitting
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      return;
    }

    // If email is not valid, show error
    if (!emailValid) {
      setError('Please enter a valid email address');
      return;
    }

    // If user has existing account, prompt them to sign in
    if (userHasAccount) {
      setError('An account with this email already exists. Please sign in instead.');
      return;
    }

    // Initiate the OTP verification flow
    const otpSent = await sendVerificationCode();
    if (!otpSent) {
      // Error already set by sendVerificationCode
      return;
    }
    
    // Show OTP modal - the rest of the signup process will continue after verification
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    return (formTouched && !isValid) || isSubmitting || userHasAccount;
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
            
            {isDevEnvironment && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md mb-6 text-sm">
                <p className="font-medium">Development Mode Active</p>
                <p className="mt-1">Email verification will be sent via direct webhook to n8n.capohq.com.</p>
              </div>
            )}
            
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
                  error={errors.password}
                  required
                  icon={<Lock className="h-5 w-5" />}
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
                  error={errors.confirmPassword}
                  required
                  icon={<Lock className="h-5 w-5" />}
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
                disabled={isButtonDisabled()}
                aria-busy={isSubmitting}
                className={`w-full py-3 rounded-md transition-all duration-300 flex justify-center items-center mt-6
                  ${isButtonDisabled() 
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
              
              {/* Error message moved below the button for better visibility */}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mt-3 text-sm flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
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