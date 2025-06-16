import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, ArrowRight, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import SignUpModal from '../components/SignUpModal';
import { Helmet } from 'react-helmet-async';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/supabase';

// Helper function to retry database operations
const retryDatabaseOperation = async (operation, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Database operation failed, retrying... (${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const { toast } = useToast();

  // States for booking data
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for account management
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [existingUserWithSameEmail, setExistingUserWithSameEmail] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  
  useEffect(() => {
    // Check if we have cached booking data from state
    const state = location.state as any;
    
    // Get the booking reference from the URL query parameters
    const params = new URLSearchParams(location.search);
    
    // Check for direct reference first (from both card and cash payments)
    const reference = params.get('reference');
    
    // Then check for Stripe session_id as fallback (legacy format)
    const sessionId = params.get('session_id');
    
    // Use the first available reference
    const bookingRef = reference || sessionId;
    setBookingReference(bookingRef);
    
    // If we have state data, use it immediately (avoid extra database call)
    if (state?.bookingData) {
      console.log('Using cached booking data from navigation state');
      setBookingDetails(state.bookingData);
      setLoading(false);
      
      // Check if user exists with this email
      checkUserStatus(state.bookingData);
      
      // Clear navigation state to prevent issues on page refresh
      window.history.replaceState({}, document.title);
    } else if (bookingRef) {
      // Fetch data from edge function if no cached state
      fetchBookingDetails(bookingRef);
    } else {
      setLoading(false);
      setError('No booking reference found');
    }
    
    // Track booking success
    trackEvent('Booking', 'Booking Success', bookingRef || 'Unknown');
  }, [location, trackEvent]);

  const fetchBookingDetails = async (reference: string) => {
    setLoading(true);
    try {
      console.log('Fetching booking details for reference:', reference);
      
      // Use the proxy route instead of direct Supabase URL to handle CORS properly
      const response = await fetch('/api/get-booking-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ booking_reference: reference })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from edge function:', errorText);
        throw new Error('Could not retrieve booking details');
      }
      
      const data = await response.json();
      
      if (data) {
        console.log('Booking data retrieved successfully:', data);
        setBookingDetails(data);
        
        // Check user status
        checkUserStatus(data);
        return;
      }
      
      // If we reach here, something went wrong
      throw new Error('No booking data found');
      
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast({
        title: "Error",
        description: "Could not find your booking. Please contact support.",
        variant: "destructive"
      });
      setError('Could not load booking details');
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async (bookingData: any) => {
    setIsCheckingUser(true);
    
    try {
      if (!user && bookingData?.customer_email) {
        console.log('Checking if user exists for email:', bookingData.customer_email);
        
        // Use regular Supabase client with anonymous permissions
        const userData = await retryDatabaseOperation(async () => {
          const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', bookingData.customer_email)
            .limit(1);
          
          if (error) throw error;
          return data;
        });
        
        const hasExistingAccount = userData && userData.length > 0;
        console.log('User exists:', hasExistingAccount);
        
        setUserExists(hasExistingAccount);
        setExistingUserWithSameEmail(hasExistingAccount);
        
        // Only show the sign-up modal if there's no existing account with this email
        if (!hasExistingAccount && !bookingData.user_id) {
          // Small delay to let the success screen be visible first
          setTimeout(() => setShowSignUpModal(true), 3000);
        }
      } else {
        setUserExists(!!user);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // Default to showing "create account" option
      setUserExists(false);
      setExistingUserWithSameEmail(false);
    } finally {
      setIsCheckingUser(false);
    }
  };

  // Link an unlinked booking to the current user
  const linkBookingToUser = async (reference: string, userId: string, retries = 2) => {
    if (!reference || !userId) return;
    
    try {
      console.log(`Linking booking ${reference} to user ${userId}`);
      
      const { error } = await supabase
        .from('trips')
        .update({ user_id: userId })
        .eq('booking_reference', reference);
      
      if (error) {
        throw error;
      }
      
      console.log('Booking linked successfully');
      trackEvent('Booking', 'Booking Linked On Signup', reference);
      
      toast({
        title: "Booking Linked",
        description: "Your booking has been linked to your account.",
        variant: "success"
      });
    } catch (error) {
      console.error('Error linking booking to user:', error);
      
      if (retries > 0) {
        console.log(`Retrying booking link... (${retries} attempts left)`);
        // Wait for a short delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return linkBookingToUser(reference, userId, retries - 1);
      }
      
      // Show user-friendly error but don't fail the flow
      toast({
        title: "Booking Link Failed",
        description: "You can link this manually in your bookings page.",
        variant: "destructive"
      });
    }
  };

  // Format date for display
  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-UK', {
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Navigate to login with prefilled email
  const handleLoginClick = () => {
    if (!bookingDetails?.customer_email) return;
    
    trackEvent('Navigation', 'Login From Booking Success', bookingReference || '');
    navigate('/login', { 
      state: { 
        prefillEmail: bookingDetails.customer_email,
        bookingReference: bookingReference
      }
    });
  };

  // Navigate to signup with prefilled details
  const handleSignupClick = () => {
    if (!bookingDetails) return;
    
    trackEvent('Navigation', 'Signup From Booking Success', bookingReference || '');
    navigate('/customer-signup', { 
      state: { 
        prefillEmail: bookingDetails.customer_email,
        prefillName: bookingDetails.customer_name,
        prefillPhone: bookingDetails.customer_phone,
        bookingReference: bookingReference
      }
    });
  };

  // Create confetti effect
  useEffect(() => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '100';
    document.body.appendChild(canvas);
    
    const context = canvas.getContext('2d');
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
    }> = [];
    
    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 5,
        alpha: 1
      });
    }
    
    const animate = () => {
      if (!context) return;
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle, i) => {
        particle.y += particle.vy;
        particle.x += particle.vx;
        particle.alpha -= 0.005;
        
        if (particle.y > canvas.height || particle.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          context.globalAlpha = particle.alpha;
          context.fillStyle = particle.color;
          context.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
      });
      
      if (particles.length > 0) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };
    
    animate();
    
    // Clean up
    return () => {
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="pt-32 pb-16">
          <div className="max-w-md mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg">Loading booking details...</p>
            </div>
          </div>
        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Booking Confirmed | Royal Transfer EU</title>
        <meta name="description" content="Your transfer booking has been confirmed. Thank you for choosing Royal Transfer EU." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="bg-white rounded-lg shadow-lg p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" aria-hidden="true" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for booking with Royal Transfer EU. Your transfer has been successfully confirmed.
            </p>
            
            {bookingReference && (
              <div className="mb-8 text-center bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Booking Reference</p>
                <p className="font-mono text-3xl font-bold">{bookingReference}</p>
                <p className="text-sm text-gray-500 mt-2">Please keep this reference for your records</p>
              </div>
            )}
            
            <div className="bg-gray-50 p-6 rounded-lg mb-8 text-left">
              <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
              {error ? (
                <div className="text-red-600 p-4 bg-red-50 rounded-md">
                  <p>{error}</p>
                </div>
              ) : bookingDetails ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium">{bookingDetails.pickup_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-medium">{bookingDetails.dropoff_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transfer Date:</span>
                    <span className="font-medium">
                      {formatDateTime(bookingDetails.datetime)}
                    </span>
                  </div>
                  {bookingDetails.is_return && bookingDetails.return_datetime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Return Date:</span>
                      <span className="font-medium">
                        {formatDateTime(bookingDetails.return_datetime)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium">{bookingDetails.vehicle_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passengers:</span>
                    <span className="font-medium">{bookingDetails.passengers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Luggage:</span>
                    <span className="font-medium">{bookingDetails.luggage_count || 0} items</span>
                  </div>
                  {bookingDetails.extra_items && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Extras:</span>
                      <span className="font-medium">{bookingDetails.extra_items.replace(/,/g, ', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">€{(bookingDetails.estimated_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize">{bookingDetails.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Confirmed</span>
                  </div>
                  {bookingDetails.notes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Notes:</span>
                      <span className="font-medium">{bookingDetails.notes}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No detailed booking information available.</p>
              )}
            </div>
            
            <div className="space-y-4 mb-8">
              <p className="text-gray-700">
                A confirmation email has been sent to your email address with all the details of your booking.
              </p>
              <p className="text-gray-700">
                If you have any questions or need to modify your booking, please contact our customer support team.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              {user ? (
                <button 
                  onClick={() => {
                    trackEvent('Navigation', 'Post-Booking Click', 'View My Bookings');
                    navigate('/bookings');
                  }}
                  className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all duration-300"
                >
                  View My Bookings
                </button>
              ) : isCheckingUser ? (
                <button 
                  disabled
                  className="bg-gray-300 text-gray-600 px-6 py-3 rounded-md flex items-center justify-center"
                >
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking Account...
                </button>
              ) : existingUserWithSameEmail ? (
                <button
                  onClick={handleLoginClick}
                  className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all duration-300 flex items-center justify-center"
                >
                  <User className="w-5 h-5 mr-2" />
                  Sign In To Manage Booking
                </button>
              ) : (
                <button
                  onClick={handleSignupClick}
                  className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all duration-300 flex items-center justify-center"
                >
                  <User className="w-5 h-5 mr-2" />
                  Create Account to Manage Booking
                </button>
              )}
              <button
                onClick={() => {
                  trackEvent('Navigation', 'Post-Booking Click', 'Return to Home');
                  navigate('/');
                }}
                className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
              >
                Return to Home
              </button>
            </div>
          </motion.div>

          <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-center mb-6">What's Next?</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Confirmation Email</h3>
                  <p className="text-sm text-gray-600">
                    Check your inbox for detailed booking information
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Driver Assignment</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive driver details 24 hours before pickup
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Ready to Go</h3>
                  <p className="text-sm text-gray-600">
                    Your driver will meet you at the specified location
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <a 
                href="/contact" 
                className="inline-flex items-center text-black hover:text-gray-700"
                onClick={() => trackEvent('Navigation', 'Post-Booking Click', 'Contact Support')}
              >
                Need help? Contact support
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Sign-up Modal for non-logged in users */}
      {bookingDetails && bookingReference && !user && !existingUserWithSameEmail && (
        <SignUpModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          email={bookingDetails.customer_email || ''}
          bookingReference={bookingReference}
          name={bookingDetails.customer_name || ''}
          phone={bookingDetails.customer_phone || ''}
        />
      )}
      
    </div>
  );
};

export default BookingSuccess;
