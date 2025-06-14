import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Save, Loader2, CheckCircle, AlertCircle, 
  Lock, ChevronRight, Mail, Key, LogOut, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import FormField from '../components/ui/form-field';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import PasswordResetModal from '../components/PasswordResetModal';

const Profile = () => {
  const { user, userData, loading, updateUserData, signOut } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || ''
      });
    }
  }, [userData]);
  
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
      setUpdateError('Name is required');
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
      setUpdateError(error.message || 'Failed to update profile');
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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-600 mt-2">
              Manage your account information and preferences
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
                  Personal Information
                </h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <FormField
                      id="name"
                      name="name"
                      label="Full Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      autoComplete="name"
                    />
                    
                    <FormField
                      id="email"
                      name="email"
                      label="Email Address"
                      value={formData.email}
                      disabled
                      helpText="Email cannot be changed"
                      icon={<Mail className="h-5 w-5" />}
                    />
                    
                    <FormField
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      helpText="For booking notifications (optional)"
                      autoComplete="tel"
                    />
                  </div>
                  
                  {updateSuccess && (
                    <div className="mt-6 p-3 bg-green-50 text-green-700 rounded-md flex items-start">
                      <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <p>Your profile has been updated successfully!</p>
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
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
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
                  Account Security
                </h2>
                
                <div className="space-y-4">
                  <button
                    onClick={handlePasswordReset}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Key className="w-5 h-5 mr-3 text-gray-500" />
                      <span>Reset Password</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <LogOut className="w-5 h-5 mr-3 text-gray-500" />
                      <span>Sign Out</span>
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
                <h3 className="font-medium text-blue-800 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  If you're having trouble with your account, our support team is here to help.
                </p>
                <a 
                  href="/contact"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Contact Support
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      
      <Sitemap />
      
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