import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Shield, Mail, Phone, AlertCircle, Loader2, 
  CheckCircle, PenSquare, X, Eye, EyeOff, Key 
} from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import PasswordResetModal from '../components/PasswordResetModal';

const Profile = () => {
  const { userData, loading, updateUserData, user } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Password reset modal state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  
  // Define validation rules
  const validationRules = {
    name: [
      { required: true, message: 'Name is required' }
    ],
    // Optional fields don't need validation
  };
  
  const {
    errors,
    isValid,
    validateAllFields,
    handleBlur
  } = useFormValidation(formData, validationRules);
  
  // Initialize form data when user data is loaded
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
  
  const handleCancelEdit = () => {
    // Reset form to original data
    if (userData) {
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || ''
      });
    }
    setIsEditing(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAllFields()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Only update fields that have changed
      const updates: Record<string, any> = {};
      
      if (formData.name !== userData?.name) {
        updates.name = formData.name;
      }
      
      if (formData.phone !== userData?.phone) {
        updates.phone = formData.phone;
      }
      
      // Don't allow email change for now as it requires reverification
      // if (formData.email !== userData?.email) {
      //   updates.email = formData.email;
      // }
      
      // Only call update if there are changes
      if (Object.keys(updates).length > 0) {
        const { error } = await updateUserData(updates);
        
        if (error) {
          throw new Error('Failed to update profile: ' + error.message);
        }
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePasswordReset = () => {
    setShowPasswordResetModal(true);
    trackEvent('Authentication', 'Password Reset Modal Opened', 'From Profile');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 py-16 mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Profile Header */}
            <div className="bg-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Your Profile
                </h1>
                
                {isEditing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center px-3 py-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-3 py-1.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    <PenSquare className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            {/* Main Content */}
            <div className="p-6">
              {/* Status Messages */}
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-md flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-3 bg-green-50 text-green-600 rounded-md flex items-start">
                  <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <p>Profile updated successfully!</p>
                </div>
              )}
              
              {/* Profile Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <FormField
                    id="name"
                    name="name"
                    label="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('name')}
                    error={errors.name}
                    required
                    icon={<User className="h-5 w-5" />}
                    disabled={!isEditing}
                  />
                  
                  {/* Email (Read only) */}
                  <FormField
                    id="email"
                    name="email"
                    label="Email Address"
                    value={formData.email}
                    onChange={() => {}}
                    icon={<Mail className="h-5 w-5" />}
                    disabled={true}
                    helpText="Email cannot be changed"
                  />
                  
                  {/* Phone */}
                  <FormField
                    id="phone"
                    name="phone"
                    label="Phone Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    icon={<Phone className="h-5 w-5" />}
                    disabled={!isEditing}
                    helpText="Used for booking notifications"
                  />
                </div>
                
                {/* Update Button */}
                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isValid}
                      className={`px-6 py-2 rounded transition-all duration-300 flex items-center
                        ${isSubmitting || !isValid
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : 'Update Profile'}
                    </button>
                  </div>
                )}
              </form>
              
              {/* Account Security Section */}
              <div className="mt-10 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Shield className="mr-2 h-5 w-5 text-blue-600" />
                  Account Security
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password Reset Card */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Password</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Change your password to keep your account secure.
                    </p>
                    <button
                      onClick={handlePasswordReset}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      <Key className="w-4 h-4 mr-1" />
                      Reset password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Password Reset Modal */}
      <PasswordResetModal 
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        email={user?.email || ''}
      />
    </div>
  );
};

export default Profile;