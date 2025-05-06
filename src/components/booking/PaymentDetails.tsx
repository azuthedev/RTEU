import React, { useState } from 'react';
import { ChevronDown, CreditCard, Banknote, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import BookingLayout from './BookingLayout';
import { supabase } from '../../lib/supabase';
import { generateBookingReference } from '../../utils/bookingHelper';

const PaymentDetails = () => {
  const { bookingState, setBookingState } = useBooking();
  const { user, userData } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStripeCheckout = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Ensure email is valid - first check user data from auth context
      let customerEmail = userData?.email;
      
      // Fallback to the form data if not available in userData
      if (!customerEmail && bookingState.personalDetails?.email) {
        customerEmail = bookingState.personalDetails.email;
      }
      
      // Validate email
      if (!customerEmail || !isValidEmail(customerEmail)) {
        throw new Error("Invalid email address. Please enter a valid email in your profile or booking details.");
      }

      // Generate booking reference right before checkout
      const bookingReference = generateBookingReference();

      // Store the booking reference in the context
      setBookingState(prev => ({
        ...prev,
        bookingReference
      }));

      // Prepare booking data for the checkout session
      const bookingData = {
        booking_reference: bookingReference,
        trip: {
          from: bookingState.personalDetails?.pickup || bookingState.from || 'Unknown location',
          to: bookingState.personalDetails?.dropoff || bookingState.to || 'Unknown location',
          type: bookingState.isReturn ? 'round-trip' : 'one-way',
          date: bookingState.departureDate || new Date().toISOString(),
          returnDate: bookingState.returnDate || null,
          passengers: bookingState.passengers || 1
        },
        vehicle: bookingState.selectedVehicle,
        customer: {
          title: bookingState.personalDetails?.title,
          firstName: bookingState.personalDetails?.firstName,
          lastName: bookingState.personalDetails?.lastName,
          email: customerEmail,
          phone: bookingState.personalDetails?.phone,
          user_id: user?.id || null
        },
        extras: Array.from(bookingState.personalDetails?.selectedExtras || []),
        amount: calculateTotal(), 
        discountCode: discountCode || null,
        payment_method: paymentMethod
      };

      console.log("Sending booking data:", bookingData);

      // Track attempt to create stripe checkout
      trackEvent('Payment', 'Stripe Checkout Initiated', bookingReference, calculateTotal());

      // Call the Supabase Edge Function to create a checkout session
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(bookingData)
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Checkout session error response:", responseData);
        throw new Error(responseData.error || 'Failed to create checkout session');
      }

      if (!responseData.sessionUrl) {
        console.error("Missing sessionUrl in response:", responseData);
        throw new Error("Invalid response from payment service. Missing session URL.");
      }
      
      // Track successful Stripe checkout creation
      trackEvent('Payment', 'Stripe Checkout Created', bookingReference, calculateTotal());
      
      // Redirect to Stripe Checkout
      window.location.href = responseData.sessionUrl;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      trackEvent('Payment', 'Payment Error', error.message, 0, true);
      
      // Provide more informative error messages to users
      let errorMessage = error.message;
      
      // Handle common error scenarios with user-friendly messages
      if (error.message.includes("Stripe")) {
        errorMessage = "There was a problem connecting to our payment provider. Please try again later or contact support.";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setError(`Payment Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleBook = async () => {
    if (paymentMethod === 'card') {
      handleStripeCheckout();
    } else {
      // Handle cash payment
      try {
        setIsProcessing(true);
        setError(null);
        
        // Generate booking reference for cash payment
        const bookingReference = generateBookingReference();
        
        // Ensure email is valid
        let customerEmail = userData?.email;
        
        // Fallback to the form data if not available in userData
        if (!customerEmail && bookingState.personalDetails?.email) {
          customerEmail = bookingState.personalDetails.email;
        }
        
        // Validate email
        if (!customerEmail || !isValidEmail(customerEmail)) {
          throw new Error("Invalid email address. Please enter a valid email in your profile or booking details.");
        }
        
        // Prepare booking data for the cash payment
        const bookingData = {
          booking_reference: bookingReference,
          trip: {
            from: bookingState.personalDetails?.pickup || bookingState.from || 'Unknown location',
            to: bookingState.personalDetails?.dropoff || bookingState.to || 'Unknown location',
            type: bookingState.isReturn ? 'round-trip' : 'one-way',
            date: bookingState.departureDate || new Date().toISOString(),
            returnDate: bookingState.returnDate || null,
            passengers: bookingState.passengers || 1
          },
          vehicle: bookingState.selectedVehicle,
          customer: {
            title: bookingState.personalDetails?.title,
            firstName: bookingState.personalDetails?.firstName,
            lastName: bookingState.personalDetails?.lastName,
            email: customerEmail,
            phone: bookingState.personalDetails?.phone,
            user_id: user?.id || null
          },
          extras: Array.from(bookingState.personalDetails?.selectedExtras || []),
          amount: calculateTotal(),
          discountCode: discountCode || null,
          payment_method: 'cash'
        };
        
        // Call the Edge Function to create the booking
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(bookingData)
          }
        );
        
        const responseData = await response.json();
        
        if (!response.ok) {
          console.error("Cash booking error response:", responseData);
          throw new Error(responseData.error || 'Failed to create booking');
        }
        
        // Update booking state
        setBookingState(prev => ({
          ...prev,
          step: 3,
          paymentDetails: {
            method: paymentMethod,
            discountCode
          },
          bookingReference
        }));
        
        // Track successful cash booking
        trackEvent('Booking', 'Cash Payment Booking', bookingReference, calculateTotal());
        
        // Navigate to success page for cash payment using React Router
        navigate(`/booking-success?reference=${bookingReference}`, { replace: true });
      } catch (error: any) {
        console.error('Error processing cash booking:', error);
        trackEvent('Booking', 'Cash Booking Error', error.message, 0, true);
        setError(`Failed to create booking: ${error.message}`);
        setIsProcessing(false);
      }
    }
  };

  const calculateTotal = () => {
    const basePrice = bookingState.selectedVehicle?.price || 0;
    const extrasTotal = Array.from(bookingState.personalDetails?.selectedExtras || [])
      .reduce((total, extraId) => {
        const extra = extras.find(e => e.id === extraId);
        return total + (extra?.price || 0);
      }, 0);
    return basePrice + extrasTotal;
  };

  // Mock extras for the example
  const extras = [
    { id: 'child-seat', name: 'Child Seat (0-3 years)', price: 5.00 },
    { id: 'infant-seat', name: 'Infant Seat (3-6 years)', price: 5.00 },
    { id: 'extra-stop', name: 'Extra Stop', price: 10.00 },
    { id: 'night-fee', name: 'Night Transfer Fee', price: 10.00 },
  ];

  const priceDetails = [
    { label: bookingState.selectedVehicle?.name || 'Vehicle Transfer', price: bookingState.selectedVehicle?.price || 0 },
    { label: 'Night Transfer Fee', price: 10.00 },
    ...(Array.from(bookingState.personalDetails?.selectedExtras || []).map(extraId => {
      const extra = extras.find(e => e.id === extraId);
      return {
        label: extra?.name || '',
        price: extra?.price || 0
      };
    }))
  ];

  const total = priceDetails.reduce((sum, item) => sum + item.price, 0);

  return (
    <BookingLayout
      currentStep={3}
      totalPrice={total}
      onNext={handleBook}
      nextButtonText={isProcessing ? "Processing..." : "Complete Booking"}
      showNewsletter={true}
      preventScrollOnNext={true}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Payment Details</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Payment Error</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Payment Method Selection */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose Payment Method</h2>
          
          <div className="space-y-4">
            <label className="block p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="h-5 w-5 text-black"
                />
                <CreditCard className="w-6 h-6 text-gray-500" aria-hidden="true" />
                <div>
                  <div className="font-medium">Pay in full now</div>
                  <div className="text-sm text-gray-500">
                    Pay the total transfer service now
                  </div>
                </div>
              </div>
            </label>

            <label className="block p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="h-5 w-5 text-black"
                />
                <Banknote className="w-6 h-6 text-gray-500" aria-hidden="true" />
                <div>
                  <div className="font-medium">Pay in cash</div>
                  <div className="text-sm text-gray-500">
                    Pay in cash to the driver at the time of the transfer
                  </div>
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Discount Code */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="flex items-center text-black hover:text-gray-600"
            aria-expanded={showDiscount}
          >
            <Tag className="w-5 h-5 mr-2" aria-hidden="true" />
            Got a Discount Code?
          </button>

          <AnimatePresence>
            {showDiscount && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4"
              >
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    aria-label="Discount code"
                  />
                  <button
                    className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                    onClick={() => {
                      trackEvent('Payment', 'Apply Discount', discountCode);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Price Breakdown */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Price Details</h2>
            <button
              onClick={() => setShowPriceDetails(!showPriceDetails)}
              className="text-black hover:text-gray-700 flex items-center"
              aria-expanded={showPriceDetails}
            >
              {showPriceDetails ? 'Hide' : 'Show'} details
              <ChevronDown
                className={`w-5 h-5 ml-1 transform transition-transform ${
                  showPriceDetails ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          <AnimatePresence>
            {showPriceDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 mb-4"
              >
                {priceDetails.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-600">
                    <span>{item.label}</span>
                    <span>€{item.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-sm text-gray-500">
            By clicking 'Complete Booking' you acknowledge that you have read and
            agree to our <a href="/terms" className="underline hover:text-black">Terms & Conditions</a> and <a href="/privacy" className="underline hover:text-black">Privacy Policy</a>.
          </div>
        </section>
      </div>
    </BookingLayout>
  );
};

export default PaymentDetails;
