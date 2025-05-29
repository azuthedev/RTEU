import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';

const ResetPassword = () => {
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
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);
  
  const { resetPassword } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Define validation rules
  const validationRules = {
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
    handleBlur
  } = useFormValidation(formData, validationRules);
  
  // Check if in development environment and get token from URL
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('local-credentialless') ||
                  window.location.hostname.includes('webcontainer');
    setIsDevEnvironment(isDev);
    
    // In a real application, the access token would be in the URL
    // For Supabase auth, this is automatically handled by their SDK
    // We just need to know we're on the reset page
    
    // Check if we have a hash fragment with the token
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setResetToken(token);
      } else {
        setInvalidToken(true);
      }
    } else {
      // In development mode, allow resets without token for testing
      if (isDev) {
        console.log('DEVELOPMENT MODE: Creating mock reset token');
        setResetToken('dev-token-' + Date.now());
      } else {
        // In production, we need a real token
        setInvalidToken(true);
      }
    }
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form fields
    if (!validateAllFields()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In development, we can just pretend it worked
      if (isDevEnvironment) {
        console.log('DEVELOPMENT MODE: Simulating successful password reset');
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        trackEvent('Authentication', 'Password Reset Success (Dev)');
        
        // Redirect after a delay
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Your password has been reset successfully. Please sign in with your new password.' } 
          });
        }, 3000);
        
        return;
      }
      
      // In production, we need to verify the token is valid
      if (!resetToken) {
        throw new Error('Invalid or missing reset token. Please request a new password reset link.');
      }
      
      // Call the reset password function from auth context
      const result = await resetPassword(formData.password, resetToken);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reset your password. Please try again.');
      }
      
      // Password reset successful
      setSuccess(true);
      trackEvent('Authentication', 'Password Reset Success');
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Your password has been reset successfully. Please sign in with your new password.' } 
        });
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset your password. Please try again.');
      trackEvent('Authentication', 'Password Reset Error', error.message);
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
  
  // Show invalid token screen if needed
  if (invalidToken) {
    return (
      <div className="min-h-screen bg-gray-50">
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
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-8">
                The password reset link is invalid or has expired. Please request a new password reset link.
              </p>
              
              <button
                onClick={handleBackToLogin}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </button>
            </motion.div>
          </div>
        </main>
        
        <Sitemap />
      </div>
    );
  }
  
  // Show success screen if reset was successful
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
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
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-4">Password Reset Successful</h2>
              <p className="text-gray-600 mb-8">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="text-sm text-gray-600">
                  Redirecting you to the login page...
                </p>
              </div>
            </motion.div>
          </div>
        </main>
        
        <Sitemap />
      </div>
    );
  }
  
  // Main password reset form
  return (
    <div className="min-h-screen bg-gray-50">
      <Header hideSignIn />
      
      <main className="pt-32 pb-16">
        <div className="max-w-md mx-auto px-4">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl font-semibold mb-4 text-center">Reset Your Password</h2>
            
            {isDevEnvironment && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-amber-800 text-sm">
                  <strong>Development Mode:</strong> Password reset will be simulated without requiring a valid token.
                </p>
              </div>
            )}
            
            <p className="text-gray-600 mb-6 text-center">
              Please enter a new password for your account.
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
                  label="New Password"
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
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                  label="Confirm New Password"
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
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                    Resetting Password...
                  </>
                ) : 'Reset Password'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToLogin}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Login
              </button>
            </div>
          </motion.div>
        </div>
      </main>
      
      <Sitemap />
    </div>
  );
};

export default ResetPassword;