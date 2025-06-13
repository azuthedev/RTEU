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
import { requestTracker } from '../utils/requestTracker';
import { parseDateFromUrl } from '../utils/searchFormHelpers';

// Interface for API price response
interface PricingResponse {
  prices: Array<{
    category: string;
    price: number;
    currency: string;
  }>;
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
  version?: string;
  checksum?: string;
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
  
  // Add component mount tracking to prevent updates on unmounted component
  const isMountedRef = useRef(true);

  // Clean up booking state when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, [clearBookingState]);
  
  // Initialize booking state from URL parameters
  useEffect(() => {
    // Skip if we don't have the required params
    if (!from || !to || !date) return;

    // Check if the url params match what's already in bookingState
    const matchesExistingState = bookingState.from === decodeURIComponent(from).replace(/-/g, ' ') &&
      bookingState.to === decodeURIComponent(to).replace(/-/g, ' ') &&
      bookingState.departureDate === date &&
      bookingState.returnDate === (returnDate === '0' ? undefined : returnDate) &&
      bookingState.passengers === Number(passengers);

    // Check if we already have valid pricing data for this route
    const hasPricingData = !!bookingState.pricingResponse && !bookingState.pricingError;

    // If we have matching state AND valid pricing data, we don't need to do anything
    if (matchesExistingState && hasPricingData) {
      console.log("🟢 Using existing state and pricing data - no fetch needed");
      return;
    }

    // If state doesn't match OR we don't have valid pricing data, we need to update the state
    // But we should be careful not to trigger multiple API calls
    const initBooking = async () => {
      // Check if component is still mounted before proceeding
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting initBooking');
        return;
      }

      console.log("🔄 Initializing booking state from URL params");
      
      // Decode URL parameters (from URL-friendly format to display format)
      const fromDecoded = decodeURIComponent(from).replace(/-/g, ' ');
      const toDecoded = decodeURIComponent(to).replace(/-/g, ' ');
      
      // In case of a refresh, don't overwrite existing display names
      const fromDisplay = bookingState.fromDisplay || fromDecoded;
      const toDisplay = bookingState.toDisplay || toDecoded;
      
      // Parse the date parameters
      const pickupDateTime = parseDateFromUrl(date);
      const dropoffDateTime = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;
      const isReturnTrip = type === '2';
      
      // Set or update the booking state with parsed data
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
        updatedState.isReturn = isReturnTrip;
        updatedState.pickupDateTime = pickupDateTime;
        updatedState.dropoffDateTime = dropoffDateTime;
        
        // Don't reset pricing data if we already have it and it's not an error
        // This prevents unnecessary API calls
        if (!prev.pricingResponse || prev.pricingError) {
          updatedState.pricingError = null;
        }
        
        return updatedState;
      });

      // Only fetch prices if we don't have valid pricing data already
      if (!hasPricingData) {
        // Check if there's already a pricing request in progress
        const { inCooldown, remainingTime } = requestTracker.isInCooldown('fetch-prices');
        
        if (inCooldown) {
          console.log(`🔶 Price fetching in cooldown. Waiting ${remainingTime}ms`);
          
          // Set temporary error to prevent further attempts
          setBookingState(prev => ({
            ...prev,
            pricingError: `Request cooldown period not elapsed. Please wait ${Math.ceil(remainingTime / 1000)} seconds.`
          }));
          
          // Try again after cooldown
          setTimeout(() => {
            if (isMountedRef.current) {
              setBookingState(prev => ({
                ...prev,
                pricingError: null
              }));
              console.log("🔄 Cooldown elapsed, price fetching can proceed");
            }
          }, remainingTime);
          
          return;
        }
        
        // Check if a request is already in progress
        if (requestTracker.isRequestInProgress('fetch-prices')) {
          console.log("🟡 Price fetch already in progress - not starting another");
          
          setBookingState(prev => ({
            ...prev,
            pricingError: "Request already in progress"
          }));
          
          return;
        }
        
        console.log("🔵 Fetching initial prices - none in context");
      }
    };

    initBooking();
  }, [from, to, type, date, returnDate, passengers, setBookingState, toast, trackEvent, 
      bookingState.fromDisplay, bookingState.toDisplay, bookingState.pricingResponse, 
      bookingState.pricingError]);

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