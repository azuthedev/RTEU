import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '../contexts/BookingContext';
import { vehicles } from '../data/vehicles';
import BookingTopBar from '../components/booking/BookingTopBar';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';
import { getApiUrl, fetchWithCors } from '../utils/corsHelper';
import { generateBookingReference } from '../utils/bookingHelper';

const BookingFlow = () => {
  const { bookingState, setBookingState } = useBooking();
  const { from, to, type, date, returnDate, passengers } = useParams<{
    from: string;
    to: string;
    type: string;
    date: string;
    returnDate: string;
    passengers: string;
  }>();
  
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const [isLoading, setIsLoading] = useState(true);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Helper to properly capitalize and format location names
  const formatLocationName = (name: string): string => {
    if (!name) return '';
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Initialize booking state from URL parameters
  useEffect(() => {
    // Skip if already initialized or if we're missing required params
    if (hasInitialized.current || !from || !to || !date) {
      setIsLoading(false);
      return;
    }
    
    console.log("Initializing booking state from URL params", { from, to, type, date, returnDate, passengers });

    // If we already have data in state for these locations, preserve it
    if (bookingState.from === from && bookingState.to === to && bookingState.fromDisplay && bookingState.toDisplay) {
      console.log("Preserving existing location display names", { 
        fromDisplay: bookingState.fromDisplay, 
        toDisplay: bookingState.toDisplay 
      });
      hasInitialized.current = true;
      setIsLoading(false);
      return;
    }

    // Format location names from URL for display
    const fromDisplay = bookingState.fromDisplay || formatLocationName(from);
    const toDisplay = bookingState.toDisplay || formatLocationName(to);
    
    // Parse the isReturn parameter
    const isReturn = type === 'return';
    
    // Calculate number of passengers
    const numPassengers = parseInt(passengers || '1', 10);
    
    // Select appropriate vehicle based on passengers
    let selectedVehicle = vehicles[0]; // Default to first vehicle
    if (numPassengers > 4 && numPassengers <= 7) {
      // For 5-7 passengers, select Standard Minivan (index 3)
      selectedVehicle = vehicles[3] || vehicles[0];
    } else if (numPassengers > 7) {
      // For 8+ passengers, select XL Minivan (index 4) 
      selectedVehicle = vehicles[4] || vehicles[0];
    }
    
    // Update booking state with URL parameters
    setBookingState(prev => ({
      ...prev,
      from,
      to,
      fromDisplay,
      toDisplay,
      isReturn,
      departureDate: date,
      returnDate: returnDate || undefined,
      passengers: numPassengers,
      selectedVehicle,
      // Preserve existing personalDetails and paymentDetails
    }));
    
    // Fetch prices unless we already have pricing data
    if (!bookingState.pricingResponse) {
      getPriceQuote(from, to, selectedVehicle.id);
    }
    
    hasInitialized.current = true;
    
  }, [from, to, type, date, returnDate, passengers, setBookingState]);

  // Update document title
  useEffect(() => {
    document.title = `Book Your Transfer | ${bookingState.fromDisplay || formatLocationName(from || '')} to ${bookingState.toDisplay || formatLocationName(to || '')}`;
  }, [bookingState.fromDisplay, bookingState.toDisplay, from, to]);

  // Function to fetch price quote from API
  const getPriceQuote = async (fromLocation: string, toLocation: string, vehicleType: string) => {
    setIsPriceLoading(true);
    setError(null);
    
    try {
      trackEvent('Booking', 'Price Quote Request', `${fromLocation} to ${toLocation}`);
      
      // Format the API request URL
      const apiUrl = getApiUrl('/check-price');
      
      // Prepare the request body
      const requestBody = {
        pickup: fromLocation,
        dropoff: toLocation,
        vehicle_type: vehicleType || 'economy-sedan',
        date: bookingState.departureDate || date,
        return_date: bookingState.isReturn ? bookingState.returnDate || returnDate : null,
        passengers: bookingState.passengers || parseInt(passengers || '1', 10)
      };
      
      console.log('Fetching prices with request:', requestBody);
      
      // Make the API request
      const response = await fetchWithCors(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching price quote:', errorText);
        throw new Error(`Failed to get price quote: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Price quote received:', data);
      
      // Update booking state with pricing data
      setBookingState(prev => ({
        ...prev,
        pricingResponse: data
      }));
      
      // Track success
      trackEvent('Booking', 'Price Quote Success', `${data.prices?.length || 0} prices`);
    } catch (error: any) {
      console.error('Error fetching price quote:', error);
      setError(`Failed to get price quote: ${error.message}`);
      trackEvent('Booking', 'Price Quote Error', error.message);
      
      // Set a fallback price if API fails
      setBookingState(prev => ({
        ...prev,
        pricingResponse: {
          prices: vehicles.map(v => ({
            category: v.id,
            price: v.price,
            currency: 'EUR'
          })),
          selected_category: prev.selectedVehicle?.id || vehicles[0].id,
          details: {
            pickup_time: new Date().toISOString(),
            pickup_location: { lat: 0, lng: 0 },
            dropoff_location: { lat: 0, lng: 0 }
          }
        }
      }));
    } finally {
      setIsPriceLoading(false);
      setIsLoading(false);
    }
  };

  // Get content based on current step
  const getCurrentStepContent = () => {
    switch (bookingState.step) {
      case 1:
        return <VehicleSelection isLoading={isPriceLoading} />;
      case 2:
        return <PersonalDetails />;
      case 3:
        return <PaymentDetails />;
      default:
        return <VehicleSelection isLoading={isPriceLoading} />;
    }
  };

  // Animation variants for page transitions
  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  // Calculate animation direction based on previous step
  const getAnimationDirection = () => {
    const prevStep = bookingState.previousStep || 1;
    return bookingState.step > prevStep ? 1 : -1;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-t-4 border-b-4 border-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Loading your transfer...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !bookingState.pricingResponse) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Error Loading Transfer</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => {
                // Retry fetching prices
                if (from && to) {
                  getPriceQuote(from, to, bookingState.selectedVehicle.id);
                }
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="mt-4 block w-full text-blue-600 hover:text-blue-800 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <BookingTopBar />
      
      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" custom={getAnimationDirection()}>
            <motion.div
              key={bookingState.step}
              custom={getAnimationDirection()}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              className="py-6"
            >
              {getCurrentStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default BookingFlow;