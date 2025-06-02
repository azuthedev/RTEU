import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, ArrowRight, Loader2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import SignUpModal from '../components/SignUpModal';
import { Helmet } from 'react-helmet-async';
import { useToast } from '../components/ui/use-toast';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [existingUserWithSameEmail, setExistingUserWithSameEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const { toast } = useToast();
  const [checkingUserAccount, setCheckingUserAccount] = useState(true);
  
  useEffect(() => {
    // Get the booking reference from the URL query parameters
    const params = new URLSearchParams(location.search);
    
    // Check for direct reference first (from both card and cash payments)
    const reference = params.get('reference');
    
    // Then check for Stripe session_id as fallback (legacy format)
    const sessionId = params.get('session_id');
    
    // Use the first available reference
    const bookingRef = reference || sessionId;
    setBookingReference(bookingRef);
    
    if (bookingRef) {
      // Small delay to ensure data is inserted in DB
      setTimeout(() => {
        fetchBookingDetails(bookingRef);
      }, 1000);
    }
    
    // Track booking success
    trackEvent('Booking', 'Booking Success', bookingRef || 'Unknown');
    
  }, [location, trackEvent]);
  
  const fetchBookingDetails = async (reference: string) => {
    setLoading(true);
    try {
      console.log('Fetching booking details for reference:', reference);
      
      // Try to find booking using reference
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('booking_reference', reference)
        .single();
      
      if (error) {
        console.error('Error fetching booking details:', error);
        
        // Fall back to a more permissive query if the exact match fails
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('trips')
            .select('*')
            .ilike('booking_reference', `%${reference}%`)
            .limit(1);
          
          if (fallbackError) {
            throw fallbackError;
          }
          
          if (!fallbackData || fallbackData.length === 0) {
            throw new Error('No matching booking found with reference: ' + reference);
          }
          
          setBookingDetails(fallbackData[0]);
          console.log('Booking data found with fallback query:', fallbackData[0]);
          
          // Check for existing user with this email
          checkForExistingUser(fallbackData[0]);

          // Send booking confirmation email
          if (!emailSent) {
            sendBookingConfirmationEmail(fallbackData[0]);
          }
        } catch (fallbackError) {
          console.error('Fallback query error:', fallbackError);
          toast({
            title: "Error",
            description: "Could not find your booking. Please contact support.",
            variant: "destructive"
          });
        }
        return;
      }
      
      console.log('Booking data result:', data);
      
      if (data) {
        setBookingDetails(data);
        // Check for existing user with this email
        checkForExistingUser(data);

        // Send booking confirmation email
        if (!emailSent) {
          sendBookingConfirmationEmail(data);
        }
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast({
        title: "Error",
        description: "There was an issue retrieving your booking details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendBookingConfirmationEmail = async (bookingData: any) => {
    // Prevent duplicate emails
    if (emailSent || emailSending) {
      return;
    }

    setEmailSending(true);
    try {
      // Get webhook secret
      const webhookSecret = import.meta.env.WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('Missing WEBHOOK_SECRET - email sending disabled');
        // Don't fail the page, just skip email
        return;
      }

      // Format datetime for email
      const formatDate = (dateStr: string) => {
        try {
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          return dateStr || 'Not specified';
        }
      };

      // Format price for email
      const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'EUR',
        }).format(price);
      };

      // Validate booking data to ensure we have required fields
      if (!bookingData.customer_email) {
        console.error('Missing required email field in booking data');
        return;
      }

      // Prepare email data with flat structure
      const emailData = {
        name: bookingData.customer_name || 'Valued Customer',
        email: bookingData.customer_email,
        booking_id: bookingData.booking_reference,
        email_type: "BookingReference",
        pickup_location: bookingData.pickup_address,
        dropoff_location: bookingData.dropoff_address,
        pickup_datetime: formatDate(bookingData.datetime),
        vehicle_type: bookingData.vehicle_type || 'Standard Vehicle',
        passengers: bookingData.passengers || 1,
        total_price: formatPrice(bookingData.estimated_price || 0)
      };

      console.log('Sending booking confirmation email with data:', emailData);

      // Make request to email webhook with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-webhook`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify(emailData),
            signal: controller.signal
          }
        );

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Email webhook failed:', response.status, errorText);
          // Continue gracefully - don't block user experience
          return;
        }

        const data = await response.json();
        console.log('Email webhook response:', data);

        // Mark email as sent
        setEmailSent(true);
        trackEvent('Email', 'Booking Confirmation Sent', bookingData.booking_reference);

        // Show success toast
        toast({
          title: "Booking Confirmation Sent",
          description: "A confirmation email has been sent to your email address.",
          variant: "success"
        });
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        if (fetchError.name === 'AbortError') {
          console.error('Email webhook request timed out');
        }
        // Continue without interrupting user flow
      }
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      trackEvent('Email', 'Booking Confirmation Error', error.message);
      
      // Don't show error to user for non-critical operation
    } finally {
      setEmailSending(false);
    }
  };
  
  const checkForExistingUser = async (bookingData: any) => {
    if (!user && bookingData?.customer_email) {
      setCheckingUserAccount(true);
      try {
        const { data: existingUserData, error } = await supabase
          .from('users')
          .select('id')
          .eq('email', bookingData.customer_email)
          .limit(1);
          
        if (error) {
          throw error;
        }
          
        const hasExistingAccount = existingUserData && existingUserData.length > 0;
        setExistingUserWithSameEmail(hasExistingAccount);
        
        // Only show the sign-up modal if there's no existing account with this email
        if (!hasExistingAccount && !bookingData.user_id) {
          // Small delay to let the success screen be visible first
          setTimeout(() => setShowSignUpModal(true), 3000);
        }
      } catch (error) {
        console.error('Error checking user existence:', error);
        setExistingUserWithSameEmail(false);
      } finally {
        setCheckingUserAccount(false);
      }
    } else {
      setCheckingUserAccount(false);
    }
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
              {loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
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
              ) : checkingUserAccount ? (
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
                <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
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

      <Sitemap />
    </div>
  );
};

export default BookingSuccess;