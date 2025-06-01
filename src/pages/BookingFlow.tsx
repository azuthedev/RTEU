import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';
import { useBooking } from '../contexts/BookingContext';
import { getApiUrl, fetchWithCors } from '../utils/corsHelper';
import { useToast } from '../components/ui/use-toast';
import { useAnalytics } from '../hooks/useAnalytics';
import LoadingAnimation from '../components/LoadingAnimation';
import ErrorBoundary from '../components/ErrorBoundary';
import { withRetry } from '../utils/retryHelper';
import { errorTracker, ErrorContext, ErrorSeverity } from '../utils/errorTracker';
import { requestTracker } from '../utils/requestTracker';
import { trackTiming } from '../utils/analyticsTracker';
import { validatePricingData, validateUrlParamsWithContext, sanitizeObject } from '../utils/dataValidator';

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

// Expected API version - update when API changes
const EXPECTED_API_VERSION = "1.0.0";
// Local storage key for persisting loading state
const LOADING_STATE_KEY = 'royal_transfer_booking_state';

const BookingFlow = () => {
  const { from, to, type, date, returnDate, passengers } = useParams();
  const [isLoading, setIsLoading] = useState(false); // Default to false and only set to true if we need to fetch
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();
  
  const { bookingState, setBookingState } = useBooking();
  
  // Track if initial fetch has been done
  const initialFetchDone = useRef(false);
  
  // Reference to track the current API request
  const currentRequestIdRef = useRef<string | null>(null);
  
  // Loading start time for metrics
  const loadingStartTimeRef = useRef(0);
  
  // Check if navigation to this route is intentional or accidental
  const isIntentionalNavRef = useRef(false);
  
  // User session ID for correlation
  const sessionIdRef = useRef<string>(
    sessionStorage.getItem('session_id') || 
    `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // Save session ID to session storage
  useEffect(() => {
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', sessionIdRef.current);
    }
  }, []);
  
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
  
  // Function to fetch prices from the API with robust error handling and retries
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
    loadingStartTimeRef.current = performance.now();
    
    // Generate a correlation ID for this request
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Start tracking the request
    const requestId = requestTracker.startRequest(
      getApiUrl('/check-price'),
      'POST'
    );
    currentRequestIdRef.current = requestId;
    
    try {
      // We need to geocode the addresses first
      requestTracker.updateStage(requestId, 'geocoding', { correlationId });
      
      const pickupAddress = decodeURIComponent(from).replace(/-/g, ' ');
      const dropoffAddress = decodeURIComponent(to).replace(/-/g, ' ');
      
      // Use Google Maps Geocoding API
      if (!window.google?.maps?.Geocoder) {
        toast({
          title: "Geocoding Not Available",
          description: "Google Maps could not be loaded. Please try again later.",
          variant: "destructive"
        });
        
        errorTracker.trackError(
          'Google Maps Geocoder not available',
          ErrorContext.GEOCODING,
          ErrorSeverity.HIGH,
          { 
            correlationId,
            sessionId: sessionIdRef.current
          }
        );
        
        requestTracker.updateStage(requestId, 'failed', {
          error: 'Google Maps Geocoder not available',
          correlationId
        });
        
        return null;
      }
      
      const geocoder = new google.maps.Geocoder();
      
      // Function to geocode with timeout and error handling
      const geocodeWithTimeout = async (address: string): Promise<google.maps.GeocoderResult[] | null> => {
        return new Promise((resolve) => {
          // Create timeout
          const timeoutId = setTimeout(() => {
            console.warn(`Geocoding timeout for address: ${address}`);
            resolve(null);
          }, 8000);
          
          // Perform geocoding
          geocoder.geocode({ address }, (results, status) => {
            clearTimeout(timeoutId);
            if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
              resolve(results);
            } else {
              console.error('Geocoding failed:', status);
              resolve(null);
            }
          });
        });
      };
      
      // Track geocoding start time
      const geocodingStartTime = performance.now();
      
      // Geocode pickup location
      let pickupCoords: { lat: number, lng: number } | null = null;
      try {
        const pickupResult = await geocodeWithTimeout(pickupAddress);
        
        if (pickupResult && pickupResult[0].geometry?.location) {
          pickupCoords = {
            lat: pickupResult[0].geometry.location.lat(),
            lng: pickupResult[0].geometry.location.lng()
          };
          console.log('Geocoded pickup coordinates:', pickupCoords);
        } else {
          errorTracker.trackError(
            'Failed to geocode pickup address',
            ErrorContext.GEOCODING,
            ErrorSeverity.MEDIUM,
            { 
              address: pickupAddress,
              correlationId,
              sessionId: sessionIdRef.current
            }
          );
        }
      } catch (error) {
        console.error('Error geocoding pickup location:', error);
        errorTracker.trackError(
          error instanceof Error ? error : 'Unknown geocoding error',
          ErrorContext.GEOCODING,
          ErrorSeverity.MEDIUM,
          { 
            address: pickupAddress, 
            stage: 'pickup',
            correlationId,
            sessionId: sessionIdRef.current
          }
        );
      }
      
      // Geocode dropoff location
      let dropoffCoords: { lat: number, lng: number } | null = null;
      try {
        const dropoffResult = await geocodeWithTimeout(dropoffAddress);
        
        if (dropoffResult && dropoffResult[0].geometry?.location) {
          dropoffCoords = {
            lat: dropoffResult[0].geometry.location.lat(),
            lng: dropoffResult[0].geometry.location.lng()
          };
          console.log('Geocoded dropoff coordinates:', dropoffCoords);
        } else {
          errorTracker.trackError(
            'Failed to geocode dropoff address',
            ErrorContext.GEOCODING,
            ErrorSeverity.MEDIUM,
            { 
              address: dropoffAddress,
              correlationId,
              sessionId: sessionIdRef.current
            }
          );
        }
      } catch (error) {
        console.error('Error geocoding dropoff location:', error);
        errorTracker.trackError(
          error instanceof Error ? error : 'Unknown geocoding error',
          ErrorContext.GEOCODING,
          ErrorSeverity.MEDIUM,
          { 
            address: dropoffAddress, 
            stage: 'dropoff',
            correlationId,
            sessionId: sessionIdRef.current
          }
        );
      }
      
      // Track geocoding time
      const geocodingTime = performance.now() - geocodingStartTime;
      trackTiming('Geocoding', 'Both Addresses', Math.round(geocodingTime));
      requestTracker.updateStage(requestId, 'network', { 
        geocodingTime,
        correlationId 
      });
      
      // Implement partial data recovery - if only one coordinate is missing, use a fallback
      if (!pickupCoords || !dropoffCoords) {
        // Handle the case where only one coordinate set is missing
        if (pickupCoords && !dropoffCoords && bookingState.pricingResponse?.details?.dropoff_location) {
          // Use the dropoff coordinates from the previous pricing response
          dropoffCoords = bookingState.pricingResponse.details.dropoff_location;
          console.log('Using fallback dropoff coordinates from previous pricing data');
        } else if (!pickupCoords && dropoffCoords && bookingState.pricingResponse?.details?.pickup_location) {
          // Use the pickup coordinates from the previous pricing response
          pickupCoords = bookingState.pricingResponse.details.pickup_location;
          console.log('Using fallback pickup coordinates from previous pricing data');
        } else {
          toast({
            title: "Geocoding Failed",
            description: "Could not determine location coordinates. Please try entering more specific addresses.",
            variant: "destructive"
          });
          
          requestTracker.updateStage(requestId, 'failed', {
            error: 'Failed to geocode one or both addresses',
            correlationId
          });
          
          return null;
        }
      }
      
      // Format the pickup time
      const pickupTimeISO = formatDateForApi(date);
      if (!pickupTimeISO) {
        toast({
          title: "Invalid Date",
          description: "The selected date is invalid. Please choose a different date.",
          variant: "destructive"
        });
        
        requestTracker.updateStage(requestId, 'failed', {
          error: 'Invalid date format',
          correlationId
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
        trip_type: type || "1",
        correlation_id: correlationId, // Add correlation ID for tracking
        session_id: sessionIdRef.current // Add session ID for user tracking
      };
      
      console.log('Sending price request with payload:', payload);
      
      // Make request to price API with retry logic
      return await withRetry(
        async () => {
          // Make request to price API
          const apiEndpoint = getApiUrl('/check-price');
          
          // Get abort signal from request tracker
          const signal = requestTracker.getSignal(requestId);
          
          const response = await fetchWithCors(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Correlation-ID': correlationId, // Add correlation ID to headers
              'X-Session-ID': sessionIdRef.current
            },
            body: JSON.stringify(payload),
            signal
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
          
          // Parse and validate response
          const data: PricingResponse = await response.json();
          console.log('Pricing data received:', data);
          
          // Validate API version if provided
          if (data.version && data.version !== EXPECTED_API_VERSION) {
            console.warn(`API version mismatch: expected ${EXPECTED_API_VERSION}, got ${data.version}`);
            
            // Log but don't fail - handle gracefully
            errorTracker.trackError(
              `API version mismatch: expected ${EXPECTED_API_VERSION}, got ${data.version}`,
              ErrorContext.PRICING,
              ErrorSeverity.LOW,
              { 
                correlationId,
                sessionId: sessionIdRef.current
              }
            );
          }
          
          // Validate basic data structure
          if (!validatePricingData(data)) {
            throw new Error('Invalid pricing data: missing or empty prices array');
          }
          
          // Verify coordinates match our request (within reasonable margin)
          const coordMargin = 0.001; // About 100 meters
          if (
            Math.abs(data.details.pickup_location.lat - pickupCoords.lat) > coordMargin ||
            Math.abs(data.details.pickup_location.lng - pickupCoords.lng) > coordMargin ||
            Math.abs(data.details.dropoff_location.lat - dropoffCoords.lat) > coordMargin ||
            Math.abs(data.details.dropoff_location.lng - dropoffCoords.lng) > coordMargin
          ) {
            console.warn('Coordinate mismatch in API response');
            errorTracker.trackError(
              'Coordinate mismatch in API response',
              ErrorContext.PRICING,
              ErrorSeverity.MEDIUM,
              { 
                requested: { pickup: pickupCoords, dropoff: dropoffCoords },
                received: { pickup: data.details.pickup_location, dropoff: data.details.dropoff_location },
                correlationId,
                sessionId: sessionIdRef.current
              }
            );
          }
          
          // Track successful pricing fetch
          trackEvent('Booking', 'Price Fetched', `${from} to ${to}`);
          
          requestTracker.updateStage(requestId, 'complete', { 
            correlationId 
          });
          
          return data;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          backoffFactor: 2,
          timeout: 30000,
          onRetry: (attempt, error, delay) => {
            console.log(`Retrying price API call (attempt ${attempt})... Next attempt in ${delay}ms`);
            toast({
              title: `Retry Attempt ${attempt}`,
              description: "The connection is taking longer than expected. Retrying...",
              variant: "default"
            });
          }
        }
      );
    } catch (error) {
      console.error('Error fetching prices:', error);
      
      // Mark request as failed
      if (currentRequestIdRef.current) {
        requestTracker.updateStage(currentRequestIdRef.current, 'failed', {
          error: error.message || 'Unknown error',
          correlationId
        });
      }
      
      // Track the error
      errorTracker.trackError(
        error instanceof Error ? error : 'Unknown pricing error',
        ErrorContext.PRICING,
        ErrorSeverity.HIGH,
        { 
          from, 
          to, 
          type, 
          date,
          correlationId,
          sessionId: sessionIdRef.current
        }
      );
      
      // Set the error message for display
      setLoadError(error.message || 'An unexpected error occurred while loading your transfer.');
      
      toast({
        title: "Pricing Error",
        description: error.message || "Failed to get pricing information. Please try again later.",
        variant: "destructive"
      });
      
      return null;
    } finally {
      // Track total loading time
      const loadingTime = performance.now() - loadingStartTimeRef.current;
      trackTiming('BookingFlow', 'Initial Load', Math.round(loadingTime));
      
      setIsPriceLoading(false);
    }
  };
  
  // Handle cancellation of loading
  const handleCancelLoading = () => {
    // Abort any ongoing request
    if (currentRequestIdRef.current) {
      requestTracker.abortRequest(currentRequestIdRef.current, 'User canceled operation');
      currentRequestIdRef.current = null;
    }
    
    // Reset loading states
    setIsLoading(false);
    setIsPriceLoading(false);
    setLoadError(null);
    
    // Navigate back to home page
    navigate('/');
  };
  
  // Check for persisted booking state on load
  useEffect(() => {
    try {
      const persistedState = localStorage.getItem(LOADING_STATE_KEY);
      
      if (persistedState) {
        const parsedState = JSON.parse(persistedState);
        
        // Only restore if not too old (5 minutes)
        const currentTime = Date.now();
        const stateAge = currentTime - parsedState.timestamp;
        const MAX_STATE_AGE = 5 * 60 * 1000; // 5 minutes
        
        if (stateAge < MAX_STATE_AGE) {
          console.log('Restoring booking flow state from localStorage');
          
          // Show a toast notification
          toast({
            title: "Restoring Previous State",
            description: "We've restored your previous booking state.",
            variant: "default"
          });
        }
        
        // Clear the persisted state
        localStorage.removeItem(LOADING_STATE_KEY);
      }
    } catch (error) {
      console.error('Error restoring booking state:', error);
    }
  }, [toast]);
  
  // Initialize booking state from URL parameters
  useEffect(() => {
    // Skip if we don't have the required params
    if (!from || !to || !date) return;
    
    // Function to ensure that URL parameters match context data
    const validateContextWithParams = () => {
      if (!bookingState.pricingResponse) return false;
      
      return validateUrlParamsWithContext(
        { from, to, type, date, returnDate, passengers },
        bookingState
      );
    };

    // Check if we already have state that matches the URL parameters
    // AND if we already have pricing data - skip the loading and fetching
    const hasMatchingState = validateContextWithParams();
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
      loadingStartTimeRef.current = performance.now();
      
      // Sanitize URL parameters for security
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
        
        // If we're in a new booking flow, reset the step to 1
        if (!isIntentionalNavRef.current) {
          updatedState.step = 1;
        }
        
        return updatedState;
      });
      
      // Persist booking state to localStorage (for refresh recovery)
      try {
        const stateToSave = {
          timestamp: Date.now(),
          isLoading: true,
          from: fromDecoded,
          to: toDecoded,
          fromDisplay,
          toDisplay,
          departureDate: date,
          returnDate,
          passengers,
          isReturn: type === '2',
          step: bookingState.step
        };
        
        localStorage.setItem(LOADING_STATE_KEY, JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Error persisting booking state:', error);
        // Non-critical, can continue
      }

      // Fetch prices if not already done
      if (!initialFetchDone.current) {
        console.log("Fetching initial prices");
        setIsPriceLoading(true);
        const pricingResponse = await fetchPrices();
        
        if (pricingResponse) {
          // Verify data integrity
          if (!validatePricingData(pricingResponse)) {
            setLoadError('Invalid pricing data received. Please try again.');
            setIsLoading(false);
            setIsPriceLoading(false);
            localStorage.removeItem(LOADING_STATE_KEY);
            return;
          }
          
          // Update booking state with pricing data
          setBookingState(prev => ({
            ...prev,
            pricingResponse: sanitizeObject(pricingResponse) as PricingResponse
          }));
        } else {
          // Set error state
          setLoadError('Failed to load pricing data. Please try again.');
        }
        
        initialFetchDone.current = true;
        setIsPriceLoading(false);
      }

      // Done loading
      setIsLoading(false);
      localStorage.removeItem(LOADING_STATE_KEY);
    };

    initBooking();
  }, [from, to, type, date, returnDate, passengers, setBookingState, toast, trackEvent]);
  
  // Set flag for intentional navigation
  useEffect(() => {
    isIntentionalNavRef.current = true;
    
    // Reset flag when component unmounts
    return () => {
      isIntentionalNavRef.current = false;
      
      // Clear persisted state
      localStorage.removeItem(LOADING_STATE_KEY);
    };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort any active requests
      if (currentRequestIdRef.current) {
        requestTracker.abortRequest(currentRequestIdRef.current, 'Component unmounted');
        currentRequestIdRef.current = null;
      }
    };
  }, []);

  // Handle step navigation based on context
  const currentStep = bookingState.step;
  
  // Show loading state while initializing
  if (isLoading || isPriceLoading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-8">
            <LoadingAnimation 
              loadingComplete={!isPriceLoading && !isLoading} 
              onCancel={handleCancelLoading}
              error={loadError}
              startTime={loadingStartTimeRef.current}
              isSlowConnection={requestTracker.isSlowConnection()}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
              <p className="text-gray-600 mb-6">
                We encountered an issue while loading your booking details. 
                Please try again or return to the home page.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    >
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
    </ErrorBoundary>
  );
};

export default BookingFlow;