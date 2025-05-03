import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Car, User, ArrowRight, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';

interface LocationState {
  message?: string;
  from?: Location;
  bookingReference?: string;
}

const Login = () => {
  const [isDriver, setIsDriver] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user } = useAuth();

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
    
    // Clear state after reading it
    if (state?.message || state?.bookingReference) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error, session } = await signIn(formData.email, formData.password);
      
      if (error) throw error;
      
      // If we have a session, redirect immediately
      if (session) {
        const state = location.state as LocationState;
        navigate(state?.from?.pathname || '/bookings', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials.');
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
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="ml-2">{successMessage}</div>
              </div>
            )}

            {/* Booking Reference Message */}
            {bookingReference && (
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

            {isDriver ? (
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-4">Driver Portal</h2>
                <p className="text-gray-700 mb-6">
                  Please sign in through our partner portal to access the driver dashboard.
                </p>
                <button
                  onClick={handlePartnerClick}
                  className="w-full border-2 border-blue-600 bg-white text-blue-600 px-6 py-3 rounded-md hover:bg-blue-50 transition-all duration-300 mb-4"
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
            ) : (
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
    </div>
  );
};

export default Login;