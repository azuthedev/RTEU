import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';
import BookingTopBar from '../components/booking/BookingTopBar';
import { useBooking } from '../contexts/BookingContext';
import { getApiUrl, fetchWithCors } from '../utils/corsHelper';
import { useToast } from '../components/ui/use-toast';
import { useAnalytics } from '../hooks/useAnalytics';
import LoadingAnimation from '../components/LoadingAnimation';

// Interface for API price response
interface PricingResponse {
  prices: {
    category: string;
    price: number;
    currency: string;
  }[];
  selected_category: string | null;
  details: {
    pickup_time: string;
    pickup_location: {
      lat: number;
      lng: number;
    };
    dropoff_location: {
      lat: number;
      lng: number;
    };
  };
}

// Map API category names to our vehicle IDs
const apiCategoryMap: Record<string, string> = {
  'standard_sedan': 'economy-sedan',
  'premium_sedan': 'premium-sedan',
  'vip_sedan': 'vip-sedan',
  'standard_minivan': 'standard-minivan',
  'xl_minivan': 'xl-minivan',
  'vip_minivan': 'vip-minivan',
  'sprinter_8_pax': 'sprinter-8',
  'sprinter_16_pax': 'sprinter-16',
  'sprinter_21_pax': 'sprinter-21',
  'coach_51_pax': 'bus-51'
};

