import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../components/ui/use-toast';
import { useAnalytics } from '../hooks/useAnalytics';
import { fetchWithCors, getApiUrl } from '../utils/corsHelper';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  
  const { bookingState, setBookingState, clearBookingState } = useBooking();
  
  // Track if initial fetch has been done
  const initialFetchDone = useRef(false);
  
  // Add component mount tracking to prevent updates on unmounted component
  const isMountedRef = useRef(true);

  // Clean up booking state when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear booking state on unmount to prevent stale data affecting future visits
      clearBookingState();
    };
  }, [clearBookingState]);
  
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
      if (isMountedRef.current) {
        toast({
          title: "Missing Information",
          description: "Required booking details are missing.",
          variant: "destructive"
        });
      }
      return null;
    }
    
    try {
      // We need to geocode the addresses first
      const fromDecoded = decodeURIComponent(from).replace(/-/g, ' ');
      const toDecoded = decodeURIComponent(to).replace(/-/g, ' ');
      
      // Use Google Maps Geocoding API
      if (!window.google?.maps?.Geocoder) {
        if (isMountedRef.current) {
          toast({
            title: "Geocoding Not Available",
            description: "Google Maps could not be loaded. Please try again later.",
            variant: "destructive"
          });
        }
        return null;
      }
      
      const geocoder = new google.maps.Geocoder();
      
      // Geocode pickup location
      let pickupCoords: { lat: number, lng: number } | null = null;
      try {
        const pickupResult = await new Promise<google.maps.GeocoderResult[] | null>((resolve, reject) => {
          geocoder.geocode({ address: fromDecoded }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
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
          console.log('Geocoded pickup coordinates:', pickupCoords);
        }
      } catch (error) {
        console.error('Error geocoding pickup location:', error);
      }
      
      // Check if component is still mounted before continuing
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting fetchPrices after pickup geocoding');
        return null;
      }
      
      // Geocode dropoff location
      let dropoffCoords: { lat: number, lng: number } | null = null;
      try {
        const dropoffResult = await new Promise<google.maps.GeocoderResult[] | null>((resolve, reject) => {
          geocoder.geocode({ address: toDecoded }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
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
          console.log('Geocoded dropoff coordinates:', dropoffCoords);
        }
      } catch (error) {
        console.error('Error geocoding dropoff location:', error);
      }
      
      // Check if component is still mounted before continuing
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting fetchPrices after dropoff geocoding');
        return null;
      }
      
      if (!pickupCoords || !dropoffCoords) {
        if (isMountedRef.current) {
          toast({
            title: "Geocoding Failed",
            description: "Could not determine location coordinates. Please try entering more specific addresses.",
            variant: "destructive"
          });
        }
        return null;
      }
      
      // Format the pickup time
      const pickupTimeISO = formatDateForApi(date);
      if (!pickupTimeISO) {
        if (isMountedRef.current) {
          toast({
            title: "Invalid Date",
            description: "The selected date is invalid. Please choose a different date.",
            variant: "destructive"
          });
        }
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
      
      // Check if component is still mounted before processing response
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting fetchPrices after API request');
        return null;
      }
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read error details';
        }
        
        const errorDetail = `Status: ${response.status}, Text: ${response.statusText}, Details: ${errorText}`;
        console.error('API Error:', errorDetail);
        
        throw new Error(`API Error: ${errorDetail}`);
      }
      
      const data: PricingResponse = await response.json();
      console.log('Pricing data received:', data);
      
      // Track successful price fetch
      if (isMountedRef.current) {
        trackEvent('Booking', 'Price Fetched', `${from} to ${to}`);
      }
      
      return data;
    } catch (error) {
      // Check if component is still mounted before handling error
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting error handling in fetchPrices');
        return null;
      }
      
      console.error('Error fetching prices:', error);
      
      if (isMountedRef.current) {
        toast({
          title: "Pricing Error",
          description: error.message || "Failed to get pricing information. Please try again later.",
          variant: "destructive"
        });
      }
      
      return null;
    }
  };
  
  // Initialize booking state from URL parameters
  useEffect(() => {
    // Skip if we don't have the required params
    if (!from || !to || !date) return;

    // If we already have state that matches the URL parameters and has prices, we don't need to refetch
    if (
      bookingState.from === decodeURIComponent(from).replace(/-/g, ' ') &&
      bookingState.to === decodeURIComponent(to).replace(/-/g, ' ') &&
      bookingState.departureDate === date &&
      bookingState.returnDate === (returnDate === '0' ? undefined : returnDate) &&
      bookingState.passengers === Number(passengers) &&
      bookingState.pricingResponse
    ) {
      console.log("Using existing state and prices");
      initialFetchDone.current = true;
      return;
    }

    const initBooking = async () => {
      // Check if component is still mounted before proceeding
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting initBooking');
        return;
      }

      console.log("Initializing booking state from URL params");
      
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
        
        const pricingResponse = await fetchPrices();
        
        // Check if component is still mounted before updating state
        if (!isMountedRef.current) {
          console.log('Component unmounted after price fetch');
          return;
        }
        
        if (pricingResponse) {
          // Update booking state with pricing data
          setBookingState(prev => ({
            ...prev,
            pricingResponse
          }));
        }
        
        initialFetchDone.current = true;
      }
    };

    initBooking();
  }, [from, to, type, date, returnDate, passengers, setBookingState, toast, trackEvent, bookingState.fromDisplay, bookingState.toDisplay, bookingState.pricingResponse]);

  // Handle step navigation based on context
  const currentStep = bookingState.step;
  
  return (
    <div className="bg-gray-50 min-h-screen pt-20">
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