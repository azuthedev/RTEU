import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Users, ArrowRight, Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
import { throttle } from 'lodash-es';
import { DatePicker } from './ui/date-picker';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useAnalytics } from '../hooks/useAnalytics';
import { GooglePlacesAutocomplete } from './ui/GooglePlacesAutocomplete';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../components/ui/use-toast';
import { fetchWithCors, getApiUrl } from '../utils/corsHelper';
import LoadingAnimation from './LoadingAnimation';
import { errorTracker, ErrorContext, ErrorSeverity } from '../utils/errorTracker';
import { requestTracker } from '../utils/requestTracker';
import { 
  geocodeAddress, 
  formatDateForUrl, 
  parseDateFromUrl, 
  validateTransferAddress,
  getMinimumBookingTime,
  isValidBookingTime
} from '../utils/searchFormHelpers';
import { useLanguage } from '../contexts/LanguageContext';

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
}

const SearchForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { bookingState, setBookingState } = useBooking();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Store original values for comparison and restoration
  const originalValuesRef = useRef({
    isReturn: false,
    pickup: '',
    dropoff: '',
    pickupDisplay: '',
    dropoffDisplay: '',
    pickupDateTime: undefined as Date | undefined,
    dropoffDateTime: undefined as Date | undefined,
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
    pickupDateTime: undefined as Date | undefined,
    dropoffDateTime: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined
  });

  // State for geocoded coordinates
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(null);
  const [dropoffPlaceId, setDropoffPlaceId] = useState<string | null>(null);
  
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Flag to track if initial state loading is complete
  const initialStateLoadedRef = useRef(false);
  
  // Flag to track if user has interacted with the form
  const userInteractedRef = useRef(false);
  
  // Track validation state for addresses
  const [pickupIsValid, setPickupIsValid] = useState(false);
  const [dropoffIsValid, setDropoffIsValid] = useState(false);

  // Track active request ID
  const activeRequestRef = useRef<string | null>(null);
  
  // Flag for intentional navigation after successful API response
  const navigatingIntentionallyRef = useRef(false);
  
  // Flag to track component mount status
  const isMountedRef = useRef(true);
  
  // Time tracking for request throttling
  const lastClickTimeRef = useRef<number>(0);
  const isClickThrottledRef = useRef<boolean>(false);
  
  // Add a flag to track if a search was successful but component unmounted during transition
  const successfulSearchRef = useRef<boolean>(false);
  
  // Track geocoding error fields
  const [geocodingErrorField, setGeocodingErrorField] = useState<'pickup' | 'dropoff' | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up any active request when component unmounts
      if (activeRequestRef.current) {
        requestTracker.abortRequest(activeRequestRef.current, 'Component unmounted');
      }
    };
  }, []);

  // First, check if we have display data from context (coming back from booking flow)
  useEffect(() => {
    // Only apply this if we haven't loaded initial state yet
    if (!initialStateLoadedRef.current) {
      console.log("Checking for context data to initialize form", {
        fromDisplay: bookingState.fromDisplay,
        toDisplay: bookingState.toDisplay,
        isReturn: bookingState.isReturn,
        pickupDateTime: bookingState.pickupDateTime,
        dropoffDateTime: bookingState.dropoffDateTime
      });
      
      // Preserve any existing coordinates if available
      if (bookingState.fromCoords) {
        setPickupCoords(bookingState.fromCoords);
      }
      
      if (bookingState.toCoords) {
        setDropoffCoords(bookingState.toCoords);
      }
      
      setIsReturn(!!bookingState.isReturn);
      
      if (bookingState.passengers) {
        setPassengers(bookingState.passengers);
      }
      
      // Update form data with context values
      setFormData({
        pickup: bookingState.fromDisplay || bookingState.from || '',
        dropoff: bookingState.toDisplay || bookingState.to || '',
        pickupDisplay: bookingState.fromDisplay || bookingState.from || '',
        dropoffDisplay: bookingState.toDisplay || bookingState.to || '',
        pickupDateTime: bookingState.pickupDateTime,
        dropoffDateTime: bookingState.dropoffDateTime,
        dateRange: bookingState.isReturn && bookingState.pickupDateTime && bookingState.dropoffDateTime
          ? { from: bookingState.pickupDateTime, to: bookingState.dropoffDateTime }
          : undefined
      });
      
      // Store original values for comparison
      originalValuesRef.current = {
        isReturn: !!bookingState.isReturn,
        pickup: bookingState.fromDisplay || bookingState.from || '',
        dropoff: bookingState.toDisplay || bookingState.to || '',
        pickupDisplay: bookingState.fromDisplay || bookingState.from || '',
        dropoffDisplay: bookingState.toDisplay || bookingState.to || '',
        pickupDateTime: bookingState.pickupDateTime,
        dropoffDateTime: bookingState.dropoffDateTime,
        dateRange: bookingState.pickupDateTime && bookingState.dropoffDateTime && bookingState.isReturn
          ? { from: bookingState.pickupDateTime, to: bookingState.dropoffDateTime }
          : undefined,
        passengers: bookingState.passengers || 1
      };
      
      initialStateLoadedRef.current = true;
    }
  }, [bookingState]);

  // Then initialize from URL if coming from booking flow
  useEffect(() => {
    // Skip if we've already loaded the initial state
    if (initialStateLoadedRef.current) {
      return;
    }
    
    // Check if we're on the pre-filled home route
    if (location.pathname.startsWith('/home/transfer/')) {
      const params = new URLSearchParams(location.search);
      // Parse URL parameters
      const urlPattern = /\/home\/transfer\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/form/;
      const match = location.pathname.match(urlPattern);
      
      if (match) {
        const [, from, to, type, date, returnDate, passengers] = match;
        
        // Properly decode URL parameters
        const decodedFrom = decodeURIComponent(from.replace(/-/g, ' '));
        const decodedTo = decodeURIComponent(to.replace(/-/g, ' '));
        
        // Convert type to boolean flag - '1' means One Way (isReturn = false)
        const isRoundTrip = type === '2';
        setIsReturn(isRoundTrip);
        setPassengers(Math.max(1, parseInt(passengers || '1', 10)));
        
        // Parse dates with times (default time set in parseDateFromUrl)
        const pickupDateTime = parseDateFromUrl(date);
        const dropoffDateTime = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;
        
        const newFormData = {
          pickup: decodedFrom,
          dropoff: decodedTo,
          pickupDisplay: decodedFrom,
          dropoffDisplay: decodedTo,
          pickupDateTime: pickupDateTime,
          dropoffDateTime: dropoffDateTime,
          dateRange: isRoundTrip && pickupDateTime && dropoffDateTime
            ? { from: pickupDateTime, to: dropoffDateTime } as DateRange
            : undefined
        };

        setFormData(newFormData);

        // Store original values for comparison
        originalValuesRef.current = {
          isReturn: isRoundTrip,
          pickup: decodedFrom,
          dropoff: decodedTo,
          pickupDisplay: decodedFrom,
          dropoffDisplay: decodedTo,
          pickupDateTime: pickupDateTime,
          dropoffDateTime: dropoffDateTime,
          dateRange: newFormData.dateRange,
          passengers: Math.max(1, parseInt(passengers || '1', 10))
        };
        
        initialStateLoadedRef.current = true;
      }
    } else {
      // If not coming from URL with params, set current date + 4 hours as the default
      const defaultPickupDateTime = getMinimumBookingTime();
      setFormData(prev => ({
        ...prev,
        pickupDateTime: defaultPickupDateTime
      }));
      
      // Mark as initialized
      initialStateLoadedRef.current = true;
    }
  }, [location.pathname, location.search]);

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
    // restore original values
    if (newIsReturn === originalValuesRef.current.isReturn) {
      setIsReturn(newIsReturn);
      setFormData(prev => ({
        ...prev,
        pickupDateTime: originalValuesRef.current.pickupDateTime,
        dropoffDateTime: originalValuesRef.current.dropoffDateTime,
        dateRange: originalValuesRef.current.pickupDateTime && originalValuesRef.current.dropoffDateTime
          ? { from: originalValuesRef.current.pickupDateTime, to: originalValuesRef.current.dropoffDateTime }
          : undefined
      }));
      return;
    }
    
    setIsReturn(newIsReturn);
    
    if (oneWay) {
      // Switching to One Way
      setFormData(prev => {
        return {
          ...prev,
          pickupDateTime: prev.dateRange?.from || prev.pickupDateTime,
          dropoffDateTime: undefined,
          dateRange: undefined
        };
      });
    } else {
      // Switching to Round Trip
      setFormData(prev => {
        // Calculate a default return date (1 day after pickup)
        const pickupDate = prev.pickupDateTime || getMinimumBookingTime();
        const defaultDropoffDate = new Date(pickupDate);
        defaultDropoffDate.setDate(defaultDropoffDate.getDate() + 1);
        
        return {
          ...prev,
          pickupDateTime: prev.pickupDateTime || getMinimumBookingTime(),
          dropoffDateTime: prev.dropoffDateTime || defaultDropoffDate,
          dateRange: {
            from: prev.pickupDateTime || getMinimumBookingTime(),
            to: prev.dropoffDateTime || defaultDropoffDate
          }
        };
      });
    }
  };

  // Function to fetch prices from the API
  const fetchPrices = async (): Promise<PricingResponse | null> => {
    if (!formData.pickup || !formData.dropoff) {
      if (isMountedRef.current) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
      }
      return null;
    }

    // Check if there's already a pricing request in progress
    if (requestTracker.isRequestInProgress('fetch-prices')) {
      if (isMountedRef.current) {
        toast({
          title: "Request In Progress",
          description: "Please wait while we fetch prices for your route",
          variant: "warning"
        });
      }
      return null;
    }
    
    // Check if we're in cooldown period
    const { inCooldown, remainingTime } = requestTracker.isInCooldown('fetch-prices');
    if (inCooldown) {
      if (isMountedRef.current) {
        toast({
          title: "Request Cooldown",
          description: `Please wait ${Math.ceil(remainingTime / 1000)} seconds before trying again`,
          variant: "warning"
        });
      }
      return null;
    }

    // Start request tracking
    const { requestId, signal, cooldownRemaining } = requestTracker.startRequest('fetch-prices', 'POST');
    
    // If we're in cooldown, don't proceed
    if (cooldownRemaining > 0) {
      if (isMountedRef.current) {
        toast({
          title: "Request Cooldown",
          description: `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds before trying again`,
          variant: "warning"
        });
      }
      return null;
    }
    
    activeRequestRef.current = requestId;
    
    try {
      requestTracker.updateStage(requestId, 'geocoding');
      
      // Use stored place_ids when available for more reliable geocoding
      let pickup = pickupCoords;
      let dropoff = dropoffCoords;
      
      if (!pickup) {
        try {
          pickup = await geocodeAddress(formData.pickup, 'pickup', pickupPlaceId);
        } catch (error) {
          // Handle geocoding error - specific to pickup
          if (isMountedRef.current) {
            setGeocodingErrorField('pickup');
            setIsLoadingPrices(false);
          }
          requestTracker.updateStage(requestId, 'failed', {
            error: `Geocoding failed for pickup location: ${error.message}`
          });
          return null;
        }
      }
      
      if (!dropoff) {
        try {
          dropoff = await geocodeAddress(formData.dropoff, 'dropoff', dropoffPlaceId);
        } catch (error) {
          // Handle geocoding error - specific to dropoff
          if (isMountedRef.current) {
            setGeocodingErrorField('dropoff');
            setIsLoadingPrices(false);
          }
          requestTracker.updateStage(requestId, 'failed', {
            error: `Geocoding failed for dropoff location: ${error.message}`
          });
          return null;
        }
      }
      
      if (!pickup || !dropoff) {
        // Set appropriate geocoding error field if not already set
        if (isMountedRef.current) {
          if (!pickup && !dropoff) {
            setGeocodingErrorField('pickup'); // Default to pickup if both failed
          } else if (!pickup) {
            setGeocodingErrorField('pickup');
          } else if (!dropoff) {
            setGeocodingErrorField('dropoff');
          }
          
          toast({
            title: "Location Error",
            description: !pickup 
              ? "Unable to find coordinates for pickup location. Please select a more specific address." 
              : "Unable to find coordinates for dropoff location. Please select a more specific address.",
            variant: "destructive"
          });
          
          setIsLoadingPrices(false);
        }
        requestTracker.updateStage(requestId, 'failed', {
          error: `Missing coordinates for ${!pickup ? 'pickup' : 'dropoff'} location`
        });
        return null;
      }
      
      // Get pickup date/time - use full Date objects with proper time
      const pickupDateTime = isReturn ? formData.dateRange?.from : formData.pickupDateTime;
      
      if (!pickupDateTime) {
        if (isMountedRef.current) {
          toast({
            title: "Time Error",
            description: "Please select a pickup date and time.",
            variant: "destructive"
          });
          setIsLoadingPrices(false);
        }
        requestTracker.updateStage(requestId, 'failed', {
          error: 'Missing pickup date and time'
        });
        return null;
      }
      
      // Validate pickup time is at least 4 hours in the future
      const minBookingTime = getMinimumBookingTime();
      if (!isValidBookingTime(pickupDateTime)) {
        if (isMountedRef.current) {
          toast({
            title: "Time Error",
            description: "Pickup time must be at least 4 hours from now.",
            variant: "destructive"
          });
          setIsLoadingPrices(false);
        }
        requestTracker.updateStage(requestId, 'failed', {
          error: 'Pickup time must be at least 4 hours from now'
        });
        return null;
      }
      
      // For return trips, validate return time is after pickup time
      if (isReturn && formData.dateRange?.to) {
        if (formData.dateRange.to.getTime() <= pickupDateTime.getTime()) {
          if (isMountedRef.current) {
            toast({
              title: "Time Error",
              description: "Return time must be after pickup time.",
              variant: "destructive"
            });
            setIsLoadingPrices(false);
          }
          requestTracker.updateStage(requestId, 'failed', {
            error: 'Return time must be after pickup time'
          });
          return null;
        }
      }
      
      // Format date to ISO8601 - preserve exact time
      const pickupTimeISO = pickupDateTime.toISOString();
      
      // Prepare request payload with trip_type parameter
      const payload = {
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        pickup_time: pickupTimeISO,
        trip_type: isReturn ? "2" : "1" // Add trip_type parameter
      };
      
      console.log('Sending price request with payload:', payload);
      
      requestTracker.updateStage(requestId, 'network');
      
      // Use our CORS-aware fetch utility
      const apiEndpoint = getApiUrl('/check-price');
      console.log('API Endpoint:', apiEndpoint);
      
      // Display the request details for debugging
      console.log('Request URL:', apiEndpoint);
      console.log('Request Method:', 'POST');
      console.log('Request Headers:', {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      });
      console.log('Request Body:', JSON.stringify(payload));
      
      // Check if component is still mounted before continuing
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting fetchPrices');
        requestTracker.updateStage(requestId, 'cancelled', {
          error: 'Component unmounted'
        });
        return null;
      }
      
      const response = await fetchWithCors(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal // Use the abort signal from requestTracker
      });
      
      // Check if component is still mounted before processing response
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting fetchPrices after API request');
        requestTracker.updateStage(requestId, 'cancelled', {
          error: 'Component unmounted after API request'
        });
        return null;
      }
      
      requestTracker.updateStage(requestId, 'processing');
      
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
        
        // Update request tracker
        requestTracker.updateStage(requestId, 'failed', {
          error: errorDetail,
          status: response.status
        });
        
        // Track API error
        errorTracker.trackError(
          new Error(`API Error: ${errorDetail}`),
          ErrorContext.PRICING,
          ErrorSeverity.HIGH,
          { 
            response: { status: response.status, statusText: response.statusText },
            requestId
          }
        );
        
        throw new Error(`API Error: ${errorDetail}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Response is not JSON:', contentType);
        const text = await response.text();
        console.log('Response Text:', text);
        
        requestTracker.updateStage(requestId, 'failed', {
          error: `Expected JSON response but got: ${contentType}`
        });
        
        throw new Error(`Expected JSON response but got: ${contentType}`);
      }
      
      const data: PricingResponse = await response.json();
      console.log('Pricing data received:', data);
      
      // Track successful price fetch
      if (isMountedRef.current) {
        trackEvent('Search Form', 'Price Fetched', `${formData.pickup} to ${formData.dropoff}`);
      }
      
      // Mark request as complete
      requestTracker.updateStage(requestId, 'complete');
      
      // Set successful search flag to true
      successfulSearchRef.current = true;
      
      // Clear active request ID
      activeRequestRef.current = null;
      
      return data;
    } catch (error) {
      // If component is unmounted or we're navigating intentionally, don't show errors
      if (!isMountedRef.current || navigatingIntentionallyRef.current || successfulSearchRef.current) {
        console.log('Not showing error because component is unmounted or navigation was intentional');
        return null;
      }
      
      console.error('Error fetching prices:', error);
      
      // Create detailed error message
      let errorMessage = 'Failed to get pricing information. ';
      
      if (error.message) {
        // Don't show "Component unmounted" errors to the user
        if (error.message.includes('unmounted') || error.message.includes('AbortError')) {
          console.log('Suppressing unmount-related error message');
          return null;
        }
        
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again later.';
      }
      
      if (isMountedRef.current) {
        setApiError(errorMessage);
        
        toast({
          title: "Pricing Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      // Update request as failed
      requestTracker.updateStage(requestId, 'failed', {
        error: errorMessage
      });
      
      // Track error
      errorTracker.trackError(
        error instanceof Error ? error : new Error(String(error)),
        ErrorContext.PRICING,
        ErrorSeverity.HIGH,
        { 
          payload: {
            from: formData.pickup,
            to: formData.dropoff,
            isReturn,
            pickupDateTime: isReturn ? formData.dateRange?.from : formData.pickupDateTime
          },
          correlationId: requestId
        }
      );
      
      return null;
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setIsLoadingPrices(false);
      }
    }
  };

  const handleSubmit = async () => {
    // Check for basic form validity
    if (!formData.pickup || !formData.dropoff) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check for valid date/time selection
    const pickupDateTime = isReturn ? formData.dateRange?.from : formData.pickupDateTime;
    if (!pickupDateTime) {
      toast({
        title: "Missing Information",
        description: "Please select a pickup date and time",
        variant: "destructive"
      });
      return;
    }
    
    // Validate pickup time is at least 4 hours in the future
    if (!isValidBookingTime(pickupDateTime)) {
      toast({
        title: "Invalid Pickup Time",
        description: "Pickup time must be at least 4 hours from now",
        variant: "destructive"
      });
      return;
    }

    // Additional validation for round trip dates
    if (isReturn && !formData.dateRange?.to) {
      toast({
        title: "Missing Return Date",
        description: "Please select a return date for round trips",
        variant: "destructive"
      });
      return;
    }
    
    // Validate return date is after pickup date
    if (isReturn && formData.dateRange?.from && formData.dateRange?.to) {
      if (formData.dateRange.to.getTime() <= formData.dateRange.from.getTime()) {
        toast({
          title: "Invalid Return Date",
          description: "Return date must be after pickup date",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate addresses
    if (!pickupIsValid) {
      toast({
        title: "Invalid Pickup Address",
        description: "Please enter a complete pickup address with street name and number, or select an option from the suggestions",
        variant: "destructive"
      });
      return;
    }

    if (!dropoffIsValid) {
      toast({
        title: "Invalid Dropoff Address",
        description: "Please enter a complete dropoff address with street name and number, or select an option from the suggestions",
        variant: "destructive"
      });
      return;
    }

    // Implement request throttling - prevent rapid clicking
    const now = Date.now();
    if (now - lastClickTimeRef.current < 800) {
      if (!isClickThrottledRef.current) {
        isClickThrottledRef.current = true;
        toast({
          title: "Please wait",
          description: "Processing your request...",
          variant: "default"
        });
        
        // Reset throttle flag after a short delay
        setTimeout(() => {
          isClickThrottledRef.current = false;
        }, 1500);
      }
      return;
    }
    lastClickTimeRef.current = now;

    // If there's an existing active request, cancel it
    if (activeRequestRef.current) {
      // Only show cancellation toast if this isn't the result of rapid, valid interaction
      if (!successfulSearchRef.current && !navigatingIntentionallyRef.current && isMountedRef.current) {
        requestTracker.abortRequest(activeRequestRef.current, 'Previous search canceled by user');
        toast({
          title: "Previous search canceled",
          description: "Starting new search...",
          variant: "default"
        });
      }
    }

    // Reset all state for the new search
    successfulSearchRef.current = false;
    navigatingIntentionallyRef.current = false;
    setIsLoadingPrices(true);
    setApiError(null);
    setGeocodingErrorField(null);
    
    // Update global loading state
    setBookingState(prev => ({
      ...prev,
      isPricingLoading: true,
      pricingResponse: null,
      pricingError: null
    }));
    
    // Fetch updated prices
    const pricingResponse = await fetchPrices();
    
    // Update global loading state
    setBookingState(prev => ({
      ...prev,
      isPricingLoading: false
    }));
    
    // If component unmounted during the fetch, don't continue
    if (!isMountedRef.current) {
      console.log('Component unmounted during price fetch, aborting navigation');
      return;
    }
    
    // If price fetching failed, stop here
    if (!pricingResponse) {
      setIsLoadingPrices(false);
      return;
    }
    
    // Store URL-friendly versions of pickup and dropoff (lowercase for URL)
    const encodedPickup = encodeURIComponent(formData.pickup.toLowerCase().replace(/\s+/g, '-'));
    const encodedDropoff = encodeURIComponent(formData.dropoff.toLowerCase().replace(/\s+/g, '-'));
    
    // Important: Type is '1' for One Way, '2' for Round Trip 
    const type = isReturn ? '2' : '1';
    
    // Use pickupDateTime from form data
    const pickupDateObj = isReturn ? formData.dateRange?.from : formData.pickupDateTime;
    const formattedDepartureDate = pickupDateObj ? formatDateForUrl(pickupDateObj) : '';
    
    // Always include returnDate parameter (use '0' for one-way trips)
    const returnDateParam = isReturn && formData.dateRange?.to
      ? formatDateForUrl(formData.dateRange.to)
      : '0';
    
    const path = `/transfer/${encodedPickup}/${encodedDropoff}/${type}/${formattedDepartureDate}/${returnDateParam}/${passengers}/form`;
    
    // Track search form submission
    trackEvent('Search Form', 'Form Submit', `${formData.pickup} to ${formData.dropoff}`, passengers);
    
    // Update original values to match the new route
    originalValuesRef.current = {
      isReturn,
      pickup: formData.pickup,
      dropoff: formData.dropoff,
      pickupDisplay: formData.pickupDisplay,
      dropoffDisplay: formData.dropoffDisplay,
      pickupDateTime: pickupDateObj,
      dropoffDateTime: isReturn && formData.dateRange?.to ? formData.dateRange.to : undefined,
      dateRange: formData.dateRange,
      passengers
    };
    
    // Store all information in context, including full dates with times and display names
    setBookingState(prev => ({
      ...prev,
      from: formData.pickup, 
      to: formData.dropoff,
      fromDisplay: formData.pickupDisplay,
      toDisplay: formData.dropoffDisplay,
      pickupDateTime: pickupDateObj,
      dropoffDateTime: isReturn && formData.dateRange?.to ? formData.dateRange.to : undefined,
      isReturn,
      // Store coordinates in context too
      fromCoords: pickupCoords,
      toCoords: dropoffCoords,
      // Still keep these URL-format dates for backward compatibility
      departureDate: formattedDepartureDate,
      returnDate: returnDateParam !== '0' ? returnDateParam : undefined,
      passengers,
      // Store the pricing data
      pricingResponse,
      // Clear any pricing error
      pricingError: null
    }));
    
    // Set navigating flag before navigation to prevent error toast
    navigatingIntentionallyRef.current = true;
    successfulSearchRef.current = true;
    
    // Navigate to booking flow
    navigate(path);
    
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };
  
  // Function to handle location coordinates selection
  const handlePlaceSelect = (field: 'pickup' | 'dropoff', displayName: string, placeData?: google.maps.places.PlaceResult) => {
    userInteractedRef.current = true;
    console.log(`Place selected for ${field}:`, displayName);
    
    if (field === 'pickup') {
      console.log('Setting pickup value from place selection:', displayName);
      setFormData(prev => ({
        ...prev,
        pickup: displayName,
        pickupDisplay: displayName
      }));
      
      // Store place_id if available
      if (placeData?.place_id) {
        console.log('Storing pickup place_id:', placeData.place_id);
        setPickupPlaceId(placeData.place_id);
      }
    } else {
      console.log('Setting dropoff value from place selection:', displayName);
      setFormData(prev => ({
        ...prev,
        dropoff: displayName,
        dropoffDisplay: displayName
      }));
      
      // Store place_id if available
      if (placeData?.place_id) {
        console.log('Storing dropoff place_id:', placeData.place_id);
        setDropoffPlaceId(placeData.place_id);
      }
    }
    
    // Get coordinates if placeData is provided
    if (placeData && placeData.geometry && placeData.geometry.location) {
      const location = {
        lat: placeData.geometry.location.lat(),
        lng: placeData.geometry.location.lng()
      };
      
      if (field === 'pickup') {
        setPickupCoords(location);
        console.log('Pickup coordinates from place selection:', location);
      } else {
        setDropoffCoords(location);
        console.log('Dropoff coordinates from place selection:', location);
      }
    } else if (placeData?.place_id) {
      // If we have place_id but no geometry, fetch the coordinates
      geocodeAddress(displayName, field, placeData.place_id)
        .then(coords => {
          if (coords) {
            if (field === 'pickup') {
              setPickupCoords(coords);
            } else {
              setDropoffCoords(coords);
            }
          }
        })
        .catch(error => {
          console.error(`Error geocoding ${field} place:`, error);
          toast({
            title: "Geocoding Error",
            description: `Unable to find coordinates for this ${field} location. Please try a different address.`,
            variant: "destructive"
          });
        });
    }
  };
  
  // Function to handle pickup validation
  const handlePickupValidation = (isValid: boolean) => {
    setPickupIsValid(isValid);
  };

  // Function to handle dropoff validation
  const handleDropoffValidation = (isValid: boolean) => {
    setDropoffIsValid(isValid);
  };
  
  // Function to cancel loading
  const handleCancelLoading = () => {
    if (activeRequestRef.current) {
      requestTracker.abortRequest(activeRequestRef.current, 'Canceled by user');
      activeRequestRef.current = null;
    }
    
    setIsLoadingPrices(false);
    setGeocodingErrorField(null);
    
    // Update global loading state
    setBookingState(prev => ({
      ...prev,
      isPricingLoading: false
    }));
  };
  
  // Function to try a different route (for geocoding errors)
  const handleTryDifferentRoute = () => {
    setGeocodingErrorField(null);
    setIsLoadingPrices(false);
    
    // Update global loading state
    setBookingState(prev => ({
      ...prev,
      isPricingLoading: false
    }));
    
    // Focus the appropriate field
    setTimeout(() => {
      const pickupInput = document.getElementById('pickup-field');
      const dropoffInput = document.getElementById('dropoff-field');
      
      if (geocodingErrorField === 'pickup' && pickupInput) {
        (pickupInput as HTMLInputElement).focus();
      } else if (geocodingErrorField === 'dropoff' && dropoffInput) {
        (dropoffInput as HTMLInputElement).focus();
      }
    }, 100);
  };

  return (
    <div className="relative bg-white p-6 md:p-8 rounded-lg shadow-lg w-full">
      {/* Loading Overlay */}
      {isLoadingPrices && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-6">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <LoadingAnimation 
              onCancel={handleCancelLoading}
              onTryDifferentRoute={handleTryDifferentRoute}
              geocodingErrorField={geocodingErrorField}
              isSlowConnection={requestTracker.isSlowConnection()}
            />
          </div>
        </div>
      )}

      {/* API Error Display */}
      {apiError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <p className="font-medium text-red-800">API Error</p>
              <p className="text-red-700 text-sm mt-1">{apiError}</p>
              <p className="text-xs text-gray-600 mt-2">
                If this issue persists, please try again later or contact support.
              </p>
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
          >
            {t('searchform.oneway')}
          </button>
          <button
            className={`flex-1 py-2 text-center rounded-lg transition-colors ${
              isReturn ? 'bg-blue-600 text-white' : 'text-gray-700'
            }`}
            onClick={() => handleTripTypeChange(false)}
          >
            {t('searchform.roundtrip')}
          </button>
        </div>

        <div className="space-y-6">
          {/* Pickup Location */}
          <GooglePlacesAutocomplete
            id="pickup-field"
            value={formData.pickup}
            onChange={(value) => {
              userInteractedRef.current = true;
              console.log('Pickup value changed to:', value);
              setFormData(prev => ({ 
                ...prev, 
                pickup: value,
                pickupDisplay: value
              }));
              // Clear coordinates when changing pickup manually
              setPickupCoords(null);
              setGeocodingErrorField(null);
            }}
            onPlaceSelect={(displayName, placeData) => handlePlaceSelect('pickup', displayName, placeData)}
            placeholder={t('searchform.pickup')}
            className="w-full"
            required={true}
            onValidation={handlePickupValidation}
          />

          {/* Dropoff Location */}
          <GooglePlacesAutocomplete
            id="dropoff-field"
            value={formData.dropoff}
            onChange={(value) => {
              userInteractedRef.current = true;
              console.log('Dropoff value changed to:', value);
              setFormData(prev => ({ 
                ...prev, 
                dropoff: value,
                dropoffDisplay: value
              }));
              // Clear coordinates when changing dropoff manually
              setDropoffCoords(null);
              setGeocodingErrorField(null);
            }}
            onPlaceSelect={(displayName, placeData) => handlePlaceSelect('dropoff', displayName, placeData)}
            placeholder={t('searchform.dropoff')}
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
                
                if (dateRange?.from && dateRange?.to) {
                  // Ensure pickup date is at least 4 hours from now
                  const minDate = getMinimumBookingTime();
                  let pickupDate = dateRange.from;
                  
                  if (pickupDate.getTime() < minDate.getTime()) {
                    pickupDate = minDate;
                  }
                  
                  // Ensure return date is after pickup date
                  let dropoffDate = dateRange.to;
                  const minReturnTime = new Date(pickupDate.getTime() + 6 * 60 * 60 * 1000);
                  
                  if (dropoffDate.getTime() < minReturnTime.getTime()) {
                    dropoffDate = minReturnTime;
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    pickupDateTime: pickupDate,
                    dropoffDateTime: dropoffDate,
                    dateRange: {
                      from: pickupDate,
                      to: dropoffDate
                    }
                  }));
                  
                  // Track selection
                  trackEvent('Search Form', 'Select Date Range', 
                    `${pickupDate.toISOString()} to ${dropoffDate.toISOString()}`);
                }
              }}
              placeholder={t('searchform.dates')}
              minDate={getMinimumBookingTime()}
            />
          ) : (
            <DatePicker
              date={formData.pickupDateTime}
              onDateChange={(date) => {
                userInteractedRef.current = true;
                
                if (!date) return;
                
                // Ensure time is at least 4 hours in the future
                const minDate = getMinimumBookingTime();
                let pickupDate = date;
                
                if (pickupDate.getTime() < minDate.getTime()) {
                  pickupDate = minDate;
                }
                
                setFormData(prev => ({
                  ...prev,
                  pickupDateTime: pickupDate,
                  dropoffDateTime: undefined,
                  dateRange: undefined
                }));
                
                if (date) {
                  trackEvent('Search Form', 'Select Date', date.toISOString());
                }
              }}
              placeholder={t('searchform.date')}
              minDate={getMinimumBookingTime()}
            />
          )}

          {/* Passengers */}
          <div className="relative flex items-center">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <div className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md flex justify-between items-center">
              <span className="text-gray-700">{passengers} {passengers === 1 ? t('searchform.passenger') : t('searchform.passengers')}</span>
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
            pickupIsValid && dropoffIsValid && (formData.pickupDateTime || (formData.dateRange?.from && formData.dateRange?.to))
              ? 'bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`} 
          onClick={handleSubmit}
          disabled={isLoadingPrices || !pickupIsValid || !dropoffIsValid || !(formData.pickupDateTime || (formData.dateRange?.from && formData.dateRange?.to))}
        >
          {isLoadingPrices ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span>{t('common.loading')}</span>
            </>
          ) : (
            <>
              <span>{t('searchform.cta')}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SearchForm;
