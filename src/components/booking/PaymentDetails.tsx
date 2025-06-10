import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, CreditCard, Banknote, Tag, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../contexts/BookingContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import BookingLayout from './BookingLayout';
import { supabase } from '../../lib/supabase';
import { generateBookingReference } from '../../utils/bookingHelper';
import { extras } from '../../data/extras';
import { useToast } from '../ui/use-toast';

const PaymentDetails = () => {
  const { bookingState, setBookingState, validateStep } = useBooking();
  const { user, userData } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(true); // Open by default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Check for missing required data before submitting
  useEffect(() => {
    // Validate that all previous steps are complete
    const errors = validateStep(3);
    if (errors.length > 0) {
      setValidationError(errors[0].message);
    } else {
      setValidationError(null);
    }
  }, [bookingState, validateStep]);

  const handleStripeCheckout = async () => {
    try {
      setIsSubmitting(true);
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

      // Get the vehicle price from API response if available
      const vehiclePrice = getApiVehiclePrice(bookingState.selectedVehicle.id) || bookingState.selectedVehicle.price;

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
        vehicle: {
          ...bookingState.selectedVehicle,
          price: vehiclePrice // Use API price if available
        },
        customer: {
          title: bookingState.personalDetails?.title,
          firstName: bookingState.personalDetails?.firstName,
          lastName: bookingState.personalDetails?.lastName,
          email: customerEmail,
          phone: bookingState.personalDetails?.phone,
          user_id: user?.id || null
        },
        extras: Array.from(bookingState.personalDetails?.selectedExtras || []),
        // Add the new fields
        extraStops: bookingState.personalDetails?.extraStops || [],
        childSeats: bookingState.personalDetails?.childSeats || {},
        luggageCount: bookingState.personalDetails?.luggageCount || 0,
        flight_number: bookingState.personalDetails?.flightNumber || null,
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

      // Get the full response data
      const responseData = await response.json();

      // Log entire response for debugging
      console.log("Full checkout response:", responseData);

      if (!response.ok) {
        // Extract detailed error information if available
        const errorDetails = responseData.error ? responseData.error : 'Unknown error occurred';
        const errorDetailsStr = typeof errorDetails === 'object' 
          ? JSON.stringify(errorDetails) 
          : errorDetails;
        
        console.error("Checkout session error response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorDetailsStr,
          details: responseData.details || {}
        });
        
        // Throw an informative error
        throw new Error(JSON.stringify({
          message: errorDetails,
          status: response.status,
          statusText: response.statusText
        }));
      }

      if (!responseData.sessionUrl) {
        console.error("Missing sessionUrl in response:", responseData);
        throw new Error("Invalid response from payment service. Missing checkout URL.");
      }
      
      // Track successful Stripe checkout creation
      trackEvent('Payment', 'Stripe Checkout Created', bookingReference, calculateTotal());
      
      // Redirect to Stripe Checkout
      window.location.href = responseData.sessionUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      trackEvent('Payment', 'Payment Error', error.message, 0, true);
      
      // Provide more informative error messages to users
      let errorMessage;
      let debugDetails = '';
      
      try {
        // Try to parse the error if it's in JSON format
        const parsedError = JSON.parse(error.message);
        
        // Create user-friendly message based on error type or status
        if (parsedError.status === 401 || parsedError.status === 403) {
          errorMessage = "Authentication failed. Please try logging in again.";
        } else if (parsedError.status >= 500) {
          errorMessage = "Our payment service is experiencing issues. Please try again later.";
        } else if (parsedError.message && typeof parsedError.message === 'string') {
          // Use the error message directly if it exists and is a string
          errorMessage = parsedError.message;
        } else {
          errorMessage = "An error occurred during payment processing.";
        }
        
        // In development, create detailed debug info
        if (import.meta.env.DEV) {
          debugDetails = `\n\nDebug Info (DEV ONLY):
          Type: ${parsedError.errorType || 'Unknown'}
          Code: ${parsedError.errorCode || 'N/A'}
          Request ID: ${parsedError.requestId || 'N/A'}
          Status: ${parsedError.status || 'N/A'}
          Status Text: ${parsedError.statusText || 'N/A'}
          Message: ${parsedError.message || 'No additional message'}`;
        }
      } catch (parseError) {
        // If parsing fails, use the original error message
        errorMessage = error.message;
        
        // Handle common error scenarios with user-friendly messages
        if (error.message.includes("Stripe")) {
          errorMessage = "There was a problem with our payment provider. Please try again later or contact support.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        }
        
        // Add raw error message in development
        if (import.meta.env.DEV) {
          debugDetails = `\n\nDebug Info (DEV ONLY):\nRaw Error: ${error.message}`;
        }
      }
      
      setError(`Payment Error: ${errorMessage}${debugDetails}`);
      setIsSubmitting(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleBook = async () => {
    // First check if there are any validation errors
    const errors = validateStep(3);
    if (errors.length > 0) {
      setValidationError(errors[0].message);
      toast({
        title: "Missing Information",
        description: errors[0].message,
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === 'card') {
      handleStripeCheckout();
    } else {
      // Handle cash payment
      try {
        setIsSubmitting(true);
        setError(null);
        
        // Generate booking reference for cash payment
        const bookingReference = generateBookingReference();
        
        // Store the booking reference in the context
        setBookingState(prev => ({
          ...prev,
          bookingReference
        }));
        
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
        
        // Get the vehicle price from API response if available
        const vehiclePrice = getApiVehiclePrice(bookingState.selectedVehicle.id) || bookingState.selectedVehicle.price;
        
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
          vehicle: {
            ...bookingState.selectedVehicle,
            price: vehiclePrice // Use API price if available
          },
          customer: {
            title: bookingState.personalDetails?.title,
            firstName: bookingState.personalDetails?.firstName,
            lastName: bookingState.personalDetails?.lastName,
            email: customerEmail,
            phone: bookingState.personalDetails?.phone,
            user_id: user?.id || null
          },
          extras: Array.from(bookingState.personalDetails?.selectedExtras || []),
          // Add the new fields
          extraStops: bookingState.personalDetails?.extraStops || [],
          childSeats: bookingState.personalDetails?.childSeats || {},
          luggageCount: bookingState.personalDetails?.luggageCount || 0,
          flight_number: bookingState.personalDetails?.flightNumber || null,
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
        
        if (!response.ok) {
          // Read the error response
          const errorData = await response.json();
          console.error("Cash booking error response:", errorData);
          
          // Extract detailed error information for debugging
          const errorDetails = import.meta.env.DEV 
            ? `\n\nDebug Info (DEV ONLY):\n${JSON.stringify(errorData, null, 2)}`
            : '';
          
          // Provide a specific error message
          throw new Error(`${errorData.error || 'Failed to create booking'}${errorDetails}`);
        }
        
        const responseData = await response.json();
        
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
      } catch (error) {
        console.error('Error processing cash booking:', error);
        trackEvent('Booking', 'Cash Booking Error', error.message, 0, true);
        setError(`Failed to create booking: ${error.message}`);
        setIsSubmitting(false);
      }
    }
  };

  // Function to get API price for a vehicle
  const getApiVehiclePrice = (vehicleId: string): number | null => {
    if (!bookingState.pricingResponse) return null;
    
    const apiCategoryMap: Record<string, string> = {
      'economy-sedan': 'standard_sedan',
      'premium-sedan': 'premium_sedan',
      'vip-sedan': 'vip_sedan',
      'standard-minivan': 'standard_minivan',
      'xl-minivan': 'xl_minivan',
      'vip-minivan': 'vip_minivan',
      'sprinter-8': 'sprinter_8_pax',
      'sprinter-16': 'sprinter_16_pax',
      'sprinter-21': 'sprinter_21_pax',
      'bus-51': 'coach_51_pax'
    };
    
    const apiCategory = apiCategoryMap[vehicleId];
    if (!apiCategory) return null;
    
    const priceInfo = bookingState.pricingResponse.prices.find(p => p.category === apiCategory);
    return priceInfo ? priceInfo.price : null;
  };

  const calculateTotal = () => {
    // Get the API price for the selected vehicle if available
    const basePrice = getApiVehiclePrice(bookingState.selectedVehicle?.id) || bookingState.selectedVehicle?.price || 0;
    
    // Calculate extras total with child seat quantities
    const extrasTotal = Array.from(bookingState.personalDetails?.selectedExtras || [])
      .reduce((total, extraId) => {
        const extra = extras.find(e => e.id === extraId);
        if (!extra) return total;
        
        // If it's a child seat, multiply by quantity
        if (['child-seat', 'infant-seat', 'booster-seat'].includes(extraId)) {
          const quantity = bookingState.personalDetails?.childSeats?.[extraId] || 1;
          return total + (extra.price * quantity);
        }
        
        // If it's an extra stop, multiply by the number of stops
        if (extraId === 'extra-stop') {
          const stopCount = bookingState.personalDetails?.extraStops?.length || 0;
          return total + (extra.price * stopCount);
        }
        
        return total + (extra.price || 0);
      }, 0);
      
    return basePrice + extrasTotal;
  };

  // Generate price details including the API price if available and extra stops/child seats
  const getPriceDetails = () => {
    const vehiclePrice = getApiVehiclePrice(bookingState.selectedVehicle?.id) || bookingState.selectedVehicle?.price || 0;
    
    const details = [
      { 
        label: bookingState.selectedVehicle?.name || 'Vehicle Transfer', 
        price: vehiclePrice
      }
    ];
    
    // Add child seats with quantities
    const childSeatExtras = ['child-seat', 'infant-seat', 'booster-seat'];
    Array.from(bookingState.personalDetails?.selectedExtras || [])
      .filter(id => childSeatExtras.includes(id))
      .forEach(extraId => {
        const extra = extras.find(e => e.id === extraId);
        if (extra) {
          const quantity = bookingState.personalDetails?.childSeats?.[extraId] || 1;
          details.push({
            label: `${extra.name} × ${quantity}`,
            price: extra.price * quantity
          });
        }
      });
    
    // Add extra stops if any
    const extraStopCount = bookingState.personalDetails?.extraStops?.length || 0;
    if (extraStopCount > 0) {
      const extraStopPrice = extras.find(e => e.id === 'extra-stop')?.price || 10.00;
      details.push({
        label: `Extra ${extraStopCount === 1 ? 'Stop' : 'Stops'} (${extraStopCount})`,
        price: extraStopPrice * extraStopCount
      });
    }
    
    // Add other extras (not child seats or stops)
    Array.from(bookingState.personalDetails?.selectedExtras || [])
      .filter(id => !childSeatExtras.includes(id) && id !== 'extra-stop')
      .forEach(extraId => {
        const extra = extras.find(e => e.id === extraId);
        if (extra) {
          details.push({
            label: extra.name,
            price: extra.price
          });
        }
      });

    return details;
  };

  const priceDetails = getPriceDetails();
  const total = priceDetails.reduce((sum, item) => sum + item.price, 0);

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <BookingLayout
      currentStep={3}
      totalPrice={total}
      onNext={handleBook}
      nextButtonText={isSubmitting ? "Processing..." : "Complete Booking"}
      showNewsletter={true}
      preventScrollOnNext={true}
      validateBeforeNext={false} // We'll handle validation ourselves
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl mb-8">Payment Details</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-medium">Payment Error</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        )}
        
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Missing Information</p>
              <p>{validationError}</p>
              <p className="text-sm mt-1">Please go back and complete all required information.</p>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8" id="payment-method-section">
          <h2 className="text-xl mb-4">Choose Payment Method</h2>
          
          <div className="space-y-4">
            <label className="block p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="h-5 w-5 text-blue-600"
                  id="payment-card"
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
                  className="h-5 w-5 text-blue-600"
                  id="payment-cash"
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
        <section className="bg-white rounded-lg shadow-md p-6 mb-8" id="discount-section">
          <button
            onClick={() => setShowDiscount(!showDiscount)}
            className="flex items-center text-black hover:text-gray-600"
            aria-expanded={showDiscount}
            id="discount-toggle-button"
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
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    aria-label="Discount code"
                    id="discount-code-input"
                  />
                  <button
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      trackEvent('Payment', 'Apply Discount', discountCode);
                    }}
                    id="apply-discount-button"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Price Breakdown */}
        <section className="bg-white rounded-lg shadow-md p-6" id="price-details-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Price Details</h2>
            <button
              onClick={() => setShowPriceDetails(!showPriceDetails)}
              className="text-black hover:text-gray-700 flex items-center"
              aria-expanded={showPriceDetails}
              id="price-details-toggle"
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

          <AnimatePresence initial={false}>
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
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
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
