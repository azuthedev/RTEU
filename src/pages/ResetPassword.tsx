import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { useToast } from '../components/ui/use-toast';
import Header from '../components/Header';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { resetPassword, verifyPasswordResetToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const { toast } = useToast();
  const { t, isLoading } = useLanguage();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Define validation rules
  const validationRules = {
    password: [
      { required: true, message: t('validation.passwordRequired', 'Please enter a password') },
      { 
        validate: (value) => value.length >= 6,
        message: t('validation.passwordLength', 'Password must be at least 6 characters long') 
      }
    ],
    confirmPassword: [
      { required: true, message: t('validation.confirmRequired', 'Please confirm your password') },
      { 
        validate: (value) => value === formData.password,
        message: t('validation.passwordMatch', 'Passwords do not match') 
      }
    ]
  };

  const {
    errors,
    isValid,
    validateAllFields,
    handleBlur
  } = useFormValidation(formData, validationRules);
  
  // Check for token in URL query params - NOT hash
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setVerifyingToken(false);
      setInvalidToken(true);
      return;
    }
    
    setResetToken(token);
    
    // Verify the token is valid
    const verifyToken = async () => {
      try {
        const result = await verifyPasswordResetToken(token);
        
        if (!result.valid) {
          setVerifyingToken(false);
          setInvalidToken(true);
          setError(result.error || t('error.invalidToken', 'Invalid or expired token'));
          return;
        }
        
        // Token is valid, set user email
        if (result.email) {
          setUserEmail(result.email);
        }
        
        setVerifyingToken(false);
      } catch (error: any) {
        console.error('Error verifying token:', error);
        setVerifyingToken(false);
        setInvalidToken(true);
        setError(error.message || t('error.verifyFailed', 'Failed to verify reset token'));
      }
    };
    
    verifyToken();
  }, [searchParams, verifyPasswordResetToken, t]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateAllFields()) {
      return;
    }
    
    if (!resetToken || !userEmail) {
      setError(t('error.missingToken', 'Invalid or missing reset token. Please request a new password reset link.'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await resetPassword(formData.password, resetToken, userEmail);
      
      if (!result.success) {
        throw new Error(result.error || t('error.resetFailed', 'Failed to reset your password. Please try again.'));
      }
      
      // Password reset successful
      setSuccess(true);
      trackEvent('Authentication', 'Password Reset Success');
      
      // Show success toast
      toast({
        title: t('toast.success.title', 'Password Reset Successful'),
        description: t('toast.success.description', 'Your password has been reset successfully. You can now sign in with your new password.'),
        variant: "default"
      });
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login', { 
          state: { message: t('success.loginMessage', 'Your password has been reset successfully. Please sign in with your new password.') } 
        });
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || t('error.unexpectedError', 'Failed to reset your password. Please try again.'));
      trackEvent('Authentication', 'Password Reset Error', error.message);
      
      // Show error toast
      toast({
        title: t('toast.error.title', 'Password Reset Failed'),
        description: error.message || t('toast.error.description', 'An error occurred. Please try again or request a new reset link.'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Go back to login
  const handleBackToLogin = () => {
    navigate('/login');
  };

  // If translations are still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header hideSignIn />
        <div className="flex-1 flex items-center justify-center pt-32">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show loading state while verifying token
  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Helmet>
          <title>{t('meta.title', 'Reset Password | Royal Transfer EU')}</title>
          <meta name="description" content={t('meta.description', 'Reset your password to access your Royal Transfer EU account.')} />
        </Helmet>
        <Header hideSignIn />
        <main className="pt-32 pb-16">
          <div className="max-w-md mx-auto px-4">
            <motion.div 
              className="bg-white rounded-lg shadow-lg p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-center mb-6">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">{t('verifying.title', 'Verifying Reset Link')}</h2>
              <p className="text-gray-600 mb-8">
                {t('verifying.message', 'Please wait while we verify your password reset link...')}
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }
  
  // Show invalid token screen if token is invalid
  if (invalidToken) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Helmet>
          <title>{t('meta.invalidTitle', 'Invalid Reset Link | Royal Transfer EU')}</title>
          <meta name="description" content={t('meta.invalidDescription', 'This password reset link is invalid or has expired. Please request a new one.')} />
        </Helmet>
        <Header hideSignIn />
        
        <main className="pt-32 pb-16">
          <div className="max-w-md mx-auto px-4">
            <motion.div 
              className="bg-white rounded-lg shadow-lg p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">{t('invalid.title', 'Invalid Reset Link')}</h2>
              <p className="text-gray-600 mb-8">
                {error || t('invalid.message', 'The password reset link is invalid or has expired. Please request a new password reset link.')}
              </p>
              
              <button
                onClick={handleBackToLogin}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('buttons.backToLogin', 'Back to Login')}
              </button>
            </motion.div>
          </div>
        </main>
        
      </div>
    );
  }
  
  // Show success screen if reset was successful
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Helmet>
          <title>{t('meta.successTitle', 'Password Reset Successful | Royal Transfer EU')}</title>
          <meta name="description" content={t('meta.successDescription', 'Your password has been successfully reset. You can now sign in with your new password.')} />
        </Helmet>
        <Header hideSignIn />
        
        <main className="pt-32 pb-16">
          <div className="max-w-md mx-auto px-4">
            <motion.div 
              className="bg-white rounded-lg shadow-lg p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">{t('success.title', 'Password Reset Successful')}</h2>
              <p className="text-gray-600 mb-8">
                {t('success.message', 'Your password has been reset successfully. You can now log in with your new password.')}
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="text-sm text-gray-600">
                  {t('success.redirecting', 'Redirecting you to the login page...')}
                </p>
              </div>
            </motion.div>
          </div>
        </main>
        
      </div>
    );
  }
  
  // Main password reset form
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Reset Password | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Reset your password to access your Royal Transfer EU account.')} />
      </Helmet>
      <Header hideSignIn />
      
      <main className="pt-32 pb-16">
        <div className="max-w-md mx-auto px-4">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-semibold mb-4 text-center">{t('form.title', 'Reset Your Password')}</h2>
            
            <p className="text-gray-600 mb-6 text-center">
              {userEmail 
                ? t('form.subtitle.withEmail', `Please enter a new password for ${userEmail}`) 
                : t('form.subtitle.noEmail', 'Please enter a new password for your account.')}
            </p>
            
            {error && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <FormField
                  id="password"
                  name="password"
                  label={t('form.newPassword', 'New Password')}
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('password')}
                  error={errors.password}
                  required
                  icon={<Lock className="h-5 w-5" />}
                  autoComplete="new-password"
                  helpText={t('form.passwordHelp', 'Must be at least 6 characters')}
                  inputClassName="pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? t('buttons.hidePassword', 'Hide password') : t('buttons.showPassword', 'Show password')}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              <div className="relative">
                <FormField
                  id="confirmPassword"
                  name="confirmPassword"
                  label={t('form.confirmPassword', 'Confirm New Password')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  error={errors.confirmPassword}
                  required
                  icon={<Lock className="h-5 w-5" />}
                  autoComplete="new-password"
                  inputClassName="pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmPassword ? t('buttons.hidePassword', 'Hide password') : t('buttons.showPassword', 'Show password')}
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
                    : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('buttons.resetting', 'Resetting Password...')}
                  </>
                ) : t('buttons.reset', 'Reset Password')}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToLogin}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t('buttons.backToLogin', 'Back to Login')}
              </button>
            </div>
          </motion.div>
        </div>
      </main>
      
    </div>
  );
};

export default ResetPassword;