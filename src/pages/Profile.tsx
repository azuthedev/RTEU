import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Save, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { useAuth } from '../contexts/AuthContext';
import FormField from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';

const Profile = () => {
  const navigate = useNavigate();
  const { user, userData, loading, updateUserData } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Define validation rules
  const validationRules = {
    name: [
      { required: true, message: 'Please enter your name' }
    ],
    phone: [
      { 
        pattern: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        message: 'Please enter a valid phone number'
      }
    ]
  };

  const {
    errors,
    isValid,
    validateAllFields,
    handleBlur,
    resetForm
  } = useFormValidation(formData, validationRules);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { 
        state: { from: location },
        replace: true 
      });
    }
  }, [user, loading, navigate]);

  // Populate form with user data when available
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
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
    setError(null);
    setSuccessMessage(null);
    
    // Validate all fields before submitting
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      return;
    }
    
    if (!user) {
      setError('You must be logged in to update your profile');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await updateUserData({
        name: formData.name,
        phone: formData.phone
      });

      if (error) throw error;

      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to determine if role should be displayed
  const shouldShowRole = (user_role?: string) => {
    return user_role && ['admin', 'support', 'driver'].includes(user_role.toLowerCase());
  };

  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h1 
            className="text-3xl font-bold mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Your Profile
          </motion.h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Profile Sidebar */}
            <motion.div
              className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-1 h-fit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold">{userData?.name || 'User'}</h2>
                  {shouldShowRole(userData?.user_role) && (
                    <p className="text-gray-700 capitalize">{userData?.user_role}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{userData?.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{userData?.phone || 'Not provided'}</span>
                  </div>
                </div>

                <hr className="my-6" />

                <div className="space-y-2">
                  <a href="/bookings" className="block py-2 text-blue-600 hover:text-blue-700">
                    My Bookings
                  </a>
                  <a href="#" className="block py-2 text-blue-600 hover:text-blue-700">
                    Payment History
                  </a>
                  <a href="#" className="block py-2 text-blue-600 hover:text-blue-700">
                    Support Tickets
                  </a>
                </div>
              </div>
            </motion.div>
            
            {/* Profile Edit Form */}
            <motion.div
              className="bg-white rounded-lg shadow-md p-6 md:col-span-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-xl font-bold mb-6">Edit Profile</h2>

              {error && (
                <div 
                  className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex items-start"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="ml-2">{error}</p>
                </div>
              )}

              {successMessage && (
                <div 
                  className="bg-green-50 text-green-600 p-4 rounded-md mb-6 flex items-center"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <p>{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <FormField
                  id="name"
                  name="name"
                  label="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('name')}
                  required
                  error={errors.name}
                  autoComplete="name"
                />

                <FormField
                  id="email"
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled
                  helpText="Email cannot be changed"
                  autoComplete="email"
                />

                <FormField
                  id="phone"
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('phone')}
                  error={errors.phone}
                  autoComplete="tel"
                  helpText="Enter your phone number with country code"
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  aria-busy={isSubmitting}
                  className={`px-6 py-3 rounded-md transition-all duration-300 flex items-center mt-4
                    ${isSubmitting || !isValid 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default Profile;