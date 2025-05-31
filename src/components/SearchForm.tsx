import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, ArrowRight, Plus, Minus, AlertCircle } from 'lucide-react';
import { throttle } from 'lodash-es';
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
    // Removed the reference to setHasChanges
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
  }, [bookingState.fromDisplay, bookingState.toDisplay, bookingState.isReturn, bookingState.passengers, bookingState.departureDate, bookingState.returnDate, bookingState.from, bookingState.to]);

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
      }, 500); // Small delay to allow the "All set!" message to be visible
      
      return () => clearTimeout(timer);
    }
  }, [shouldNavigate, navigationData, navigate]);

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

  // Function to geocode addresses using Google Maps Geocoding API
  const geocodeAddress = (address: string, field: 'pickup' | 'dropoff') => {
    if (!address || !window.google?.maps?.Geocoder) return;
    
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        
        if (field === 'pickup') {
          setPickupCoords(location);
          console.log('Geocoded pickup coordinates:', location);
        } else {
          setDropoffCoords(location);
          console.log('Geocoded dropoff coordinates:', location);
        }
      } else {
        console.error('Geocoding failed:', status);
        if (field === 'pickup') {
          setPickupCoords(null);
        } else {
          setDropoffCoords(null);
        }
      }
    });
  };

  // Function to fetch prices from the API
  const fetchPrices = async (): Promise<PricingResponse | null> => {
    if (!pickupCoords || !dropoffCoords) {
      // Try to geocode addresses again if coordinates are missing
      if (formData.pickup) geocodeAddress(formData.pickup, 'pickup');
      if (formData.dropoff) geocodeAddress(formData.dropoff, 'dropoff');
      
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
      pickup_lat: pickupCoords.lat,
      pickup_lng: pickupCoords.lng,
      dropoff_lat: dropoffCoords.lat,
      dropoff_lng: dropoffCoords.lng,
      pickup_time: pickupTimeISO,
      trip_type: isReturn ? "2" : "1" // Add trip_type parameter
    };
    
    console.log('Sending price request with payload:', payload);
    setApiError(null);
    
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
      
      const response = await fetchWithCors(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
        
        throw new Error(`API Error: ${errorDetail}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Response is not JSON:', contentType);
        const text = await response.text();
        console.log('Response Text:', text);
        
        throw new Error(`Expected JSON response but got: ${contentType}`);
      }
      const data: PricingResponse = await response.json();
      console.log('Pricing data received:', data);
      
      // Track successful price fetch
      trackEvent('Search Form', 'Price Fetched', `${formData.pickup} to ${formData.dropoff}`);
      
      return data;
      
    } catch (error) {
      console.error('Error fetching prices:', error);
      
      // Create detailed error message
      let errorMessage = 'Failed to get pricing information. ';
      
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again later.';
      }
      
      setApiError(errorMessage);
      
      toast({
        title: "Pricing Error",
        description: errorMessage,
        variant: "destructive"
      });

      // Track error
      trackEvent('Search Form', 'Price Fetch Error', error.message, 0, true);
      
      return null;
    }
  };

  const handlePlaceSelect = (field: 'pickup' | 'dropoff', displayName: string, placeData?: google.maps.places.PlaceResult) => {
    // Store both the display name and URL-friendly version
    setFormData(prev => ({
      ...prev,
      [field]: displayName,
      [`${field}Display`]: displayName
    }));
    
    console.log(`Selected ${field}:`, displayName);
    
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
      geocodeAddress(displayName, field);
    }
  };

  const handlePickupValidation = (isValid: boolean) => {
    setPickupIsValid(isValid);
  };

  const handleDropoffValidation = (isValid: boolean) => {
    setDropoffIsValid(isValid);
  };

  const handleSubmit = async () => {
    const pickup = formData.pickup;
    const dropoff = formData.dropoff;
    
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
    
    // Show the loading modal
    setShowModal(true);
    // Set isLoadingPrices to true to start the loading animation
    setIsLoadingPrices(true); 

    const pricingResponse = await fetchPrices();
    
    // If the pricing fetch failed, stop here - the modal will still be visible showing the error
    if (!pricingResponse) {
      setIsLoadingPrices(false);
      setShowModal(false);
      return;
    }
    
    // Store URL-friendly versions of pickup and dropoff
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
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full">
      {/* Loading Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <LoadingAnimation loadingComplete={!isLoadingPrices} />
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
            One Way
          </button>
          <button
            className={`flex-1 py-2 text-center rounded-lg transition-colors ${
              isReturn ? 'bg-blue-600 text-white' : 'text-gray-700'
            }`}
            onClick={() => handleTripTypeChange(false)}
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
        >
          <span>See Prices</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default SearchForm;