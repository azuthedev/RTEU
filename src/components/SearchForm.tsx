import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Users, ArrowRight, Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
import { throttle } from 'lodash-es';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from './ui/date-picker';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useAnalytics } from '../hooks/useAnalytics';
import { GooglePlacesAutocomplete } from './ui/GooglePlacesAutocomplete';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../components/ui/use-toast';
import { fetchWithCors, getApiUrl } from '../utils/corsHelper';
import LoadingAnimation from './LoadingAnimation';
import { withRetry } from '../utils/retryHelper';
import { sanitizeInput } from '../utils/dataValidator';
import { errorTracker, ErrorContext, ErrorSeverity } from '../utils/errorTracker';
import { requestTracker } from '../utils/requestTracker';
import { geocodeAddress, formatDateForUrl, parseDateFromUrl, validateTransferAddress } from '../utils/searchFormHelpers';
import { useLanguage } from '../contexts/LanguageContext';

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

const SearchForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
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
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(null);
  const [dropoffPlaceId, setDropoffPlaceId] = useState<string | null>(null);
  
  // State for loading prices
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
    if (!initialStateLoadedRef.current && (bookingState.fromDisplay || bookingState.toDisplay)) {
      console.log("Initializing form from context display values", {
        fromDisplay: bookingState.fromDisplay,
        toDisplay: bookingState.toDisplay,
        from: bookingState.from,
        to: bookingState.to
      });
      
      setFormData(prev => ({
        ...prev,
        pickup: bookingState.fromDisplay || bookingState.from || '',
        dropoff: bookingState.toDisplay || bookingState.to || '',
        pickupDisplay: bookingState.fromDisplay || bookingState.from || '',
        dropoffDisplay: bookingState.toDisplay || bookingState.to || ''
      }));
      
      if (bookingState.isReturn !== undefined) {
        setIsReturn(bookingState.isReturn);
      }
      
      if (bookingState.passengers) {
        setPassengers(bookingState.passengers);
      }
      
      if (bookingState.departureDate) {
        const departureDate = parseDateFromUrl(bookingState.departureDate);
        const returnDate = bookingState.returnDate ? parseDateFromUrl(bookingState.returnDate) : undefined;
        
        if (bookingState.isReturn && departureDate && returnDate) {
          setFormData(prev => ({
            ...prev,
            dateRange: { from: departureDate, to: returnDate }
          }));
        } else if (departureDate) {
          setFormData(prev => ({
            ...prev,
            departureDate
          }));
        }
      }
      
      // Store original values for comparison
      originalValuesRef.current = {
        isReturn: bookingState.isReturn || false,
        pickup: bookingState.fromDisplay || bookingState.from || '',
        dropoff: bookingState.toDisplay || bookingState.to || '',
        pickupDisplay: bookingState.fromDisplay || bookingState.from || '',
        dropoffDisplay: bookingState.toDisplay || bookingState.to || '',
        departureDate: formData.departureDate,
        dateRange: formData.dateRange,
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
      setFormData({
        ...formData,
        departureDate: originalValuesRef.current.departureDate,
        dateRange: originalValuesRef.current.dateRange
      });
      return;
    }
    
    setIsReturn(newIsReturn);
    
    if (oneWay) {
      setFormData(prev => {
        return {
          ...prev,
          departureDate: prev.dateRange?.from || prev.departureDate,
          dateRange: undefined
        };
      });
    } else {
      setFormData(prev => {
        return {
          ...prev,
          departureDate: undefined,
          dateRange: {
            from: prev.departureDate || prev.dateRange?.from,
            to: prev.dateRange?.to || undefined
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
          description: "Please enter both pickup and dropoff locations.",
          variant: "destructive"
        });
      }
      return null;
    }
    
    try {
      // Try to use existing coordinates if available
      let pickup = pickupCoords;
      let dropoff = dropoffCoords;
      
      // If we don't have coordinates, geocode the addresses
      if (!pickup) {
        try {
          pickup = await geocodeAddress(formData.pickup, 'pickup', pickupPlaceId);
        } catch (error) {
          // Handle geocoding error - specific to pickup
          if (isMountedRef.current) {
            setGeocodingErrorField('pickup');
            setIsLoadingPrices(false);
          }
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
        return null;
      }
      
      const pickupTime = isReturn 
        ? formData.dateRange?.from 
        : formData.departureDate;
        
      if (!pickupTime) {
        if (isMountedRef.current) {
          toast({
            title: "Time Error",
            description: "Please select a pickup date and time.",
            variant: "destructive"
          });
          setIsLoadingPrices(false);
        }
        return null;
      }
      
      // Format date to ISO8601
      const pickupTimeISO = pickupTime.toISOString();
      
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
      
      if (!isMountedRef.current) {
        console.log('Component unmounted, aborting price fetch');
        return null;
      }
      
      setApiError(null);
      
      // Track the request
      const requestId = requestTracker.startRequest('Fetch Pricing', 'POST');
      activeRequestRef.current = requestId;
      
      try {
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
        
        // Update request stage
        requestTracker.updateStage(requestId, 'network');
        
        // Use retryHelper for resilient fetching
        const response = await withRetry(
          async () => {
            // Check if component is still mounted
            if (!isMountedRef.current) {
              throw new Error('Component unmounted');
            }
            
            return fetchWithCors(apiEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
          },
          {
            maxRetries: 2,
            initialDelay: 1000,
            onRetry: (attempt, error, delay) => {
              console.log(`Retry attempt ${attempt} for pricing request after ${delay}ms delay due to: ${error.message}`);
              
              if (isMountedRef.current) {
                // Only show error toast if not navigating intentionally
                if (!navigatingIntentionallyRef.current && !successfulSearchRef.current) {
                  toast({
                    title: "Connection Issue",
                    description: `Retrying (${attempt}/2)...`,
                    variant: "destructive"
                  });
                }
              }
            }
          }
        );
        
        // Check if component is still mounted before continuing
        if (!isMountedRef.current) {
          console.log('Component unmounted, aborting fetchPrices after API response');
          return null;
        }
        
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
          
          requestTracker.updateStage(requestId, 'failed', {
            status: response.status,
            error: errorDetail
          });
          
          // Track API error
          errorTracker.trackError(
            new Error(`API Error: ${errorDetail}`),
            ErrorContext.PRICING,
            ErrorSeverity.HIGH,
            { response: { status: response.status, statusText: response.statusText } }
          );
          
          throw new Error(`API Error: ${errorDetail}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Response is not JSON:', contentType);
          let text = '';
          try {
            text = await response.text();
            console.log('Response Text:', text);
          } catch (e) {
            console.error('Error reading response text:', e);
          }
          
          requestTracker.updateStage(requestId, 'failed', {
            error: `Expected JSON response but got: ${contentType}`
          });
          
          throw new Error(`Expected JSON response but got: ${contentType}`);
        }
        
        // Update request to processing stage
        requestTracker.updateStage(requestId, 'processing');
        
        const data: PricingResponse = await response.json();
        console.log('Pricing data received:', data);
        
        // Mark request as complete
        requestTracker.updateStage(requestId, 'complete');
        
        // Set successful search flag to true - to indicate search completed successfully
        // even if the component is unmounted during navigation
        successfulSearchRef.current = true;
        
        // Track successful price fetch
        trackEvent('Search Form', 'Price Fetched', `${formData.pickup} to ${formData.dropoff}`);
        
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
            payload,
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
        
        // Clear any existing geocoding error
        if (geocodingErrorField === 'pickup') {
          setGeocodingErrorField(null);
        }
      } else {
        setDropoffCoords(location);
        console.log('Dropoff coordinates from place selection:', location);
        
        // Clear any existing geocoding error
        if (geocodingErrorField === 'dropoff') {
          setGeocodingErrorField(null);
        }
      }
    } else if (placeData?.place_id) {
      // If we have place_id but no geometry, fetch the coordinates
      geocodeAddress(displayName, field, placeData.place_id)
        .then(coords => {
          if (coords) {
            if (field === 'pickup') {
              setPickupCoords(coords);
              if (geocodingErrorField === 'pickup') {
                setGeocodingErrorField(null);
              }
            } else {
              setDropoffCoords(coords);
              if (geocodingErrorField === 'dropoff') {
                setGeocodingErrorField(null);
              }
            }
          }
        })
        .catch(error => {
          console.error(`Error geocoding ${field} place:`, error);
          if (isMountedRef.current) {
            // Set geocoding error field
            setGeocodingErrorField(field);
            
            toast({
              title: "Geocoding Error",
              description: `Unable to find coordinates for this ${field} location. Please try a different address.`,
              variant: "destructive"
            });
          }
        });
    }
  };

  const handleSubmit = async () => {
    const pickup = formData.pickup;
    const dropoff = formData.dropoff;
    
    // Check for basic form validity
    if (!pickup || !dropoff || (!formData.departureDate && !formData.dateRange?.from)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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
    
    // Fetch updated prices
    const pricingResponse = await fetchPrices();
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('Component unmounted after price fetch, aborting navigation');
      return;
    }
    
    // If price fetching failed, stop here
    if (!pricingResponse) {
      if (isMountedRef.current) {
        setIsLoadingPrices(false);
      }
      return;
    }
    
    // Store URL-friendly versions of pickup and dropoff (lowercase for URL)
    const encodedPickup = encodeURIComponent(formData.pickup.toLowerCase().replace(/\s+/g, '-'));
    const encodedDropoff = encodeURIComponent(formData.dropoff.toLowerCase().replace(/\s+/g, '-'));
    
    // Important: Type is '1' for One Way, '2' for Round Trip 
    const type = isReturn ? '2' : '1';
    
    const departureDate = isReturn ? formData.dateRange?.from : formData.departureDate;
    const formattedDepartureDate = departureDate ? formatDateForUrl(departureDate) : '';
    
    // Always include returnDate parameter (use '0' for one-way trips)
    const returnDateParam = isReturn && formData.dateRange?.to
      ? formatDateForUrl(formData.dateRange.to)
      : '0';
    
    const path = `/transfer/${encodedPickup}/${encodedDropoff}/${type}/${formattedDepartureDate}/${returnDateParam}/${passengers}/form`;
    
    // Track search form submission
    trackEvent('Search Form', 'Form Submit', `${formData.pickup} to ${formData.dropoff}`, passengers);
    
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
      from: formData.pickup, 
      to: formData.dropoff,
      fromDisplay: formData.pickupDisplay,
      toDisplay: formData.dropoffDisplay,
      isReturn,
      departureDate: formattedDepartureDate,
      returnDate: returnDateParam !== '0' ? returnDateParam : undefined,
      passengers,
      // Store pricing data in context
      pricingResponse: pricingResponse
    }));
    
    // Set navigating flag before navigation to prevent error toast
    navigatingIntentionallyRef.current = true;
    successfulSearchRef.current = true;
    
    // Navigate to booking flow
    navigate(path);
    
    // Scroll to top after navigation
    window.scrollTo(0, 0);
  };

  const handlePickupValidation = (isValid: boolean) => {
    setPickupIsValid(isValid);
  };

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
  };
  
  // Function to try a different route (for geocoding errors)
  const handleTryDifferentRoute = () => {
    setGeocodingErrorField(null);
    setIsLoadingPrices(false);
    
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
              placeholder={t('searchform.dates')}
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
              placeholder={t('searchform.date')}
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
            pickupIsValid && dropoffIsValid && (formData.departureDate || (formData.dateRange?.from && formData.dateRange?.to))
              ? 'bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`} 
          onClick={handleSubmit}
          disabled={isLoadingPrices || !pickupIsValid || !dropoffIsValid || !(formData.departureDate || (formData.dateRange?.from && formData.dateRange?.to))}
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