import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Car, User, ArrowRight, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import BookingReferenceInput from '../components/BookingReferenceInput';
import { useAnalytics } from '../hooks/useAnalytics';
import OTPVerificationModal from '../components/OTPVerificationModal';
import { supabase } from '../lib/supabase';

interface LocationState {
  message?: string;
  from?: Location;
  bookingReference?: string;
  email?: string;
  requireVerification?: boolean;
}

const Login = () => {
  const [isDriver, setIsDriver] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string>('');
  const [bookingData, setBookingData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { trackEvent } = useAnalytics();

  // For verification handling
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [isUnverifiedUser, setIsUnverifiedUser] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, sendVerificationEmail, checkEmailVerification, refreshSession } = useAuth();

  // Check if in development environment
  useEffect(() => {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname.includes('local-credentialless') ||
                  window.location.hostname.includes('webcontainer');
    setIsDevEnvironment(isDev);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const state = location.state as LocationState;
      navigate(state?.from?.pathname || '/', { replace: true });
    }
  }, [user, navigate, location]);

  // Check for any message passed from CustomerSignup page
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.message) {
      setSuccessMessage(state.message);
    }
    if (state?.bookingReference) {
      setBookingReference(state.bookingReference);
    }
    if (state?.email) {
      setFormData(prev => ({
        ...prev,
        email: state.email || ''
      }));

      // If this login was redirected due to verification requirement
      if (state?.requireVerification) {
        setIsUnverifiedUser(true);
        setError('Your email address needs to be verified before you can continue.');
        // Auto-trigger verification email
        handleSendVerification(state.email);
      }
    }
    
    // Clear state after reading it
    if (state?.message || state?.bookingReference || state?.email) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleValidBookingFound = (data: any) => {
    setBookingData(data);
    
    // Pre-fill email field if it's not already filled
    if (data.customer_email && !formData.email) {
      setFormData(prev => ({
        ...prev,
        email: data.customer_email
      }));
    }
    
    // Track event
    trackEvent('Form', 'Booking Reference Found on Login', data.booking_reference);
  };

  const handleSendVerification = async (email = formData.email) => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsSendingVerification(true);
    setError(null);

    try {
      // First check if the user exists and requires verification
      const verificationCheck = await checkEmailVerification(email);
      
      if (verificationCheck.error) {
        throw new Error(verificationCheck.error);
      }
      
      if (!verificationCheck.exists) {
        throw new Error('No account found with this email address. Please sign up first.');
      }
      
      if (verificationCheck.verified) {
        throw new Error('This email is already verified. Please try logging in again.');
      }
      
      // Check if there's already a pending verification and it's recent
      if (verificationCheck.hasPendingVerification && verificationCheck.verificationAge && verificationCheck.verificationAge < 2) {
        throw new Error(`A verification email was recently sent. Please check your inbox or wait ${Math.max(1, 2 - verificationCheck.verificationAge)} minute(s) before requesting another.`);
      }
      
      // Send verification email
      const result = await sendVerificationEmail(email);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send verification email');
      }
      
      setVerificationId(result.verificationId || '');
      setShowVerificationModal(true);
      
      // Mark user as needing verification
      setIsUnverifiedUser(true);
      
      // Track successful email send
      trackEvent('Authentication', 'Verification Email Sent', 'From Login');

    } catch (error: any) {
      console.error('Error sending verification email:', error);
      
      if (isDevEnvironment) {
        console.log('DEVELOPMENT MODE: Ignoring verification email error, continuing with mock verification');
        setVerificationId(`dev-${Date.now()}`);
        setShowVerificationModal(true);
      } else {
        setError(error.message || 'Failed to send verification email');
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In development mode, handle unverified users with a shortcut
      if (isDevEnvironment && isUnverifiedUser) {
        console.log('DEVELOPMENT MODE: Bypassing verification requirement for', formData.email);
        // Continue with login even if verification would normally be required
      }

      const { error, session } = await signIn(formData.email, formData.password);
      
      if (error) throw error;
      
      // If we have a session and a booking reference, link the booking to the user
      if (session && bookingReference && bookingData) {
        try {
          const { error: linkError } = await supabase
            .from('trips')
            .update({ user_id: session.user.id })
            .eq('booking_reference', bookingReference);
          
          if (linkError) {
            console.error('Error linking booking to user:', linkError);
          } else {
            console.log(`Successfully linked booking ${bookingReference} to user ${session.user.id}`);
            trackEvent('Authentication', 'Booking Linked at Login', bookingReference);
          }
        } catch (linkError) {
          console.error('Error linking booking:', linkError);
          // Don't fail login just because linking failed
        }
      }
      
      // Check if user's email is verified
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('email_verified')
          .eq('id', session.user.id)
          .single();
          
        if (!userData?.email_verified && !isDevEnvironment) {
          // User needs to verify their email
          setIsUnverifiedUser(true);
          setError('Your email address needs to be verified before you can continue.');
          
          // Send verification email
          await handleSendVerification(formData.email);
          
          // Force JWT refresh to ensure email_verified claim is current
          await refreshSession();
          return;
        }
      } catch (verifyError) {
        console.error('Error checking email verification:', verifyError);
        // Continue with login even if verification check fails
      }
      
      // Force JWT refresh to ensure all claims are current
      await refreshSession();
      
      // If we have a session, redirect immediately
      if (session) {
        const state = location.state as LocationState;
        navigate(state?.from?.pathname || '/bookings', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (isDevEnvironment) {
        console.log('DEVELOPMENT MODE: Bypassing login error for testing:', error.message);
        const state = location.state as LocationState;
        navigate(state?.from?.pathname || '/bookings', { replace: true });
        return;
      }
      
      // Check if this is an unverified user
      if (error.message.includes('email') && error.message.includes('not verified')) {
        setIsUnverifiedUser(true);
        setError('Your email address needs to be verified. Please check your inbox or request a new verification email.');
      } else {
        setError(error.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationComplete = async () => {
    // Track successful verification
    trackEvent('Authentication', 'Email Verification Completed', 'From Login');
    
    setShowVerificationModal(false);
    setIsUnverifiedUser(false);
    setSuccessMessage('Email verified successfully! You can now log in.');
    
    // Refresh the session to update the JWT claims
    await refreshSession();
    
    // Try to login automatically if the form has both email and password
    if (formData.email && formData.password) {
      await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePartnerClick = () => {
    navigate('/partners#partner-form');
  };

  const redirectToPartnerPortal = () => {
    window.location.href = 'https://app.royaltransfer.eu/partner';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header hideSignIn />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-8">
              {isDriver ? (
                <Car className="w-12 h-12 text-blue-600" />
              ) : (
                <User className="w-12 h-12 text-blue-600" />
              )}
            </div>
            
            {isDevEnvironment && (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md mb-4 text-sm">
                <p className="font-medium">Development Mode Active</p>
                <p className="mt-1">Authentication errors will be bypassed for testing.</p>
              </div>
            )}
            
            {/* Toggle Switch */}
            <div className="flex bg-gray-100 p-1 rounded-lg mb-8">
              <button
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                  !isDriver ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}
                onClick={() => setIsDriver(false)}
              >
                Customer
              </button>
              <button
                className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                  isDriver ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}
                onClick={() => setIsDriver(true)}
              >
                Driver
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 text-green-700 p-3 rounded-md mb-6 text-sm flex items-start">
                <div className="ml-2">{successMessage}</div>
              </div>
            )}

            {/* Booking Reference */}
            {!isDriver && !isUnverifiedUser && (
              <BookingReferenceInput
                value={bookingReference}
                onChange={setBookingReference}
                onValidBookingFound={handleValidBookingFound}
                className="mb-6"
              />
            )}

            {/* Booking Reference Message */}
            {bookingReference && bookingData && !isUnverifiedUser && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md mb-6 text-sm">
                <p className="font-medium">Your booking reference: {bookingReference}</p>
                <p className="mt-1">Sign in to manage your booking.</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm flex items-start">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="ml-2">{error}</div>
              </div>
            )}

            {/* Unverified User Message */}
            {isUnverifiedUser && (
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-6">
                <h3 className="font-semibold mb-2">Email Verification Required</h3>
                <p className="text-sm mb-4">
                  Your account needs to be verified before you can log in. Please check your email for a verification link or request a new one.
                </p>
                <button
                  onClick={() => handleSendVerification()}
                  disabled={isSendingVerification}
                  className="w-full bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 transition-all duration-300 flex items-center justify-center"
                >
                  {isSendingVerification ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending verification email...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </button>
              </div>
            )}

            {isDriver ? (
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-4">Driver Portal</h2>
                <p className="text-gray-700 mb-6">
                  Please sign in through our partner portal to access the driver dashboard.
                </p>
                <button
                  onClick={handlePartnerClick}
                  className="w-full border-2 border-blue-600 bg-white text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 mb-4"
                >
                  Become a Partner
                </button>
                <button
                  onClick={redirectToPartnerPortal}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 w-full"
                >
                  Go to Partner Portal
                </button>
              </div>
            ) : !isUnverifiedUser && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </button>

                <div className="text-center mt-3">
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                    Forgot your password?
                  </a>
                </div>
              </form>
            )}

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

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <Link
              to="/customer-signup"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Help Link */}
          <div className="text-center mt-3">
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
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerified={handleVerificationComplete}
        email={formData.email}
        verificationId={verificationId}
        emailSent={true}
      />
    </div>
  );
};

export default Login;