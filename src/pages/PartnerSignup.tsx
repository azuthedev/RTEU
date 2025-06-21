import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle, 
  Loader2,
  AlertCircle
} from 'lucide-react';

import Header from '../components/Header';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToast } from '../components/ui/use-toast';
import { useLanguage } from '../contexts/LanguageContext';

interface PartnerData {
  name: string;
  email: string;
  phone: string;
  company_name: string;
}

const PartnerSignup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trackEvent } = useAnalytics();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Get invite code from URL
  const inviteCode = searchParams.get('invite');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
    confirmPassword: ''
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);

  // Validation rules
  const validationRules = {
    password: [
      { required: true, message: t('validation.password.required', 'Password is required') },
      { validate: (value) => value.length >= 6, message: t('validation.password.length', 'Password must be at least 6 characters long') }
    ],
    confirmPassword: [
      { required: true, message: t('validation.confirmPassword.required', 'Please confirm your password') },
      { validate: (value) => value === formData.password, message: t('validation.confirmPassword.match', 'Passwords do not match') }
    ]
  };

  // Form validation
  const {
    errors,
    isValid,
    validateAllFields,
    handleBlur
  } = useFormValidation(formData, validationRules);

  // Validate invite code on mount
  useEffect(() => {
    const validateInvite = async () => {
      if (!inviteCode) {
        setInviteError(t('errors.noInviteCode', 'No invite code provided'));
        setIsLoading(false);
        return;
      }

      try {
        // Call the edge function to validate the invite code
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
          setInviteValid(false);
          
          toast({
            title: t('toast.invalidInvite.title', "Invalid Invite Code"),
            description: data.error || t('toast.invalidInvite.description', "This invite link is invalid or has expired."),
            variant: "destructive"
          });
        } else {
          // Invite is valid
          setInviteValid(true);
          setInviteId(data.inviteId);
          
          // Check if we have partner data
          if (data.partnerData) {
            setPartnerData(data.partnerData);
            
            // Pre-fill the form with partner data
            setFormData(prev => ({
              ...prev,
              name: data.partnerData.name || '',
              email: data.partnerData.email || '',
              phone: data.partnerData.phone || '',
              company_name: data.partnerData.company_name || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error validating invite:', error);
        setInviteError(t('errors.validationError', 'Unable to validate invite code. Please try again later.'));
        
        toast({
          title: t('toast.validationError.title', "Validation Error"),
          description: t('toast.validationError.description', "Unable to validate your invite code. Please try again later."),
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    validateInvite();
  }, [inviteCode, toast, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateAllFields() || !inviteValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      trackEvent('Authentication', 'Partner Signup Attempt', inviteCode || 'Unknown');
      
      // Call the signUp function with the invite code
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
        throw new Error(t('errors.accountCreationFailed', 'Account creation failed'));
      }

      // Mark the invite as used
      const markInviteUsedResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-invite`, {
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

      if (!markInviteUsedResponse.ok) {
        console.error('Error marking invite as used:', await markInviteUsedResponse.text());
        // Continue with signup even if marking invite as used fails
      }

      // Track successful signup
      trackEvent('Authentication', 'Partner Signup Success', inviteCode || 'Unknown');
      
      setSuccess(true);
      
      // Redirect to partner dashboard after a short delay
      setTimeout(() => {
        toast({
          title: t('toast.accountCreated.title', "Account Created"),
          description: t('toast.accountCreated.description', "Your partner account has been created successfully!"),
          variant: "default"
        });
        navigate('/profile');
      }, 2000);
    } catch (error: any) {
      console.error('Error during signup:', error);
      setError(error.message || t('errors.unexpectedError', 'An unexpected error occurred during signup'));
      
      trackEvent('Authentication', 'Partner Signup Error', error.message);
      
      toast({
        title: t('toast.signupFailed.title', "Signup Failed"),
        description: error.message || t('toast.signupFailed.description', "An error occurred during signup. Please try again."),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Partner Signup | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Complete your partner registration with Royal Transfer EU and start growing your business today.')} />
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <Header />
      
      <main className="pt-28 pb-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center mb-8">
            <Link 
              to="/"
              className="flex items-center text-gray-500 hover:text-gray-700 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              <span>{t('navigation.backToHome', 'Back to Home')}</span>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
          ) : !inviteValid ? (
            <motion.div 
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold mb-4">{t('invalidInvite.title', 'Invalid Invite Code')}</h1>
                <p className="text-gray-600 mb-6">
                  {inviteError || t('invalidInvite.defaultMessage', "This invite link is invalid or has expired.")}
                </p>
                <p className="text-gray-600">
                  {t('invalidInvite.contactMessage', 'If you believe this is an error, please contact our support team or apply to become a partner through our partner program.')}
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/partners"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
                  >
                    {t('invalidInvite.applyButton', 'Apply as Partner')}
                  </Link>
                  <Link
                    to="/contact"
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-center"
                  >
                    {t('invalidInvite.contactButton', 'Contact Support')}
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
                  {t('success.message', 'Your partner account has been created successfully. You\'ll be redirected to your dashboard shortly.')}
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
              <div className="flex items-center justify-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-center mb-2">{t('form.title', 'Partner Registration')}</h1>
              <p className="text-center text-gray-600 mb-8">
                {t('form.subtitle', 'Complete your registration to join Royal Transfer EU as a partner.')}
              </p>
              
              {/* Display information about the pre-filled data */}
              {partnerData && (
                <div className="bg-blue-50 p-4 rounded-md mb-6">
                  <p className="text-blue-700 text-sm">
                    {t('form.prefillInfo', 'We\'ve pre-filled some information from your partner application. Please create a password to complete your registration.')}
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
                  label={t('form.fields.name.label', 'Full Name')}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={!!partnerData?.name}
                  icon={<User className="h-5 w-5" />}
                />
                
                <FormField
                  id="email"
                  name="email"
                  label={t('form.fields.email.label', 'Email Address')}
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!partnerData?.email}
                  icon={<Mail className="h-5 w-5" />}
                  helpText={t('form.fields.email.help', 'This email has already been verified')}
                />
                
                <FormField
                  id="phone"
                  name="phone"
                  label={t('form.fields.phone.label', 'Phone Number')}
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  disabled={!!partnerData?.phone}
                  icon={<Phone className="h-5 w-5" />}
                />
                
                <FormField
                  id="company_name"
                  name="company_name"
                  label={t('form.fields.company.label', 'Company Name')}
                  value={formData.company_name}
                  onChange={handleInputChange}
                  required
                  disabled={!!partnerData?.company_name}
                  icon={<Building className="h-5 w-5" />}
                />
                
                <div className="relative">
                  <FormField
                    id="password"
                    name="password"
                    label={t('form.fields.password.label', 'Create Password')}
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
                    aria-label={showPassword ? t('form.hidePassword', 'Hide password') : t('form.showPassword', 'Show password')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <div className="relative">
                  <FormField
                    id="confirmPassword"
                    name="confirmPassword"
                    label={t('form.fields.confirmPassword.label', 'Confirm Password')}
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
                    aria-label={showConfirmPassword ? t('form.hidePassword', 'Hide password') : t('form.showPassword', 'Show password')}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center
                    ${isSubmitting || !isValid
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('form.submittingButton', 'Creating Account...')}
                    </>
                  ) : (
                    t('form.submitButton', 'Complete Registration')
                  )}
                </button>
                
                <p className="text-center text-sm text-gray-500 mt-4">
                  {t('form.termsText', 'By completing registration, you agree to our')}{' '}
                  <Link to="/terms" className="text-blue-600 hover:underline">{t('form.termsLink', 'Terms of Service')}</Link>{' '}
                  {t('form.andText', 'and')}{' '}
                  <Link to="/privacy" className="text-blue-600 hover:underline">{t('form.privacyLink', 'Privacy Policy')}</Link>.
                </p>
              </form>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartnerSignup;