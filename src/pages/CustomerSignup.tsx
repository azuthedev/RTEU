import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, AlertCircle, Loader2, Mail, Lock, Phone, Eye, EyeOff, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { supabase } from '../lib/supabase';
import FormField, { ValidationRule } from '../components/ui/form-field';
import useFormValidation from '../hooks/useFormValidation';
import BookingReferenceForm from '../components/BookingReferenceForm';
import { useAnalytics } from '../hooks/useAnalytics';

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
  const [showBookingReferenceForm, setShowBookingReferenceForm] = useState(false);
  const [bookingReference, setBookingReference] = useState<string | null>(null);

  // Define validation rules
  const validationRules = {
    name: [
      { required: true, message: 'Please enter your name' }
    ],
    email: [
      { required: true, message: 'Please enter your email address' },
      { 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
        message: 'Please enter a valid email address' 
      }
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

  const handleBookingReferenceFound = (bookingData) => {
    // Populate the form with data from the booking
    setFormData({
      name: bookingData.customer_name || '',
      email: bookingData.customer_email || '',
      phone: bookingData.customer_phone || '',
      password: '',
      confirmPassword: ''
    });
    
    // Store the booking reference for later use
    setBookingReference(bookingData.booking_reference);
    
    // Hide the booking reference form and show the signup form
    setShowBookingReferenceForm(false);
    
    // Track the event
    trackEvent('Authentication', 'Booking Reference Form Prefill', bookingData.booking_reference);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate all fields before submitting
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
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

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // Helper function to determine if the button should be disabled
  const isButtonDisabled = () => {
    // Only disable if the form has been touched and is invalid, or if submission is in progress
    return (formTouched && !isValid) || isSubmitting;
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
          {showBookingReferenceForm ? (
            <BookingReferenceForm 
              onSuccess={handleBookingReferenceFound}
              onCancel={() => setShowBookingReferenceForm(false)}
            />
          ) : (
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
              
              {bookingReference && (
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
              
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
                  id="email"
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('email')}
                  required
                  icon={<Mail className="h-5 w-5" />}
                  error={errors.email}
                  autoComplete="email"
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

                <button
                  onClick={() => setShowBookingReferenceForm(true)}
                  className="mt-4 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
                >
                  <Search className="w-4 h-4 mr-1" />
                  Have a booking reference?
                </button>
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
          )}

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
    </div>
  );
};

export default CustomerSignup;