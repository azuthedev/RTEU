import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../components/ui/use-toast';
import { useAnalytics } from '../hooks/useAnalytics';
import { parseDateFromUrl } from '../utils/searchFormHelpers';

// Component to handle proper URL parameters and context initialization
const BookingFlow = () => {
  const { from, to, type, date, returnDate, passengers } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  
  const { bookingState, setBookingState, clearBookingState, fetchPricingData } = useBooking();
  
  // Add component mount tracking to prevent updates on unmounted component
  const isMountedRef = useRef(true);
  
  // Flag to track initialization status
  const isInitializedRef = useRef(false);
  const pricingRequestedRef = useRef(false);

  // Clean up booking state when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Initialize booking state from URL parameters if needed
  useEffect(() => {
    // Skip if we don't have the required params or already initialized
    if (!from || !to || !date || isInitializedRef.current) return;

    console.log("🔄 Initializing booking state from URL params", {
      from, to, type, date, returnDate, passengers
    });
    
    // Decode URL parameters (from URL-friendly format to display format)
    const decodedFrom = decodeURIComponent(from.replace(/-/g, ' '));
    const decodedTo = decodeURIComponent(to.replace(/-/g, ' '));
    
    // Use the context value as the primary source of truth
    // Only update fields that are empty in the current context
    setBookingState(prev => {
      // Create a new state object based on current state
      const updatedState = { ...prev };
      
      // CRITICAL CHANGE: Only update state fields if they don't exist in context
      // This prioritizes existing context data over URL parameters
      
      // Location information - preserve context data when available
      updatedState.from = prev.from || decodedFrom;
      updatedState.to = prev.to || decodedTo;
      updatedState.fromDisplay = prev.fromDisplay || decodedFrom;
      updatedState.toDisplay = prev.toDisplay || decodedTo;
      
      // CRITICAL: Preserve coordinate data which is obtained via geocoding
      // These are expensive to calculate and should never be lost
      updatedState.fromCoords = prev.fromCoords;
      updatedState.toCoords = prev.toCoords;
      
      // CRITICAL: Preserve validation states
      updatedState.fromValid = prev.fromValid !== undefined ? prev.fromValid : !!prev.fromDisplay;
      updatedState.toValid = prev.toValid !== undefined ? prev.toValid : !!prev.toDisplay;
      
      // Trip type - preserve context data
      updatedState.isReturn = prev.isReturn !== undefined 
        ? prev.isReturn 
        : type === '2';
      
      // Passenger count - preserve context data
      updatedState.passengers = prev.passengers || 
                               (passengers ? parseInt(passengers, 10) : 1);
      
      // URL date parameters for bookmarking/sharing - always update these
      updatedState.departureDate = date;
      updatedState.returnDate = returnDate === '0' ? undefined : returnDate;
      
      // Date objects with time information
      // Parse dates from URL, but keep time from context if available
      const pickupDateParsed = parseDateFromUrl(date);
      if (!prev.pickupDateTime && pickupDateParsed) {
        // If no pickup date in context, use parsed date
        updatedState.pickupDateTime = pickupDateParsed;
      } else if (prev.pickupDateTime && pickupDateParsed) {
        // If we have both, update the date part but preserve time
        const contextDate = prev.pickupDateTime;
        pickupDateParsed.setHours(
          contextDate.getHours(),
          contextDate.getMinutes(),
          contextDate.getSeconds(),
          contextDate.getMilliseconds()
        );
        updatedState.pickupDateTime = pickupDateParsed;
      }
      
      // Same logic for return date
      if (updatedState.isReturn && returnDate !== '0') {
        const dropoffDateParsed = parseDateFromUrl(returnDate);
        if (!prev.dropoffDateTime && dropoffDateParsed) {
          // If no dropoff date in context, use parsed date
          updatedState.dropoffDateTime = dropoffDateParsed;
        } else if (prev.dropoffDateTime && dropoffDateParsed) {
          // If we have both, update the date part but preserve time
          const contextDate = prev.dropoffDateTime;
          dropoffDateParsed.setHours(
            contextDate.getHours(),
            contextDate.getMinutes(),
            contextDate.getSeconds(),
            contextDate.getMilliseconds()
          );
          updatedState.dropoffDateTime = dropoffDateParsed;
        }
      }
      
      // Log what we're updating
      console.log("🔄 Booking state updated from URL parameters", {
        fromContext: !!prev.from,
        toContext: !!prev.to,
        fromCoordsContext: !!prev.fromCoords,
        toCoordsContext: !!prev.toCoords,
        fromValidContext: prev.fromValid,
        toValidContext: prev.toValid,
        isReturnContext: prev.isReturn,
        pickupDateTimeContext: !!prev.pickupDateTime,
        dropoffDateTimeContext: !!prev.dropoffDateTime,
        
        fromFinal: updatedState.from,
        toFinal: updatedState.to,
        fromCoordsFinal: !!updatedState.fromCoords,
        toCoordsFinal: !!updatedState.toCoords,
        fromValidFinal: updatedState.fromValid,
        toValidFinal: updatedState.toValid,
        isReturnFinal: updatedState.isReturn,
        pickupDateTimeFinal: updatedState.pickupDateTime,
        dropoffDateTimeFinal: updatedState.dropoffDateTime
      });
      
      return updatedState;
    });
    
    // Mark as initialized
    isInitializedRef.current = true;
  }, [from, to, type, date, returnDate, passengers, setBookingState]);
  
  // Fetch pricing if needed
  useEffect(() => {
    // Skip if not initialized or already requested pricing
    if (!isInitializedRef.current || pricingRequestedRef.current || !isMountedRef.current) {
      return;
    }
    
    // Check if we need to fetch pricing data
    const needsPricing = 
      !bookingState.isPricingLoading && 
      !bookingState.pricingResponse && 
      !bookingState.pricingError &&
      bookingState.from && 
      bookingState.to && 
      bookingState.pickupDateTime;
    
    if (needsPricing) {
      console.log("🔵 Need to fetch initial prices - none in context");
      pricingRequestedRef.current = true;
      
      // Fetch prices using the context function
      const fetchPrices = async () => {
        await fetchPricingData({
          from: bookingState.from,
          to: bookingState.to,
          fromCoords: bookingState.fromCoords,
          toCoords: bookingState.toCoords,
          pickupDateTime: bookingState.pickupDateTime!,
          dropoffDateTime: bookingState.dropoffDateTime,
          isReturn: !!bookingState.isReturn,
          fromDisplay: bookingState.fromDisplay,
          toDisplay: bookingState.toDisplay,
          passengers: bookingState.passengers || 1
        });
      };
      
      fetchPrices();
    } else {
      console.log("✅ Skipping price fetch - already have data or in progress", {
        isPricingLoading: bookingState.isPricingLoading,
        hasPricingResponse: !!bookingState.pricingResponse,
        hasPricingError: !!bookingState.pricingError
      });
    }
  }, [bookingState, fetchPricingData]);

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