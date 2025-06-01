import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Users, ArrowRight, Plus, Minus, AlertCircle, XCircle, MapPinOff, RefreshCcw } from 'lucide-react';
import { throttle, isEqual } from 'lodash-es';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from './ui/date-picker';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useAnalytics } from '../hooks/useAnalytics';
import { GooglePlacesAutocomplete } from './ui/GooglePlacesAutocomplete';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from './ui/use-toast';
import { fetchWithCors, getApiUrl } from '../utils/corsHelper';
import LoadingAnimation from './LoadingAnimation';
import { initGoogleMaps } from '../utils/optimizeThirdParty';
import { withRetry } from '../utils/retryHelper';
import { requestTracker } from '../utils/requestTracker';
import { errorTracker, ErrorContext, ErrorSeverity } from '../utils/errorTracker';
import ErrorBoundary from './ErrorBoundary';
import { trackTiming } from '../utils/analyticsTracker';
import xss from 'xss';
import { validatePricingData, verifyChecksum, generateChecksum } from '../utils/dataValidator';

// Local storage key for persisting loading state
const LOADING_STATE_KEY = 'royal_transfer_loading_state';
// Rate limiting key
const RATE_LIMIT_KEY = 'royal_transfer_rate_limit';
// Request deduplication key
const DEDUPLICATION_KEY = 'royal_transfer_request_dedup';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 3, // Maximum 3 requests
  TIMEFRAME: 60 * 1000, // Per minute
  BUFFER_TIME: 2 * 1000 // Additional buffer to prevent edge cases
};

// Constants for validation
const GEOCODING_TIMEOUT = 8000; // 8 seconds for geocoding timeout

const formatDateForUrl = (date: Date) => {
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

const parseDateFromUrl = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr === '0' || dateStr.length !== 6) {
    return undefined;
  }
  
  try {
    const year = parseInt(`20${dateStr.slice(0, 2)}`);
    const month = parseInt(dateStr.slice(2, 4)) - 1;
    const day = parseInt(dateStr.slice(4, 6));
    
    const date = new Date(year, month, day, 12, 0, 0, 0);
    
    if (isNaN(date.getTime())) {
      return undefined;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return undefined;
  }
};

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
  version?: string; // Added for API version validation
  checksum?: string; // Added for data integrity validation
}

const SearchForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { trackEvent } = useAnalytics();
  const { bookingState, setBookingState } = useBooking();
  const { toast } = useToast();

  // Add isInitializedRef definition here
  const isInitializedRef = useRef(false);
  // Flag to track if initial state loading is complete
  const initialStateLoadedRef = useRef(false);
  // Flag to track user interaction
  const userInteractedRef = useRef(false);
  
  // Missing variable declarations for click throttling
  const lastClickTimeRef = useRef<number>(0);
  const isClickThrottledRef = useRef<boolean>(false);

  // Store original values for comparison and restoration
  const originalValuesRef = useRef({
    isReturn: false,
    pickup: '',
    dropoff: '',
    pickupDisplay: '',
    dropoffDisplay: '',
    departureDate: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: 1
  });

  // Current form state - Changed default to false (One Way)
  const [isReturn, setIsReturn] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    pickupDisplay: '', // Store the display version
    dropoffDisplay: '', // Store the display version
    departureDate: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined
  });

  // State for geocoded coordinates
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // State for loading prices
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Track validation state for addresses
  const [pickupIsValid, setPickupIsValid] = useState(false);
  const [dropoffIsValid, setDropoffIsValid] = useState(false);
  
  // Loading overlay modal state
  const [showModal, setShowModal] = useState(false);
  
  // Track when we're ready to navigate
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [navigationData, setNavigationData] = useState<{
    path: string;
    pricingResponse: PricingResponse | null;
  } | null>(null);
  
  // Performance tracking
  const [loadingStartTime, setLoadingStartTime] = useState<number>(0);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  
  // Request tracking
  const currentRequestIdRef = useRef<string | null>(null);
  
  // Retry count for current fetch operation
  const retryCountRef = useRef(0);
  
  // Enhanced geocoding with partial data recovery
  const [hasPartialGeocodingData, setHasPartialGeocodingData] = useState(false);
  const [geocodingErrorField, setGeocodingErrorField] = useState<'pickup' | 'dropoff' | null>(null);

  // Modal refs for focus management
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  
  // Request deduplication - using a WeakMap ensures automatic garbage collection
  const geocodingCache = useRef<WeakMap<object, Promise<{lat: number, lng: number} | null>>>(
    new WeakMap()
  );

  // Store the last successful API request for deduplication
  const lastRequestRef = useRef<{
    payload: any;
    timestamp: number;
    response: PricingResponse | null;
  } | null>(null);
  
  // User session information for error tracking
  const sessionIdRef = useRef<string>(
    sessionStorage.getItem('session_id') || 
    `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // Save session ID to session storage for persistence across page reloads
  useEffect(() => {
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', sessionIdRef.current);
    }
  }, []);

  // Ensure Google Maps is loaded
  useEffect(() => {
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          console.log('SearchForm: Google Maps API loaded:', success);
        });
    }
  }, []);

  // Initialize component once
  useEffect(() => {
    isInitializedRef.current = true;
    // Use the display names from context if available
    if (bookingState.fromDisplay) {
      setFormData(prev => ({
        ...prev,
        pickup: bookingState.fromDisplay || '',
        pickupDisplay: bookingState.fromDisplay || ''
      }));
    }
    
    if (bookingState.toDisplay) {
      setFormData(prev => ({
        ...prev,
        dropoff: bookingState.toDisplay || '',
        dropoffDisplay: bookingState.toDisplay || ''
      }));
    }
    
    // Use isReturn from context if available
    if (bookingState.isReturn !== undefined) {
      setIsReturn(bookingState.isReturn);
    }
    
    // Use passengers from context if available
    if (bookingState.passengers) {
      setPassengers(bookingState.passengers);
    }
    
    // Use dates from context if available
    if (bookingState.departureDate) {
      const departureDate = parseDateFromUrl(bookingState.departureDate);
      if (departureDate) {
        if (bookingState.isReturn && bookingState.returnDate) {
          const returnDate = parseDateFromUrl(bookingState.returnDate);
          setFormData(prev => ({
            ...prev,
            dateRange: { from: departureDate, to: returnDate }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            departureDate
          }));
        }
      }
    }
    
    console.log("SearchForm initialized with:", {
      isReturn: bookingState.isReturn,
      from: bookingState.fromDisplay || bookingState.from,
      to: bookingState.toDisplay || bookingState.to,
      departureDate: bookingState.departureDate,
      returnDate: bookingState.returnDate
    });

    // Check for any persisted loading state in localStorage
    try {
      const persistedLoadingState = localStorage.getItem(LOADING_STATE_KEY);
      if (persistedLoadingState) {
        const parsedState = JSON.parse(persistedLoadingState);
        
        // Only restore if not too old (5 minutes)
        const currentTime = Date.now();
        const stateAge = currentTime - parsedState.timestamp;
        const MAX_STATE_AGE = 5 * 60 * 1000; // 5 minutes
        
        if (stateAge < MAX_STATE_AGE) {
          console.log('Restoring loading state from localStorage');
          
          // Restore form data
          if (parsedState.formData) {
            const { pickup, dropoff, pickupDisplay, dropoffDisplay } = parsedState.formData;
            
            setFormData(prev => ({
              ...prev,
              pickup: pickup || prev.pickup,
              dropoff: dropoff || prev.dropoff,
              pickupDisplay: pickupDisplay || prev.pickupDisplay,
              dropoffDisplay: dropoffDisplay || prev.dropoffDisplay,
              // We don't restore dates here as they might be complex objects
            }));
          }
          
          // If we were in the middle of loading, show an error toast
          if (parsedState.isLoading) {
            toast({
              title: "Previous loading interrupted",
              description: "Your previous search was interrupted. Please try again.",
              variant: "destructive"
            });
          }
        }
        
        // Clear the persisted state regardless of age
        localStorage.removeItem(LOADING_STATE_KEY);
      }
    } catch (error) {
      console.error('Error restoring loading state:', error);
      // Don't let this error affect the application
      localStorage.removeItem(LOADING_STATE_KEY);
    }
    
    // Clean up function - abort any ongoing requests
    return () => {
      if (currentRequestIdRef.current) {
        requestTracker.abortRequest(currentRequestIdRef.current, 'Component unmounted');
        currentRequestIdRef.current = null;
      }
    };
  }, [bookingState.fromDisplay, bookingState.toDisplay, bookingState.isReturn, bookingState.passengers, 
      bookingState.departureDate, bookingState.returnDate, bookingState.from, bookingState.to, toast]);

  // Then initialize from URL if coming from booking flow
  useEffect(() => {
    // Skip if we've already loaded the initial state
    if (initialStateLoadedRef.current) {
      return;
    }
    
    // Check if we're on the pre-filled home route
    if (location.pathname.startsWith('/home/transfer/')) {
      const { from, to, type, date, returnDate, passengers: passengerCount } = params;
      
      if (from && to && type && date) {
        // Convert type to boolean flag - '1' means One Way (isReturn = false)
        const isRoundTrip = type === '2';
        setIsReturn(isRoundTrip);
        setPassengers(Math.max(1, parseInt(passengerCount || '1', 10)));
        
        const departureDate = parseDateFromUrl(date);
        const returnDateParsed = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;
        
        // Decode locations (from and to) for display
        // First check if we already have display versions in the booking context
        const fromDisplay = bookingState.fromDisplay || decodeURIComponent(from.replace(/-/g, ' '));
        const toDisplay = bookingState.toDisplay || decodeURIComponent(to.replace(/-/g, ' '));
        
        const newFormData = {
          pickup: fromDisplay,
          dropoff: toDisplay,
          pickupDisplay: fromDisplay,
          dropoffDisplay: toDisplay,
          departureDate: isRoundTrip ? undefined : departureDate,
          dateRange: isRoundTrip 
            ? {
                from: departureDate,
                to: returnDateParsed
              } as DateRange | undefined 
            : undefined
        };

        setFormData(newFormData);

        // Store original values for comparison
        originalValuesRef.current = {
          isReturn: isRoundTrip,
          pickup: newFormData.pickup,
          dropoff: newFormData.dropoff,
          pickupDisplay: newFormData.pickupDisplay,
          dropoffDisplay: newFormData.dropoffDisplay,
          departureDate: newFormData.departureDate,
          dateRange: newFormData.dateRange,
          passengers: Math.max(1, parseInt(passengerCount || '1', 10))
        };
        
        initialStateLoadedRef.current = true;
      }
    } else {
      // If not coming from URL with params, mark as initialized
      initialStateLoadedRef.current = true;
    }
  }, [location.pathname, params, bookingState.fromDisplay, bookingState.toDisplay]);
  
  // Handle navigation after loading is complete
  useEffect(() => {
    if (shouldNavigate && navigationData) {
      const timer = setTimeout(() => {
        // Hide the modal
        setShowModal(false);
        
        // Navigate to the booking flow path
        navigate(navigationData.path);
        
        // Reset the state
        setShouldNavigate(false);
        setNavigationData(null);
        
        // Clear the persisted loading state
        localStorage.removeItem(LOADING_STATE_KEY);
        
        // Scroll to top after navigation
        window.scrollTo(0, 0);
      }, 500); // Small delay to allow the "All set!" message to be visible
      
      return () => clearTimeout(timer);
    }
  }, [shouldNavigate, navigationData, navigate]);

  // Cancel ongoing operation if component unmounts while loading
  useEffect(() => {
    return () => {
      // If loading is in progress when component unmounts, persist state to localStorage
      if (isLoadingPrices) {
        try {
          const stateToSave = {
            timestamp: Date.now(),
            isLoading: isLoadingPrices,
            formData: {
              pickup: formData.pickup,
              dropoff: formData.dropoff,
              pickupDisplay: formData.pickupDisplay,
              dropoffDisplay: formData.dropoffDisplay
            }
          };
          
          localStorage.setItem(LOADING_STATE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
          console.error('Error persisting loading state:', error);
        }
      }
      
      // Restore focus when the component unmounts (if we had a modal open)
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [isLoadingPrices, formData]);

  // Focus management for the modal
  useEffect(() => {
    if (showModal) {
      // Save the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal content
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      // Add trap focus within the modal
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length === 0) return;
          
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      // Add event listener for tab key
      document.addEventListener('keydown', handleTabKey);
      
      return () => {
        document.removeEventListener('keydown', handleTabKey);
        
        // Restore focus when the modal closes
        if (previousFocusRef.current instanceof HTMLElement) {
          previousFocusRef.current.focus();
          previousFocusRef.current = null;
        }
      };
    }
  }, [showModal]);

  const handlePassengerChange = (increment: boolean) => {
    userInteractedRef.current = true;
    const newValue = Math.max(1, Math.min(100, increment ? passengers + 1 : passengers - 1));
    setPassengers(newValue);
    
    // Track passenger count changes
    trackEvent('Search Form', 'Change Passenger Count', increment ? 'Increment' : 'Decrement', newValue);
  };

  const handleTripTypeChange = (oneWay: boolean) => {
    userInteractedRef.current = true;
    const newIsReturn = !oneWay;
    
    // Track trip type change
    trackEvent('Search Form', 'Change Trip Type', newIsReturn ? 'Round Trip' : 'One Way');
    
    // If we're toggling back to the original trip type without saving changes,
    // restore the original values
    if (newIsReturn === originalValuesRef.current.isReturn) {
      setIsReturn(newIsReturn);
      setFormData({
        ...formData,
        departureDate: originalValuesRef.current.departureDate,
        dateRange: originalValuesRef.current.dateRange
      });
      return;
    }
    
    setIsReturn(newIsReturn);
    
    if (oneWay) {
      // If switching to one way
      setFormData(prev => ({
        ...prev,
        departureDate: prev.dateRange?.from || prev.departureDate,
        dateRange: undefined
      }));
    } else {
      // If switching to round trip
      setFormData(prev => ({
        ...prev,
        departureDate: undefined,
        dateRange: {
          from: prev.departureDate || prev.dateRange?.from,
          to: prev.dateRange?.to || undefined
        }
      }));
    }
  };

  // Function to geocode addresses using Google Maps Geocoding API - with memoization and WeakMap
  const geocodeAddress = useCallback(async (address: string, field: 'pickup' | 'dropoff'): Promise<{lat: number, lng: number} | null> => {
    if (!address || !window.google?.maps?.Geocoder) return null;
    
    // Sanitize input to prevent XSS
    const sanitizedAddress = xss(address);
    
    // Create cache key for memoization - we need a stable object for the WeakMap
    const cacheKeyObj = {
      key: `${sanitizedAddress}:${field}`,
      toString: () => `${sanitizedAddress}:${field}`
    };
    
    // Check if we already have a promise for this address in our cache
    if (geocodingCache.current.has(cacheKeyObj)) {
      return geocodingCache.current.get(cacheKeyObj)!;
    }
    
    // Start tracking request for this geocoding operation
    let requestId: string | null = null;
    if (currentRequestIdRef.current) {
      requestId = currentRequestIdRef.current;
      requestTracker.updateStage(requestId, 'geocoding');
    }
    
    // Create a promise that will resolve with the coordinates
    const geocodePromise = new Promise<{lat: number, lng: number} | null>(async (resolve) => {
      // Create geocoder and timeout promise
      const geocoder = new google.maps.Geocoder();
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        // Record the start time for performance tracking
        const geocodingStart = performance.now();
        
        // Create timeout promise
        const timeoutPromise = new Promise<null>((resolveTimeout) => {
          timeoutId = setTimeout(() => {
            resolveTimeout(null);
            
            // Track the timeout in error tracking system
            errorTracker.trackError(
              `Geocoding timeout for ${field}: ${sanitizedAddress}`,
              ErrorContext.GEOCODING,
              ErrorSeverity.MEDIUM,
              { address: sanitizedAddress, field, timeout: GEOCODING_TIMEOUT }
            );
            
            // Show toast for timeout
            toast({
              title: "Geocoding Timed Out",
              description: `Unable to find exact location for ${field === 'pickup' ? 'pickup' : 'dropoff'} address. Please try a more specific address.`,
              variant: "destructive"
            });
          }, GEOCODING_TIMEOUT);
        });
        
        // Race between geocoding and timeout
        const result = await Promise.race([
          // Actual geocoding promise
          new Promise<google.maps.GeocoderResult[] | null>((resolveGeocode, rejectGeocode) => {
            geocoder.geocode({ address: sanitizedAddress }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                resolveGeocode(results);
              } else {
                resolveGeocode(null);
              }
            });
          }),
          timeoutPromise
        ]);
        
        // Clear timeout if geocoding completed
        if (timeoutId) clearTimeout(timeoutId);
        
        // Track geocoding performance
        const geocodingTime = performance.now() - geocodingStart;
        trackTiming('Geocoding', field === 'pickup' ? 'Pickup Address' : 'Dropoff Address', geocodingTime);
        
        // Process results
        if (result && result.length > 0 && result[0].geometry?.location) {
          const location = {
            lat: result[0].geometry.location.lat(),
            lng: result[0].geometry.location.lng()
          };
          
          // Store the result in state
          if (field === 'pickup') {
            setPickupCoords(location);
          } else {
            setDropoffCoords(location);
          }
          
          // Set geocoding error field to null for this field
          setGeocodingErrorField(prevField => prevField === field ? null : prevField);
          
          console.log(`Geocoded ${field} coordinates:`, location);
          resolve(location);
        } else {
          // Geocoding failed or timed out
          console.error(`Geocoding failed for ${field}: ${sanitizedAddress}`);
          if (field === 'pickup') {
            setPickupCoords(null);
            setGeocodingErrorField('pickup');
          } else {
            setDropoffCoords(null);
            setGeocodingErrorField('dropoff');
          }
          
          // Check if we have partial data (one location geocoded successfully)
          const hasPartialData = (field === 'pickup' && dropoffCoords) || 
                               (field === 'dropoff' && pickupCoords);
          setHasPartialGeocodingData(hasPartialData);
          
          resolve(null);
        }
      } catch (error) {
        // Handle unexpected errors
        console.error(`Geocoding error for ${field}:`, error);
        errorTracker.trackError(
          error instanceof Error ? error : `Geocoding error: ${error}`,
          ErrorContext.GEOCODING,
          ErrorSeverity.MEDIUM,
          { address: sanitizedAddress, field }
        );
        
        if (field === 'pickup') {
          setPickupCoords(null);
          setGeocodingErrorField('pickup');
        } else {
          setDropoffCoords(null);
          setGeocodingErrorField('dropoff');
        }
        
        // Check if we have partial data (one location geocoded successfully)
        const hasPartialData = (field === 'pickup' && dropoffCoords) || 
                             (field === 'dropoff' && pickupCoords);
        setHasPartialGeocodingData(hasPartialData);
        
        resolve(null);
      }
    });
    
    // Store the promise in our cache
    geocodingCache.current.set(cacheKeyObj, geocodePromise);
    
    // Return the promise
    return geocodePromise;
  }, [toast, pickupCoords, dropoffCoords]);

  // Check rate limit for API requests
  const isRateLimited = (): boolean => {
    try {
      const rateLimitData = localStorage.getItem(RATE_LIMIT_KEY);
      if (!rateLimitData) return false;
      
      const { requests, firstRequestTime } = JSON.parse(rateLimitData);
      const currentTime = Date.now();
      
      // If the first request was more than our timeframe ago, reset the counter
      if (currentTime - firstRequestTime > RATE_LIMIT.TIMEFRAME + RATE_LIMIT.BUFFER_TIME) {
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
          requests: 1,
          firstRequestTime: currentTime
        }));
        return false;
      }
      
      // Check if we've hit the limit
      if (requests >= RATE_LIMIT.MAX_REQUESTS) {
        // Calculate remaining time until rate limit resets
        const resetTime = firstRequestTime + RATE_LIMIT.TIMEFRAME + RATE_LIMIT.BUFFER_TIME;
        const remainingTime = Math.ceil((resetTime - currentTime) / 1000);
        
        toast({
          title: "Rate Limit Reached",
          description: `Please wait ${remainingTime} seconds before trying again.`,
          variant: "destructive"
        });
        
        return true;
      }
      
      // Update the counter
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        requests: requests + 1,
        firstRequestTime
      }));
      
      return false;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false; // Fail open
    }
  };
  
  // Check for duplicate requests
  const isDuplicateRequest = (payload: any): PricingResponse | null => {
    try {
      const lastRequest = lastRequestRef.current;
      if (!lastRequest) return null;
      
      // Check if the request is within a small time window
      const timeSinceLastRequest = Date.now() - lastRequest.timestamp;
      if (timeSinceLastRequest > 60000) return null; // Over 1 minute old
      
      // Check if the payload is the same
      if (isEqual(payload, lastRequest.payload)) {
        console.log('Duplicate request detected, using cached response');
        return lastRequest.response;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for duplicate request:', error);
      return null; // Fail open
    }
  };

  // Function to fetch prices from the API
  const fetchPrices = async (): Promise<PricingResponse | null> => {
    // Check rate limit first
    if (isRateLimited()) {
      return null;
    }
    
    // Start request tracking
    const requestId = requestTracker.startRequest(
      getApiUrl('/check-price'),
      'POST'
    );
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    currentRequestIdRef.current = requestId;
    
    // Attempt to geocode addresses if coordinates are missing
    if (!pickupCoords || !dropoffCoords) {
      requestTracker.updateStage(requestId, 'geocoding');
      
      // Try to geocode addresses
      if (!pickupCoords && formData.pickup) {
        const pickup = await geocodeAddress(formData.pickup, 'pickup');
        if (!pickup) {
          requestTracker.updateStage(requestId, 'failed', {
            error: 'Failed to geocode pickup address'
          });
          
          if (!hasPartialGeocodingData) {
            toast({
              title: "Location Error",
              description: "Unable to determine pickup coordinates. Please try a different address.",
              variant: "destructive"
            });
            return null;
          }
          
          // If we have partial data, we can continue with the dropoff coordinates
          // This will be handled below
        }
      }
      
      if (!dropoffCoords && formData.dropoff) {
        const dropoff = await geocodeAddress(formData.dropoff, 'dropoff');
        if (!dropoff) {
          requestTracker.updateStage(requestId, 'failed', {
            error: 'Failed to geocode dropoff address'
          });
          
          if (!hasPartialGeocodingData) {
            toast({
              title: "Location Error",
              description: "Unable to determine dropoff coordinates. Please try a different address.",
              variant: "destructive"
            });
            return null;
          }
          
          // If we have partial data, we can continue with the pickup coordinates
          // This will be handled below
        }
      }
    }
    
    // Handle partial data case - if one geocoding succeeded but the other failed
    const hasPartialData = (pickupCoords && !dropoffCoords) || (!pickupCoords && dropoffCoords);
    
    // For complete failure, show error and stop
    if (!pickupCoords && !dropoffCoords) {
      requestTracker.updateStage(requestId, 'failed', {
        error: 'Missing coordinates after geocoding attempt'
      });
      
      toast({
        title: "Location Error",
        description: "Unable to get coordinates for one or both locations. Please make sure they are valid addresses.",
        variant: "destructive"
      });
      return null;
    }
    
    const pickupTime = isReturn 
      ? formData.dateRange?.from 
      : formData.departureDate;
      
    if (!pickupTime) {
      requestTracker.updateStage(requestId, 'failed', {
        error: 'Missing pickup time'
      });
      
      toast({
        title: "Time Error",
        description: "Please select a pickup date and time.",
        variant: "destructive"
      });
      return null;
    }
    
    // Format date to ISO8601
    const pickupTimeISO = pickupTime.toISOString();
    
    // Prepare request payload with trip_type parameter
    const payload = {
      pickup_lat: pickupCoords?.lat || 0, // Use 0 for partial data
      pickup_lng: pickupCoords?.lng || 0,
      dropoff_lat: dropoffCoords?.lat || 0,
      dropoff_lng: dropoffCoords?.lng || 0,
      pickup_time: pickupTimeISO,
      trip_type: isReturn ? "2" : "1", // Add trip_type parameter
      correlation_id: correlationId, // Add correlation ID for tracking
      session_id: sessionIdRef.current // Add session ID for user context
    };
    
    // Check for duplicate request
    const cachedResponse = isDuplicateRequest(payload);
    if (cachedResponse) {
      console.log('Using cached response for duplicate request');
      return cachedResponse;
    }
    
    console.log('Sending price request with payload:', payload);
    setApiError(null);
    
    try {
      // Update request stage
      requestTracker.updateStage(requestId, 'network');
      
      // Use our withRetry utility to handle retries and timeouts
      const response = await withRetry(
        async () => {
          // Update retry count for UI
          retryCountRef.current += 1;
          const isRetry = retryCountRef.current > 1;
          
          if (isRetry) {
            // Log retry attempt
            console.log(`Retry attempt ${retryCountRef.current - 1} for price fetch`);
          }
          
          // Use our CORS-aware fetch utility
          const apiEndpoint = getApiUrl('/check-price');
          console.log(`API Endpoint (${isRetry ? 'retry' : 'initial'} request):`, apiEndpoint);
          
          // Display the request details for debugging
          console.log('Request URL:', apiEndpoint);
          console.log('Request Method:', 'POST');
          console.log('Request Headers:', {
            'Content-Type': 'application/json',
            'Origin': window.location.origin,
            'X-Correlation-ID': correlationId,
            'X-Session-ID': sessionIdRef.current
          });
          console.log('Request Body:', JSON.stringify(payload));
          
          // Make sure we have an abort signal from the request tracker
          const signal = requestTracker.getSignal(requestId);
          
          const response = await fetchWithCors(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Correlation-ID': correlationId,
              'X-Session-ID': sessionIdRef.current
            },
            body: JSON.stringify(payload),
            signal: signal // Add the abort signal
          });
          
          // Log response status and headers for debugging
          console.log('Response Status:', response.status);
          console.log('Response Status Text:', response.statusText);
          console.log('Response Headers:', Object.fromEntries([...response.headers.entries()]));
          
          if (!response.ok) {
            // Try to get detailed error text from response
            let errorText = '';
            try {
              errorText = await response.text();
            } catch (e) {
              errorText = 'Could not read error details';
            }
            
            const errorDetail = `Status: ${response.status}, Text: ${response.statusText}, Details: ${errorText}`;
            console.error('API Error:', errorDetail);
            
            // Track the error
            errorTracker.trackError(
              `API Error: ${errorDetail}`,
              ErrorContext.PRICING,
              response.status >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
              { 
                status: response.status, 
                payload, 
                correlationId,
                sessionId: sessionIdRef.current
              }
            );
            
            throw new Error(`API Error: ${errorDetail}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('Response is not JSON:', contentType);
            const text = await response.text();
            console.log('Response Text:', text);
            
            throw new Error(`Expected JSON response but got: ${contentType}`);
          }
          
          // Update stage to processing
          requestTracker.updateStage(requestId, 'processing');
          
          // Parse the response
          const data = await response.json();
          console.log('Pricing data received:', data);
          
          // Add checksum to response if not already present (for data integrity checks)
          if (!data.checksum) {
            // Create a copy without sensitive fields
            const dataForChecksum = { ...data };
            data.checksum = generateChecksum(dataForChecksum);
          }
          
          // Validate the data
          if (!validatePricingData(data)) {
            throw new Error('Invalid pricing data received from API');
          }
          
          // Check API version if provided
          if (data.version) {
            // In a real app, we would check if the version is compatible
            console.log('API Version:', data.version);
          }
          
          // Update request stage to complete
          requestTracker.updateStage(requestId, 'complete', {
            status: response.status,
            correlationId
          });
          
          // Cache the response for deduplication
          lastRequestRef.current = {
            payload,
            timestamp: Date.now(),
            response: data
          };
          
          // Track successful price fetch
          trackEvent('Search Form', 'Price Fetched', `${formData.pickup} to ${formData.dropoff}`);
          
          // Track metrics for successful price fetch
          const metrics = requestTracker.getMetrics(requestId);
          if (metrics && metrics.totalTime) {
            trackTiming(
              'API', 
              'Price Fetch', 
              Math.round(metrics.totalTime),
              `${isReturn ? 'Round Trip' : 'One Way'}`
            );
          }
          
          return data;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          backoffFactor: 2,
          timeout: 30000,
          onRetry: (attempt, error, delay) => {
            console.log(`Retrying price fetch (attempt ${attempt})... Next attempt in ${delay}ms`);
            
            // Show retry toast if loading modal is visible
            if (showModal) {
              toast({
                title: `Retry Attempt ${attempt}`,
                description: "The connection is taking longer than expected. Retrying...",
                variant: "default"
              });
            }
          }
        }
      );
      
      return response;
    } catch (error) {
      console.error('Error fetching prices:', error);
      
      // Update request stage to failed
      requestTracker.updateStage(requestId, 'failed', {
        error: error.message || 'Unknown error',
        correlationId
      });
      
      // Create detailed error message
      let errorMessage = 'Failed to get pricing information. ';
      
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again later.';
      }
      
      setApiError(errorMessage);

      // Track error
      trackEvent('Search Form', 'Price Fetch Error', error.message, 0, true);
      
      // Track the error with our error tracker
      errorTracker.trackError(
        error instanceof Error ? error : errorMessage,
        ErrorContext.PRICING,
        ErrorSeverity.MEDIUM,
        { 
          payload, 
          retryCount: retryCountRef.current - 1,
          correlationId,
          sessionId: sessionIdRef.current
        }
      );
      
      // Show error toast
      toast({
        title: "Pricing Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      // Reset retry count for next operation
      retryCountRef.current = 0;
    }
  };
  
  // Handle trying a different route for geocoding failures
  const handleTryDifferentRoute = () => {
    // Close the modal
    setShowModal(false);
    setIsLoadingPrices(false);
    
    // Clear the error field
    if (geocodingErrorField === 'pickup') {
      setFormData(prev => ({
        ...prev,
        pickup: '',
        pickupDisplay: ''
      }));
      
      // Focus the pickup input
      setTimeout(() => {
        const pickupInput = document.querySelector('input[placeholder="Pickup location"]');
        if (pickupInput instanceof HTMLElement) {
          pickupInput.focus();
        }
      }, 100);
    } else if (geocodingErrorField === 'dropoff') {
      setFormData(prev => ({
        ...prev,
        dropoff: '',
        dropoffDisplay: ''
      }));
      
      // Focus the dropoff input
      setTimeout(() => {
        const dropoffInput = document.querySelector('input[placeholder="Dropoff location"]');
        if (dropoffInput instanceof HTMLElement) {
          dropoffInput.focus();
        }
      }, 100);
    }
    
    // Reset geocoding error state
    setGeocodingErrorField(null);
    setHasPartialGeocodingData(false);
    
    // Clear persisted loading state
    localStorage.removeItem(LOADING_STATE_KEY);
  };

  const handlePlaceSelect = (field: 'pickup' | 'dropoff', displayName: string, placeData?: google.maps.places.PlaceResult) => {
    // Sanitize input
    const sanitizedDisplayName = xss(displayName);
    
    // Store both the display name and URL-friendly version
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedDisplayName,
      [`${field}Display`]: sanitizedDisplayName
    }));
    
    console.log(`Selected ${field}:`, sanitizedDisplayName);
    
    // Get coordinates if placeData is provided
    if (placeData && placeData.geometry && placeData.geometry.location) {
      const location = {
        lat: placeData.geometry.location.lat(),
        lng: placeData.geometry.location.lng()
      };
      
      if (field === 'pickup') {
        setPickupCoords(location);
        console.log('Pickup coordinates:', location);
      } else {
        setDropoffCoords(location);
        console.log('Dropoff coordinates:', location);
      }
    } else {
      // If no placeData or no coordinates, try to geocode the address
      geocodeAddress(sanitizedDisplayName, field);
    }
  };

  const handlePickupValidation = (isValid: boolean) => {
    setPickupIsValid(isValid);
  };

  const handleDropoffValidation = (isValid: boolean) => {
    setDropoffIsValid(isValid);
  };

  // Debounce for rapid consecutive clicks
  const isClickThrottled = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    if (timeSinceLastClick < 1000 && !isClickThrottledRef.current) {
      isClickThrottledRef.current = true;
      setTimeout(() => {
        isClickThrottledRef.current = false;
      }, 1000);
      
      return false; // First click in rapid succession
    }
    
    if (isClickThrottledRef.current) {
      console.log('Throttling rapid click');
      return true; // Throttle additional clicks
    }
    
    // Update last click time
    lastClickTimeRef.current = now;
    return false;
  };

  // Handler for canceling loading
  const handleCancelLoading = useCallback(() => {
    // Abort any ongoing request
    if (currentRequestIdRef.current) {
      requestTracker.abortRequest(currentRequestIdRef.current, 'User canceled operation');
      currentRequestIdRef.current = null;
    }
    
    // Reset loading states
    setIsLoadingPrices(false);
    setShowModal(false);
    setApiError(null);
    
    // Reset geocoding error state
    setGeocodingErrorField(null);
    setHasPartialGeocodingData(false);
    
    // Track cancellation
    trackEvent('User Behavior', 'Cancelled Loading', 
      `${formData.pickup} to ${formData.dropoff}`, Math.round(performance.now() - loadingStartTime));
    
    // Clear persisted loading state
    localStorage.removeItem(LOADING_STATE_KEY);
    
    // Restore focus
    if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [trackEvent, formData.pickup, formData.dropoff, loadingStartTime]);

  const handleSubmit = async () => {
    // Check for rapid clicks
    if (isClickThrottled()) {
      return;
    }
    
    // Sanitize inputs
    const pickup = xss(formData.pickup);
    const dropoff = xss(formData.dropoff);
    
    if (!pickup || !dropoff || (!formData.departureDate && !formData.dateRange?.from)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (isReturn && !formData.dateRange?.to) {
      toast({
        title: "Missing Return Date",
        description: "Please select a return date for round trips",
        variant: "destructive"
      });
      return;
    }

    if (!pickupIsValid) {
      toast({
        title: "Invalid Pickup Address",
        description: "Please enter a complete pickup address with street name and number",
        variant: "destructive"
      });
      return;
    }

    if (!dropoffIsValid) {
      toast({
        title: "Invalid Dropoff Address",
        description: "Please enter a complete dropoff address with street name and number",
        variant: "destructive"
      });
      return;
    }

    // Reset any previous errors
    setApiError(null);
    
    // Save currently focused element for later restoration
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Record loading start time
    const startTime = performance.now();
    setLoadingStartTime(startTime);
    
    // Check if we have a slow connection based on previous requests
    const isConnectionSlow = requestTracker.isSlowConnection();
    setIsSlowConnection(isConnectionSlow);
    
    // Show the loading modal
    setShowModal(true);
    
    // Set isLoadingPrices to true to start the loading animation
    setIsLoadingPrices(true); 
    
    // Persist loading state to localStorage (for refresh recovery)
    try {
      const stateToSave = {
        timestamp: Date.now(),
        isLoading: true,
        formData: {
          pickup: formData.pickup,
          dropoff: formData.dropoff,
          pickupDisplay: formData.pickupDisplay,
          dropoffDisplay: formData.dropoffDisplay,
          // We don't need to save complex date objects
          // Just need enough to restore the form state
        }
      };
      
      localStorage.setItem(LOADING_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error persisting loading state:', error);
      // Non-critical, can continue
    }

    const pricingResponse = await fetchPrices();
    
    // If the pricing fetch failed, stop here - the modal will still be visible showing the error
    if (!pricingResponse) {
      setIsLoadingPrices(false);
      
      // Don't close the modal here - leave it open to show error and options
      
      // Clear the persisted loading state
      localStorage.removeItem(LOADING_STATE_KEY);
      return;
    }
    
    // Verify data integrity before proceeding
    if (!validatePricingData(pricingResponse)) {
      setIsLoadingPrices(false);
      setShowModal(false);
      
      toast({
        title: "Data Validation Error",
        description: "The pricing data received was incomplete or invalid. Please try again.",
        variant: "destructive"
      });
      
      errorTracker.trackError(
        'Invalid pricing data structure',
        ErrorContext.PRICING,
        ErrorSeverity.HIGH,
        { data: pricingResponse }
      );
      
      // Clear the persisted loading state
      localStorage.removeItem(LOADING_STATE_KEY);
      return;
    }
    
    // Verify checksum if present
    if (pricingResponse.checksum) {
      // Create a copy without the checksum
      const dataForVerification = { ...pricingResponse };
      delete dataForVerification.checksum;
      
      if (!verifyChecksum(dataForVerification, pricingResponse.checksum)) {
        setIsLoadingPrices(false);
        setShowModal(false);
        
        toast({
          title: "Data Integrity Error",
          description: "The pricing data may have been corrupted. Please try again.",
          variant: "destructive"
        });
        
        errorTracker.trackError(
          'Checksum verification failed',
          ErrorContext.PRICING,
          ErrorSeverity.HIGH,
          { 
            expectedChecksum: pricingResponse.checksum,
            calculatedChecksum: generateChecksum(dataForVerification)
          }
        );
        
        // Clear the persisted loading state
        localStorage.removeItem(LOADING_STATE_KEY);
        return;
      }
    }
    
    // Store URL-friendly versions of pickup and dropoff
    const encodedPickup = encodeURIComponent(pickup.toLowerCase().replace(/\s+/g, '-'));
    const encodedDropoff = encodeURIComponent(dropoff.toLowerCase().replace(/\s+/g, '-'));
    
    // Important: Type is '1' for One Way, '2' for Round Trip 
    const type = isReturn ? '2' : '1';
    
    const departureDate = isReturn ? formData.dateRange?.from : formData.departureDate;
    const formattedDepartureDate = departureDate ? formatDateForUrl(departureDate) : '';
    
    // Always include returnDate parameter (use '0' for one-way trips)
    const returnDateParam = isReturn && formData.dateRange?.to
      ? formatDateForUrl(formData.dateRange.to)
      : '0';
    
    // Check that all required parameters for navigation are valid
    if (!encodedPickup || !encodedDropoff || !formattedDepartureDate) {
      setIsLoadingPrices(false);
      setShowModal(false);
      
      toast({
        title: "Validation Error",
        description: "One or more required fields are missing or invalid.",
        variant: "destructive"
      });
      
      errorTracker.trackError(
        'Missing required navigation parameters',
        ErrorContext.VALIDATION,
        ErrorSeverity.MEDIUM,
        { 
          encodedPickup, 
          encodedDropoff, 
          formattedDepartureDate, 
          returnDateParam, 
          type 
        }
      );
      
      // Clear the persisted loading state
      localStorage.removeItem(LOADING_STATE_KEY);
      return;
    }
    
    const path = `/transfer/${encodedPickup}/${encodedDropoff}/${type}/${formattedDepartureDate}/${returnDateParam}/${passengers}/form`;
    
    // Track search form submission
    trackEvent('Search Form', 'Form Submit', `${pickup} to ${dropoff}`, passengers);
    
    // Calculate loading time and track it
    const loadTime = performance.now() - startTime;
    trackTiming('Search Form', 'Load Time', Math.round(loadTime), isReturn ? 'Round Trip' : 'One Way');
    
    // Update original values to match the new state
    originalValuesRef.current = {
      isReturn,
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      pickupDisplay: formData.pickupDisplay,
      dropoffDisplay: formData.dropoffDisplay,
      departureDate: formData.departureDate,
      dateRange: formData.dateRange,
      passengers
    };
    
    // Store the display names and URL-friendly names in booking context
    setBookingState(prev => ({
      ...prev,
      from: pickup, 
      to: dropoff,
      fromDisplay: formData.pickupDisplay,
      toDisplay: formData.dropoffDisplay,
      isReturn,
      departureDate: formattedDepartureDate,
      returnDate: returnDateParam !== '0' ? returnDateParam : undefined,
      passengers,
      // Store pricing data in context
      pricingResponse
    }));
    
    // Set the navigation data and trigger navigation
    setNavigationData({
      path,
      pricingResponse
    });
    
    // Mark loading as complete and set shouldNavigate to true after a short delay
    // to allow the "All set!" message to be visible
    setIsLoadingPrices(false);
    
    // Use a small delay before navigation to ensure the "All set!" message is visible
    setTimeout(() => {
      setShouldNavigate(true);
    }, 700);
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full">
          <div className="text-center p-6">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Search Form</h2>
            <p className="text-gray-600 mb-4">
              We encountered an error while trying to load the search form. Please refresh the page and try again.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full">
        {/* Loading Modal */}
        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loading-title"
          >
            <div 
              ref={modalRef}
              className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full"
              id="loading-content"
              tabIndex={-1}
            >
              <ErrorBoundary
                fallback={
                  <div className="text-center">
                    <XCircle className="w-12 h-12 text-red-600 mx-auto mb-6" />
                    <h2 id="loading-title\" className="text-xl font-semibold mb-2">Loading Error</h2>
                    <p className="text-gray-700 mb-6">
                      Something went wrong while loading your request.
                    </p>
                    <button
                      onClick={handleCancelLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go Back
                    </button>
                  </div>
                }
              >
                <LoadingAnimation 
                  loadingComplete={!isLoadingPrices} 
                  onCancel={handleCancelLoading}
                  onTryDifferentRoute={hasPartialGeocodingData ? handleTryDifferentRoute : undefined}
                  error={apiError}
                  startTime={loadingStartTime}
                  isSlowConnection={isSlowConnection}
                  geocodingErrorField={geocodingErrorField}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* API Error Display */}
        {apiError && !showModal && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-red-800">API Error</p>
                <p className="text-red-700 text-sm mt-1">{apiError}</p>
                <button 
                  onClick={() => setApiError(null)}
                  className="text-xs text-blue-600 mt-2 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                !isReturn ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
              onClick={() => handleTripTypeChange(true)}
              aria-pressed={!isReturn}
            >
              One Way
            </button>
            <button
              className={`flex-1 py-2 text-center rounded-lg transition-colors ${
                isReturn ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}
              onClick={() => handleTripTypeChange(false)}
              aria-pressed={isReturn}
            >
              Round Trip
            </button>
          </div>

          <div className="space-y-6">
            {/* Pickup Location */}
            <GooglePlacesAutocomplete
              value={formData.pickup}
              onChange={(value) => {
                userInteractedRef.current = true;
                setFormData(prev => ({ 
                  ...prev, 
                  pickup: value,
                  pickupDisplay: value
                }));
              }}
              onPlaceSelect={(displayName, placeData) => handlePlaceSelect('pickup', displayName, placeData)}
              placeholder="Pickup location"
              className="w-full"
              required={true}
              onValidation={handlePickupValidation}
            />

            {/* Dropoff Location */}
            <GooglePlacesAutocomplete
              value={formData.dropoff}
              onChange={(value) => {
                userInteractedRef.current = true;
                setFormData(prev => ({ 
                  ...prev, 
                  dropoff: value,
                  dropoffDisplay: value
                }));
              }}
              onPlaceSelect={(displayName, placeData) => handlePlaceSelect('dropoff', displayName, placeData)}
              placeholder="Dropoff location"
              className="w-full"
              required={true}
              onValidation={handleDropoffValidation}
            />

            {/* Date Selection */}
            {isReturn ? (
              <DateRangePicker
                dateRange={formData.dateRange}
                onDateRangeChange={(dateRange) => {
                  userInteractedRef.current = true;
                  setFormData(prev => ({
                    ...prev,
                    dateRange,
                    departureDate: undefined
                  }));
                  if (dateRange?.from && dateRange?.to) {
                    trackEvent('Search Form', 'Select Date Range', 
                      `${dateRange.from.toISOString()} to ${dateRange.to.toISOString()}`);
                  }
                }}
                placeholder="Select departure & return dates"
              />
            ) : (
              <DatePicker
                date={formData.departureDate}
                onDateChange={(date) => {
                  userInteractedRef.current = true;
                  setFormData(prev => ({
                    ...prev,
                    departureDate: date,
                    dateRange: undefined
                  }));
                  if (date) {
                    trackEvent('Search Form', 'Select Date', date.toISOString());
                  }
                }}
                placeholder="Select departure date"
              />
            )}

            {/* Passengers */}
            <div className="relative flex items-center">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <div className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md flex justify-between items-center">
                <span className="text-gray-700">{passengers} Passenger{passengers !== 1 ? 's' : ''}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePassengerChange(false)}
                    className={`p-1 rounded-full transition-colors ${
                      passengers > 1 ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' : 'text-gray-300'
                    }`}
                    disabled={passengers <= 1}
                    aria-label="Decrease number of passengers"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePassengerChange(true)}
                    className={`p-1 rounded-full transition-colors ${
                      passengers < 100 ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' : 'text-gray-300'
                    }`}
                    disabled={passengers >= 100}
                    aria-label="Increase number of passengers"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button 
            className={`w-full py-3 rounded-md flex items-center justify-center space-x-2 ${
              pickupIsValid && dropoffIsValid && (formData.departureDate || (formData.dateRange?.from && formData.dateRange?.to))
                ? 'bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`} 
            onClick={handleSubmit}
            disabled={isLoadingPrices || !pickupIsValid || !dropoffIsValid || !(formData.departureDate || (formData.dateRange?.from && formData.dateRange?.to))}
            aria-label="Search for prices"
          >
            <span>See Prices</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SearchForm;