import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

import Header from '../components/Header';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToast } from '../components/ui/use-toast';
import EmailValidator from '../components/EmailValidator';
import OTPVerificationModal from '../components/OTPVerificationModal';
import { useLanguage } from '../contexts/LanguageContext';

const CustomerSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signUp } = useAuth();
  const { trackEvent } = useAnalytics();
  const { toast } = useToast();
  const { t, isLoading: translationsLoading } = useLanguage();

  // Check for invite code in URL
  const inviteCode = searchParams.get('invite');
  
  // Check for prefilled data from state
  const locationState = location.state as any;
  
  const [formData, setFormData] = useState({
    name: locationState?.prefillName || '',
    email: locationState?.prefillEmail || '',
    phone: locationState?.prefillPhone || '',
    password: '',
    confirmPassword: ''
  });

  const [bookingReference, setBookingReference] = useState(locationState?.bookingReference || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  
  // State for OTP verification
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  
  // Check if we have an invite code and fetch invite data
  const [isValidatingInvite, setIsValidatingInvite] = useState(inviteCode ? true : false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  
  // Fetch invite data if we have an invite code
  useEffect(() => {
    if (!inviteCode) {
      setIsValidatingInvite(false);
      return;
    }
    
    const validateInvite = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invite?code=${inviteCode}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          setInviteError(data.error || t('errors.invalidInvite', 'Invalid or expired invite code'));
          toast({
            title: t('toast.invalidInvite.title', "Invalid Invite"),
            description: data.error || t('toast.invalidInvite.message', "This invite link is invalid or has expired."),
            variant: "destructive"
          });
        } else {
          setInviteData(data);
          
          // Pre-fill form if we have partner data
          if (data.partnerData) {
            setFormData(prev => ({
              ...prev,
              name: data.partnerData.name || prev.name,
              email: data.partnerData.email || prev.email,
              phone: data.partnerData.phone || prev.phone
            }));
          }
        }
      } catch (error) {
        console.error('Error validating invite:', error);
        setInviteError(t('errors.validateInvite', 'Failed to validate invite. Please try again later.'));
        toast({
          title: t('toast.validationError.title', "Validation Error"),
          description: t('toast.validationError.message', "Failed to validate your invite code. Please try again later."),
          variant: "destructive"
        });
      } finally {
        setIsValidatingInvite(false);
      }
    };
    
    validateInvite();
  }, [inviteCode, toast, t]);

  // Define validation rules
  const validationRules = {
    name: [
      { required: true, message: t('validation.nameRequired', 'Name is required') }
    ],
    password: [
      { required: true, message: t('validation.passwordRequired', 'Password is required') },
      { validate: (value) => value.length >= 6, message: t('validation.passwordLength', 'Password must be at least 6 characters long') }
    ],
    confirmPassword: [
      { required: true, message: t('validation.confirmRequired', 'Please confirm your password') },
      { validate: (value) => value === formData.password, message: t('validation.passwordsMatch', 'Passwords do not match') }
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

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      email: value
    }));
  };

  const handleEmailValidationChange = (isValid: boolean) => {
    setEmailValid(isValid);
  };

  const sendVerificationEmail = async (): Promise<{ success: boolean, verificationId?: string }> => {
    try {
      const { name, email } = formData;
      
      // Validate email before sending
      if (!email || !emailValid) {
        setError(t('errors.invalidEmail', 'Please provide a valid email address'));
        return { success: false };
      }
      
      // Use the API to send an OTP verification code
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'X-Auth': import.meta.env.VITE_WEBHOOK_SECRET || ''
        },
        body: JSON.stringify({
          email,
          name,
          action: 'send-otp'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('errors.verificationFailed', 'Failed to send verification email'));
      }
      
      return {
        success: true,
        verificationId: result.verificationId
      };
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      setError(err.message || t('errors.sendVerificationFailed', 'Failed to send verification email'));
      return { success: false };
    }
  };

  const handleOtpVerified = () => {
    // Close OTP modal
    setShowOtpModal(false);
    
    // Continue with signup
    completeSignup();
  };

  const completeSignup = async () => {
    try {
      setIsSubmitting(true);
      
      // Determine the appropriate role
      // If inviteData exists and has a role, use that, otherwise default to 'customer'
      const userRole = inviteData?.role || 'customer';
      
      // Call the signUp function
      const { error: signUpError, data } = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.phone,
        inviteCode || undefined
      );

      if (signUpError) {
        throw signUpError;
      }

      if (!data?.user) {
        throw new Error(t('errors.userCreationFailed', 'User creation failed'));
      }

      // If we have an invite code and a user, mark the invite as used
      if (inviteCode && data.user.id) {
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              code: inviteCode,
              userId: data.user.id
            })
          });
          
          if (!response.ok) {
            console.error('Error marking invite as used:', await response.text());
            // Don't fail the signup if this part fails
          }
        } catch (err) {
          console.error('Error marking invite as used:', err);
          // Don't fail the signup if this part fails
        }
      }

      // If we have a booking reference, update the booking
      if (bookingReference) {
        try {
          const { error: updateError } = await supabase
            .from('trips')
            .update({ user_id: data.user.id })
            .eq('booking_reference', bookingReference);

          if (updateError) {
            console.error('Error linking booking to user:', updateError);
          }
        } catch (err) {
          console.error('Error linking booking to user:', err);
          // Don't fail the signup if this part fails
        }
      }

      // Track success
      trackEvent('Authentication', 'Sign Up Success', userRole);
      
      setSuccess(true);
      
      // Display success toast
      toast({
        title: t('toast.accountCreated.title', "Account Created"),
        description: t('toast.accountCreated.message', "Your account has been created successfully!"),
        variant: "default"
      });
      
      // Redirect after a brief delay
      setTimeout(() => {
        if (inviteData?.role === 'partner') {
          // Partner users go to their profile
          navigate('/profile');
        } else if (bookingReference) {
          // Users with bookings go to bookings
          navigate('/bookings');
        } else {
          // Everyone else goes to home
          navigate('/');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error during sign up:', error);
      setError(error.message || t('errors.unexpectedError', 'An unexpected error occurred'));
      trackEvent('Authentication', 'Sign Up Error', error.message);
      
      toast({
        title: t('toast.signupFailed.title', "Signup Failed"),
        description: error.message || t('toast.signupFailed.message', "An error occurred during signup."),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      return;
    }
    
    // Check if email is valid
    if (!emailValid) {
      setError(t('errors.invalidEmail', 'Please enter a valid email address'));
      return;
    }
    
    // If using an invite link for partner registration, the email is already verified
    if (inviteData?.role === 'partner' && inviteData?.partnerData?.email === formData.email) {
      // Skip email verification for partner invites - email was already verified during application
      completeSignup();
      return;
    }
    
    // For normal signups, verify email with OTP
    const verificationResult = await sendVerificationEmail();
    
    if (verificationResult.success && verificationResult.verificationId) {
      setVerificationId(verificationResult.verificationId);
      setShowOtpModal(true);
    }
  };

  if (isValidatingInvite || translationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-28 pb-16">
          <div className="max-w-md mx-auto px-4">
            <div className="flex justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <p className="text-center text-gray-600">{t('loading.validatingInvite', 'Validating your invite code...')}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{inviteData?.role === 'partner' ? t('meta.titlePartner', 'Partner Registration') : t('meta.title', 'Create Account')} | Royal Transfer EU</title>
        <meta name="description" content={
          inviteData?.role === 'partner' 
            ? t('meta.descriptionPartner', 'Complete your partner registration with Royal Transfer EU') 
            : t('meta.description', 'Sign up for a Royal Transfer EU account to manage your bookings and get exclusive offers')
        } />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <Header hideSignIn />
      
      <main className="pt-28 pb-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center mb-8">
            <Link 
              to="/"
              className="flex items-center text-gray-500 hover:text-gray-700 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              <span>{t('backToHome', 'Back to Home')}</span>
            </Link>
          </div>
          
          {/* Check for invite error first */}
          {inviteError ? (
            <motion.div 
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold mb-4">{t('inviteError.title', 'Invalid Invite Code')}</h1>
                <p className="text-gray-600 mb-6">
                  {inviteError}
                </p>
                <p className="text-gray-600">
                  {t('inviteError.message', 'If you believe this is an error, please contact our support team.')}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/customer-signup"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
                  >
                    {t('inviteError.signUp', 'Sign Up Without Invite')}
                  </Link>
                  <Link
                    to="/contact"
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-center"
                  >
                    {t('inviteError.contact', 'Contact Support')}
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : success ? (
            <motion.div 
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold mb-4">{t('success.title', 'Account Created!')}</h1>
                <p className="text-gray-600 mb-8">
                  {inviteData?.role === 'partner'
                    ? t('success.messagePartner', "Your partner account has been created successfully. You'll be redirected to your profile shortly.")
                    : t('success.message', "Your account has been created successfully. You can now log in to manage your bookings and profile.")
                  }
                </p>
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-bold text-center mb-6">
                {inviteData?.role === 'partner' ? t('form.titlePartner', 'Complete Partner Registration') : t('form.title', 'Create an Account')}
              </h1>

              {/* Partner invite message */}
              {inviteData?.role === 'partner' && (
                <div className="bg-blue-50 p-4 rounded-md mb-6">
                  <p className="text-blue-700">
                    {t('partnerMessage', 'Thank you for applying to be a partner with Royal Transfer EU. Please complete your registration to get started.')}
                  </p>
                </div>
              )}

              {/* Booking reference message */}
              {bookingReference && (
                <div className="bg-green-50 p-4 rounded-md mb-6">
                  <p className="text-green-700">
                    {t('bookingMessage', 'Creating an account will link your booking {{reference}} to your profile.', { reference: `<span class="font-mono font-medium">${bookingReference}</span>` })}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormField
                  id="name"
                  name="name"
                  label={t('form.name', 'Full Name')}
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('name')}
                  error={errors.name}
                  required
                  icon={<User className="h-5 w-5" />}
                  autoComplete="name"
                  disabled={!!(inviteData?.partnerData?.name)}
                />

                <EmailValidator
                  value={formData.email}
                  onChange={handleEmailChange}
                  onValidationChange={handleEmailValidationChange}
                  label={t('form.email', 'Email Address')}
                  id="email"
                  name="email"
                  required={true}
                  disabled={!!(inviteData?.partnerData?.email)}
                />

                <FormField
                  id="phone"
                  name="phone"
                  label={t('form.phone', 'Phone (Optional)')}
                  value={formData.phone}
                  onChange={handleInputChange}
                  icon={<Phone className="h-5 w-5" />}
                  helpText={t('form.phoneHelp', 'For booking notifications')}
                  autoComplete="tel"
                  disabled={!!(inviteData?.partnerData?.phone)}
                />

                <div className="relative">
                  <FormField
                    id="password"
                    name="password"
                    label={t('form.password', 'Password')}
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
                    id="confirmPassword"
                    name="confirmPassword"
                    label={t('form.confirmPassword', 'Confirm Password')}
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
                  disabled={isSubmitting || !isValid || !emailValid}
                  className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center
                    ${isSubmitting || !isValid || !emailValid
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('form.creating', 'Creating Account...')}
                    </>
                  ) : (
                    t('form.create', 'Create Account')
                  )}
                </button>
                
                <p className="text-center text-sm text-gray-500 mt-4">
                  {t('form.terms', 'By creating an account, you agree to our')} {' '}
                  <Link to="/terms" className="text-blue-600 hover:underline">{t('form.termsLink', 'Terms of Service')}</Link> {' '}
                  {t('form.and', 'and')} {' '}
                  <Link to="/privacy" className="text-blue-600 hover:underline">{t('form.privacyLink', 'Privacy Policy')}</Link>.
                </p>
              </form>
              
              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  {t('form.haveAccount', 'Already have an account?')} {' '}
                  <Link 
                    to="/login"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {t('form.signIn', 'Sign in')}
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      
      {/* OTP Verification Modal */}
      <OTPVerificationModal 
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
        email={formData.email}
        verificationId={verificationId}
        emailSent={true}
      />
    </div>
  );
};

export default CustomerSignup;