const BookingFlow = () => {
  const { from, to, type, date, returnDate, passengers } = useParams();
  const [isLoading, setIsLoading] = useState(false); // Default to false and only set to true if we need to fetch
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  
  const { bookingState, setBookingState } = useBooking();
  
  // Track if initial fetch has been done
  const initialFetchDone = useRef(false);
  
  // Format date for API request (YYMMDD -> ISO)
  const formatDateForApi = (dateStr: string): string | null => {
    if (!dateStr || dateStr === '0' || dateStr.length !== 6) return null;
    try {
      const year = parseInt(`20${dateStr.slice(0, 2)}`);
      const month = parseInt(dateStr.slice(2, 4)) - 1; // JS months are 0-indexed
      const day = parseInt(dateStr.slice(4, 6));
      
      const date = new Date(year, month, day, 12, 0, 0, 0); // Noon on the requested day
      if (isNaN(date.getTime())) return null;
      
      return date.toISOString();
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  };
  
  // Function to fetch prices from the API
  const fetchPrices = async (): Promise<PricingResponse | null> => {
    if (!from || !to || !date) {
      toast({
        title: "Missing Information",
        description: "Required booking details are missing.",
        variant: "destructive"
      });
      return null;
    }
    
    setIsPriceLoading(true);
    
    try {
      // We need to geocode the addresses first
      const pickupAddress = decodeURIComponent(from).replace(/-/g, ' ');
      const dropoffAddress = decodeURIComponent(to).replace(/-/g, ' ');
      
      // Use Google Maps Geocoding API
      if (!window.google?.maps?.Geocoder) {
        toast({
          title: "Geocoding Not Available",
          description: "Google Maps could not be loaded. Please try again later.",
          variant: "destructive"
        });
        return null;
      }
      
      const geocoder = new google.maps.Geocoder();
      
      // Geocode pickup location
      let pickupCoords: { lat: number, lng: number } | null = null;
      try {
        const pickupResult = await new Promise<google.maps.GeocoderResult[] | null>((resolve, reject) => {
          geocoder.geocode({ address: pickupAddress }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
              resolve(results);
            } else {
              reject(status);
            }
          });
        });
        
        if (pickupResult && pickupResult[0].geometry?.location) {
          pickupCoords = {
            lat: pickupResult[0].geometry.location.lat(),
            lng: pickupResult[0].geometry.location.lng()
          };
        }
      } catch (error) {
        console.error('Error geocoding pickup location:', error);
      }
      
      // Geocode dropoff location
      let dropoffCoords: { lat: number, lng: number } | null = null;
      try {
        const dropoffResult = await new Promise<google.maps.GeocoderResult[] | null>((resolve, reject) => {
          geocoder.geocode({ address: dropoffAddress }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
              resolve(results);
            } else {
              reject(status);
            }
          });
        });
        
        if (dropoffResult && dropoffResult[0].geometry?.location) {
          dropoffCoords = {
            lat: dropoffResult[0].geometry.location.lat(),
            lng: dropoffResult[0].geometry.location.lng()
          };
        }
      } catch (error) {
        console.error('Error geocoding dropoff location:', error);
      }
      
      if (!pickupCoords || !dropoffCoords) {
        toast({
          title: "Geocoding Failed",
          description: "Could not determine location coordinates. Please try entering more specific addresses.",
          variant: "destructive"
        });
        return null;
      }
      
      // Format the pickup time
      const pickupTimeISO = formatDateForApi(date);
      if (!pickupTimeISO) {
        toast({
          title: "Invalid Date",
          description: "The selected date is invalid. Please choose a different date.",
          variant: "destructive"
        });
        return null;
      }
      
      // Prepare payload for price API
      const payload = {
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        pickup_time: pickupTimeISO,
        trip_type: type || "1"
      };
      
      console.log('Sending price request with payload:', payload);
      
      // Make request to price API
      const apiEndpoint = getApiUrl('/check-price');
      const response = await fetchWithCors(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read error details';
        }
        
        throw new Error(`API Error: Status ${response.status}, Details: ${errorText}`);
      }
      
      const data: PricingResponse = await response.json();
      console.log('Pricing data received:', data);
      
      // Track successful price fetch
      trackEvent('Booking', 'Price Fetched', `${from} to ${to}`);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching prices:', error);
      
      toast({
        title: "Pricing Error",
        description: error.message || "Failed to get pricing information. Please try again later.",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsPriceLoading(false);
    }
  };
  
  // Initialize booking state from URL parameters
  useEffect(() => {
    // Skip if we don't have the required params
    if (!from || !to || !date) return;

    // Check if we already have state that matches the URL parameters
    // AND if we already have pricing data - skip the loading and fetching
    const hasMatchingState = 
      bookingState.from === decodeURIComponent(from).replace(/-/g, ' ') &&
      bookingState.to === decodeURIComponent(to).replace(/-/g, ' ') &&
      bookingState.departureDate === date &&
      bookingState.returnDate === (returnDate === '0' ? undefined : returnDate) &&
      bookingState.passengers === Number(passengers);
    
    const hasPricingData = !!bookingState.pricingResponse;

    if (hasMatchingState && hasPricingData) {
      console.log("Using existing state and prices - no loading needed");
      setIsLoading(false);
      initialFetchDone.current = true;
      return;
    }

    const initBooking = async () => {
      console.log("Initializing booking state from URL params");
      
      // Set loading state since we need to fetch new data
      setIsLoading(true);
      
      // Decode URL parameters (from URL-friendly format to display format)
      const fromDecoded = decodeURIComponent(from).replace(/-/g, ' ');
      const toDecoded = decodeURIComponent(to).replace(/-/g, ' ');
      
      // In case of a refresh, don't overwrite existing display names
      const fromDisplay = bookingState.fromDisplay || fromDecoded;
      const toDisplay = bookingState.toDisplay || toDecoded;
      
      // Set or update the booking state
      setBookingState(prev => {
        // Create a copy of the current state
        const updatedState = { ...prev };
        
        // Always update these values
        updatedState.from = fromDecoded;
        updatedState.to = toDecoded;
        updatedState.fromDisplay = fromDisplay;
        updatedState.toDisplay = toDisplay;
        updatedState.departureDate = date;
        updatedState.returnDate = returnDate === '0' ? undefined : returnDate;
        updatedState.passengers = passengers ? parseInt(passengers, 10) : 1;
        updatedState.isReturn = type === '2';
        
        return updatedState;
      });

      // Fetch prices if not already done
      if (!initialFetchDone.current) {
        console.log("Fetching initial prices");
        setIsPriceLoading(true);
        const pricingResponse = await fetchPrices();
        
        if (pricingResponse) {
          // Update booking state with pricing data
          setBookingState(prev => ({
            ...prev,
            pricingResponse
          }));
        }
        
        initialFetchDone.current = true;
        setIsPriceLoading(false);
      }

      // Done loading
      setIsLoading(false);
    };

    initBooking();
  }, [from, to, type, date, returnDate, passengers, setBookingState, toast, trackEvent]);

  // Handle step navigation based on context
  const currentStep = bookingState.step;
  
  // Show loading state while initializing
  if (isLoading || isPriceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8">
          <LoadingAnimation loadingComplete={!isPriceLoading && !isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-20">
      {/* TopBar with form for route modifications */}
      <div className="bg-white shadow-md rounded-xl mb-6 mx-4 relative">
        <BookingTopBar 
          from={decodeURIComponent(from || '')} 
          to={decodeURIComponent(to || '')} 
          type={type || '1'} 
          date={date || ''} 
          returnDate={returnDate} 
          passengers={passengers || '1'}
          currentStep={currentStep}
        />
      </div>
      
      {/* Main content area with step transitions */}
      <div className="container mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: bookingState.previousStep && bookingState.previousStep > 1 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              <VehicleSelection />
            </motion.div>
          )}
          
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: bookingState.previousStep && bookingState.previousStep > 2 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: bookingState.previousStep && bookingState.previousStep < 2 ? 50 : -50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              <PersonalDetails />
            </motion.div>
          )}
          
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              <PaymentDetails />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingFlow;