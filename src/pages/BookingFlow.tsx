import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../components/ui/use-toast';
import { useAnalytics } from '../hooks/useAnalytics';

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
  
  // Helper function to parse dates from URL strings
  const parseUrlDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr === '0') return undefined;
    
    try {
      // Parse format: yymmdd (from URL)
      const year = parseInt(`20${dateStr.slice(0, 2)}`);
      const month = parseInt(dateStr.slice(2, 4)) - 1; // JS months are 0-indexed
      const day = parseInt(dateStr.slice(4, 6));
      
      // Create date at noon by default
      const parsedDate = new Date(year, month, day, 12, 0, 0);
      
      // Check if valid date
      if (isNaN(parsedDate.getTime())) {
        return undefined;
      }
      
      return parsedDate;
    } catch (e) {
      console.error("Error parsing URL date:", e);
      return undefined;
    }
  };
  
  // Initialize booking state from URL parameters if needed
  useEffect(() => {
    // Skip if we don't have the required params or already initialized
    if (!from || !to || !date || isInitializedRef.current) return;

    console.log("🔄 Initializing booking state from URL params");
    
    // Decode URL parameters (from URL-friendly format to display format)
    const decodedFrom = decodeURIComponent(from.replace(/-/g, ' '));
    const decodedTo = decodeURIComponent(to.replace(/-/g, ' '));
    
    // Use or preserve display names if they exist in state
    const fromDisplay = bookingState.fromDisplay || decodedFrom;
    const toDisplay = bookingState.toDisplay || decodedTo;
    
    // Parse the date parameters
    const pickupDateTime = bookingState.pickupDateTime || parseUrlDate(date);
    const dropoffDateTime = bookingState.dropoffDateTime || 
                           (returnDate && returnDate !== '0' ? parseUrlDate(returnDate) : undefined);
    const isReturnTrip = type === '2';
    
    // Only update state if we have different values
    const needsUpdate = 
      bookingState.from !== decodedFrom ||
      bookingState.to !== decodedTo ||
      !bookingState.fromDisplay ||
      !bookingState.toDisplay ||
      !bookingState.pickupDateTime ||
      (isReturnTrip && !bookingState.dropoffDateTime) ||
      bookingState.isReturn !== isReturnTrip;
    
    if (needsUpdate) {
      // Set or update the booking state with parsed data
      setBookingState(prev => {
        // Create a copy of the current state
        const updatedState = { ...prev };
        
        // Always update these values
        updatedState.from = decodedFrom;
        updatedState.to = decodedTo;
        updatedState.fromDisplay = fromDisplay;
        updatedState.toDisplay = toDisplay;
        updatedState.departureDate = date;
        updatedState.returnDate = returnDate === '0' ? undefined : returnDate;
        updatedState.passengers = passengers ? parseInt(passengers, 10) : 1;
        updatedState.isReturn = isReturnTrip;
        updatedState.pickupDateTime = pickupDateTime;
        updatedState.dropoffDateTime = dropoffDateTime;
        
        // Log what we're updating
        console.log("🔄 Updating booking state with:", {
          from: decodedFrom,
          to: decodedTo,
          fromDisplay,
          toDisplay,
          pickupDateTime,
          dropoffDateTime,
          isReturn: isReturnTrip
        });
        
        return updatedState;
      });
    }
    
    // Mark as initialized
    isInitializedRef.current = true;
  }, [from, to, type, date, returnDate, passengers, setBookingState, 
      bookingState.fromDisplay, bookingState.toDisplay, 
      bookingState.pickupDateTime, bookingState.dropoffDateTime,
      bookingState.from, bookingState.to, bookingState.isReturn]);
  
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
  }, [bookingState, fetchPricingData, isInitializedRef.current]);

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
