import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Save, Loader2, CheckCircle, AlertCircle, 
  Lock, ChevronRight, Mail, Key, LogOut, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import FormField from '../components/ui/form-field';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import PasswordResetModal from '../components/PasswordResetModal';
import { withRetry } from '../utils/retryHelper';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';

const Profile = () => {
  const { user, userData, loading, updateUserData, signOut } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const { t, isLoading } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // Initialize form with user data when available
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || ''
      });
    } else if (user) {
      // If userData is not available but user is, try to fetch it
      const fetchUserData = async () => {
        try {
          // Get the current session for auth token
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session');
          }
          
          // Call the Edge Function with proper authorization
          const response = await withRetry(async () => {
            return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-data?type=profile`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `${session.access_token}`
              }
            });
          }, {
            maxRetries: 3,
            initialDelay: 500,
            onRetry: (attempt) => console.log(`Retrying user data fetch, attempt ${attempt}`)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response from get-user-data:', errorText);
            throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
          }
          
          const { data, error: responseError } = await response.json();
          
          if (responseError) {
            throw new Error(responseError);
          }
          
          if (data) {
            setFormData({
              name: data.name || '',
              phone: data.phone || '',
              email: data.email || ''
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUpdateError(t('messages.error.loading', 'Failed to load your profile data. Please try refreshing the page.'));
        }
      };
      
      fetchUserData();
    }
  }, [userData, user, t]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate form data
    if (!formData.name.trim()) {
      setUpdateError(t('messages.error.nameRequired', 'Name is required'));
      return;
    }
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      trackEvent('User', 'Profile Update Attempt');
      
      // Prepare update data - don't update email through this flow
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null
      };
      
      const { error, data } = await updateUserData(updateData);
      
      if (error) {
        throw error;
      }
      
      setUpdateSuccess(true);
      trackEvent('User', 'Profile Update Success');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setUpdateError(error.message || t('messages.error.general', 'Failed to update profile'));
      trackEvent('User', 'Profile Update Error', error.message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handlePasswordReset = () => {
    setShowPasswordResetModal(true);
    trackEvent('User', 'Password Reset Modal Opened', 'From Profile');
  };
  
  const handleSignOut = async () => {
    try {
      trackEvent('Authentication', 'Sign Out Initiated', 'From Profile');
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('loading', 'Loading your profile...')}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>{t('meta.title', 'Your Profile | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Manage your account information and preferences.')} />
      </Helmet>
      <Header />
      
      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('header.title', 'Your Profile')}</h1>
            <p className="text-gray-600 mt-2">
              {t('header.description', 'Manage your account information and preferences')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Section */}
            <div className="lg:col-span-2">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  {t('personalInfo.title', 'Personal Information')}
                </h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <FormField
                      id="name"
                      name="name"
                      label={t('personalInfo.fields.name', 'Full Name')}
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      autoComplete="name"
                    />
                    
                    <FormField
                      id="email"
                      name="email"
                      label={t('personalInfo.fields.email', 'Email Address')}
                      value={formData.email}
                      disabled
                      helpText={t('personalInfo.fields.emailHelp', 'Email cannot be changed')}
                      icon={<Mail className="h-5 w-5" />}
                    />
                    
                    <FormField
                      id="phone"
                      name="phone"
                      label={t('personalInfo.fields.phone', 'Phone Number')}
                      value={formData.phone}
                      onChange={handleInputChange}
                      helpText={t('personalInfo.fields.phoneHelp', 'For booking notifications (optional)')}
                      autoComplete="tel"
                    />
                  </div>
                  
                  {updateSuccess && (
                    <div className="mt-6 p-3 bg-green-50 text-green-700 rounded-md flex items-start">
                      <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <p>{t('messages.success', 'Your profile has been updated successfully!')}</p>
                    </div>
                  )}
                  
                  {updateError && (
                    <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-md flex items-start">
                      <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <p>{updateError}</p>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className={`px-6 py-2 rounded-md transition-all duration-300 flex items-center
                        ${isUpdating 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('buttons.saving', 'Saving...')}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t('buttons.save', 'Save Changes')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
            
            {/* Sidebar - stacks on mobile, side by side on desktop */}
            <div className="lg:col-span-1 space-y-6">
              {/* Security Options */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-blue-600" />
                  {t('security.title', 'Account Security')}
                </h2>
                
                <div className="space-y-4">
                  <button
                    onClick={handlePasswordReset}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Key className="w-5 h-5 mr-3 text-gray-500" />
                      <span>{t('security.passwordReset', 'Reset Password')}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <LogOut className="w-5 h-5 mr-3 text-gray-500" />
                      <span>{t('security.signOut', 'Sign Out')}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </motion.div>
              
              {/* Help Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-blue-50 rounded-lg shadow-sm p-6"
              >
                <h3 className="font-medium text-blue-800 mb-2">{t('helpBox.title', 'Need Help?')}</h3>
                <p className="text-sm text-blue-700 mb-4">
                  {t('helpBox.description', "If you're having trouble with your account, our support team is here to help.")}
                </p>
                <a 
                  href="/contact"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                >
                  {t('helpBox.contactLink', 'Contact Support')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      
      
      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        email={formData.email}
      />
    </div>
  );
};

export default Profile;