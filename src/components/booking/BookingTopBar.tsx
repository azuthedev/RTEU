import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from '../ui/date-picker';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { GooglePlacesAutocomplete } from '../ui/GooglePlacesAutocomplete';
import { useBooking } from '../../contexts/BookingContext';
import { initGoogleMaps } from '../../utils/optimizeThirdParty';
import { useToast } from '../ui/use-toast';
import { fetchWithCors, getApiUrl } from '../../utils/corsHelper';
import { formatDateForUrl, parseDateFromUrl, geocodeAddress } from '../../utils/searchFormHelpers';

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

interface BookingTopBarProps {
  from: string;
  to: string;
  type: string;
  date: string;
  returnDate?: string;
  passengers: string;
  currentStep?: number;
}

const BookingTopBar: React.FC<BookingTopBarProps> = ({ 
  from, 
  to, 
  type, 
  date, 
  returnDate, 
  passengers, 
  currentStep = 1 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingState, setBookingState } = useBooking();
  const { toast } = useToast();
  
  // Flag to track component initialization
  const isInitializedRef = useRef(false);
  // Flag to track user interaction
  const userInteractedRef = useRef(false);
  // Parse dates from URL strings
  const departureDate = parseDateFromUrl(date);
  const returnDateParsed = returnDate && returnDate !== '0' ? parseDateFromUrl(returnDate) : undefined;
  // Determine if it's a one-way trip based on both type and returnDate
  const isOneWayFromProps = type === '1' || !returnDate || returnDate === '0';
  const [isOneWay, setIsOneWay] = useState(isOneWayFromProps);
  const [displayPassengers, setDisplayPassengers] = useState(parseInt(passengers, 10));
  const [hasChanges, setHasChanges] = useState(false);
  
  // Input field states
  const [pickupValue, setPickupValue] = useState('');
  const [dropoffValue, setDropoffValue] = useState('');
  
  // State for geocoded coordinates and place IDs
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(null);
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(null);
  const [dropoffPlaceId, setDropoffPlaceId] = useState<string | null>(null);
  
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Track validation state for addresses
  const [pickupIsValid, setPickupIsValid] = useState(true); // Default to true for initial values
  const [dropoffIsValid, setDropoffIsValid] = useState(true); // Default to true for initial values
  
  // Store original URL values for comparison
  const originalValuesRef = useRef({
    from,
    to,
    type,
    date,
    returnDate: returnDate || '0',
    passengers: parseInt(passengers, 10),
    isOneWay: isOneWayFromProps,
    departureDate,
    dateRange: isOneWayFromProps 
      ? undefined 
      : {
          from: departureDate,
          to: returnDateParsed
        } as DateRange | undefined
  });
  
  // Form data state
  const [formData, setFormData] = useState({
    from,
    to,
    type: isOneWayFromProps ? '1' : '2',
    departureDate: isOneWayFromProps ? departureDate : undefined,
    dateRange: isOneWayFromProps 
      ? undefined 
      : {
          from: departureDate,
          to: returnDateParsed
        } as DateRange | undefined,
    passengers: parseInt(passengers, 10)
  });

  // Ensure Google Maps is loaded
  useEffect(() => {
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          console.log('BookingTopBar: Google Maps API loaded:', success);
        });
    }
  }, []);

  // Initialize component once with values from props and context
  useEffect(() => {
    // Only run this effect once during initialization
    if (isInitializedRef.current) {
      return;
    }
    
    // Force hasChanges to false initially
    setHasChanges(false);
    
    // Use the display names from context if available, otherwise use URL params
    const initialPickupValue = bookingState.fromDisplay || from;
    const initialDropoffValue = bookingState.toDisplay || to;
    
    // Set initial values only once
    setPickupValue(initialPickupValue);
    setDropoffValue(initialDropoffValue);
    
    console.log("BookingTopBar initialized with:", {
      type,
      isOneWay: isOneWayFromProps,
      from: initialPickupValue,
      to: initialDropoffValue,
      date,
      returnDate
    });
    
    // Mark as initialized to prevent this effect from running again
    isInitializedRef.current = true;
  }, [from, to, type, date, returnDate, passengers, isOneWayFromProps, bookingState.fromDisplay, bookingState.toDisplay]);

  // Setup effect for user interaction tracking
  useEffect(() => {
    const handleUserInteraction = () => {
      if (isInitializedRef.current && !userInteractedRef.current) {
        console.log("User interaction detected");
        userInteractedRef.current = true;
      }
    };
    // These are the inputs that indicate user interaction
    const formInputs = document.querySelectorAll('input, button');
    formInputs.forEach(input => {
      input.addEventListener('click', handleUserInteraction);
      input.addEventListener('focus', handleUserInteraction);
      input.addEventListener('input', handleUserInteraction);
    });
    return () => {
      formInputs.forEach(input => {
        input.removeEventListener('click', handleUserInteraction);
        input.removeEventListener('focus', handleUserInteraction);
        input.removeEventListener('input', handleUserInteraction);
      });
    };
  }, []);

  // Change detection effect
  useEffect(() => {
    // Skip change detection on initial render
    if (!isInitializedRef.current) {
      return;
    }
    // Only detect changes after user has interacted with the form
    // This prevents auto-detection from kicking in too early
    if (!userInteractedRef.current) {
      return;
    }
    const formType = isOneWay ? '1' : '2';
    const formDepartureDateStr = formData.departureDate ? formatDateForUrl(formData.departureDate) : '';
    const formReturnDateStr = formData.dateRange?.to ? formatDateForUrl(formData.dateRange.to) : '0';
    
    const original = originalValuesRef.current;
    
    // Compare current values with original values
    const hasFormChanges = 
      pickupValue !== original.from ||
      dropoffValue !== original.to ||
      formData.passengers !== original.passengers ||
      formType !== original.type ||
      (isOneWay && formDepartureDateStr && formDepartureDateStr !== original.date) ||
      (!isOneWay && formData.dateRange?.from && formData.dateRange?.to && 
        (formatDateForUrl(formData.dateRange.from) !== original.date || 
         formReturnDateStr !== original.returnDate));
    
    console.log('Change detection:', {
      hasChanges: hasFormChanges,
      userInteracted: userInteractedRef.current,
      originalType: original.type,
      currentType: formType
    });
    
    setHasChanges(hasFormChanges);
  }, [formData, isOneWay, pickupValue, dropoffValue]);

  // Function to fetch prices from the API
  const fetchPrices = async (): Promise<PricingResponse | null> => {
    // Use stored place_ids when available for more reliable geocoding
    let pickup = pickupCoords;
    let dropoff = dropoffCoords;
    
    if (!pickup) {
      pickup = await geocodeAddress(pickupValue, 'pickup', pickupPlaceId);
    }
    
    if (!dropoff) {
      dropoff = await geocodeAddress(dropoffValue, 'dropoff', dropoffPlaceId);
    }
    
    if (!pickup || !dropoff) {
      toast({
        title: "Location Error",
        description: !pickup 
          ? "Unable to find coordinates for pickup location. Please try a more specific address." 
          : "Unable to find coordinates for dropoff location. Please try a more specific address.",
        variant: "destructive"
      });
      return null;
    }
    
    const pickupTime = isOneWay 
      ? formData.departureDate 
      : formData.dateRange?.from;
      
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
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      pickup_time: pickupTimeISO,
      trip_type: isOneWay ? "1" : "2" // Add trip_type parameter
    };
    
    console.log('Sending price request with payload:', payload);
    setIsLoadingPrices(true);
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
      
      return null;
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Handle place selection from autocomplete
  const handlePlaceSelect = (field: 'pickup' | 'dropoff', displayName: string, placeData?: google.maps.places.PlaceResult) => {
    userInteractedRef.current = true;
    console.log(`Place selected for ${field}:`, displayName);
    
    if (field === 'pickup') {
      console.log('Setting pickup value from place selection:', displayName);
      setPickupValue(displayName);
      
      // Store place_id if available
      if (placeData?.place_id) {
        console.log('Storing pickup place_id:', placeData.place_id);
        setPickupPlaceId(placeData.place_id);
      }
    } else {
      console.log('Setting dropoff value from place selection:', displayName);
      setDropoffValue(displayName);
      
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

  const handlePassengerChange = (increment: boolean) => {
    userInteractedRef.current = true;
    const newPassengers = increment ? formData.passengers + 1 : formData.passengers - 1;
    if (newPassengers >= 1 && newPassengers <= 100) {
      setFormData(prev => ({ ...prev, passengers: newPassengers }));
      setDisplayPassengers(newPassengers);
    }
  };

  const handleTripTypeChange = (oneWay: boolean) => {
    userInteractedRef.current = true;
    const newIsOneWay = oneWay;
    // If toggling back to original state without saving, restore original values
    if (newIsOneWay === originalValuesRef.current.isOneWay && !hasChanges) {
      setIsOneWay(newIsOneWay);
      setFormData(prev => ({
        ...prev,
        type: newIsOneWay ? '1' : '2',
        departureDate: originalValuesRef.current.departureDate,
        dateRange: originalValuesRef.current.dateRange
      }));
      return;
    }
    
    setIsOneWay(oneWay);
    
    if (oneWay) {
      setFormData(prev => {
        return {
          ...prev,
          type: '1',
          departureDate: prev.dateRange?.from || prev.departureDate,
          dateRange: undefined
        };
      });
    } else {
      setFormData(prev => {
        return {
          ...prev,
          type: '2',
          departureDate: undefined,
          dateRange: {
            from: prev.departureDate || prev.dateRange?.from,
            to: prev.dateRange?.to || undefined
          }
        };
      });
    }
  };

  const handleUpdateRoute = async () => {
    if (!hasChanges) return;
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
    // Get values from current state - use actual display values for the URL
    const encodedFrom = encodeURIComponent(pickupValue.toLowerCase().replace(/\s+/g, '-'));
    const encodedTo = encodeURIComponent(dropoffValue.toLowerCase().replace(/\s+/g, '-'));
    
    let formattedDepartureDate;
    let formattedReturnDate = '0';
    if (!isOneWay && formData.dateRange) {
      if (!formData.dateRange.from || !formData.dateRange.to) {
        toast({
          title: "Date Error",
          description: "Please select both departure and return dates for round trips.",
          variant: "destructive"
        });
        return;
      }
      formattedDepartureDate = formatDateForUrl(formData.dateRange.from);
      formattedReturnDate = formatDateForUrl(formData.dateRange.to);
    } else if (isOneWay && formData.departureDate) {
      formattedDepartureDate = formatDateForUrl(formData.departureDate);
    } else {
      toast({
        title: "Date Error",
        description: "Please select a date for your trip.",
        variant: "destructive"
      });
      return;
    }
    
    // Set loading state
    setIsLoadingPrices(true);
    setApiError(null);
    
    // Fetch updated prices
    const pricingResponse = await fetchPrices();
    
    // If price fetching failed, stop here
    if (!pricingResponse) {
      setIsLoadingPrices(false);
      return;
    }
    
    const baseRoute = location.pathname.startsWith('/home') ? '/home/transfer' : '/transfer';
    const newType = isOneWay ? '1' : '2';
    
    const path = `${baseRoute}/${encodedFrom}/${encodedTo}/${newType}/${formattedDepartureDate}/${formattedReturnDate}/${formData.passengers}/form`;
    // Update original values to match the new route
    originalValuesRef.current = {
      from: pickupValue,
      to: dropoffValue,
      type: newType,
      date: formattedDepartureDate,
      returnDate: formattedReturnDate,
      passengers: formData.passengers,
      isOneWay: isOneWay,
      departureDate: isOneWay ? formData.departureDate : undefined,
      dateRange: !isOneWay ? formData.dateRange : undefined
    };
    // Also update booking context with display names
    setBookingState(prev => ({
      ...prev,
      from: pickupValue,
      to: dropoffValue,
      fromDisplay: pickupValue, // Preserve case for display
      toDisplay: dropoffValue,  // Preserve case for display
      isReturn: !isOneWay,
      departureDate: formattedDepartureDate,
      returnDate: formattedReturnDate !== '0' ? formattedReturnDate : undefined,
      passengers: formData.passengers,
      pricingResponse: pricingResponse // Store the pricing data
    }));
    // Reset change detection before navigation
    setHasChanges(false);
    userInteractedRef.current = false;
    setIsLoadingPrices(false);
    
    navigate(path);
  };

  const handlePickupValidation = (isValid: boolean) => {
    setPickupIsValid(isValid);
  };

  const handleDropoffValidation = (isValid: boolean) => {
    setDropoffIsValid(isValid);
  };

  return (
    <div className="relative">
      {/* Loading overlay */}
      {isLoadingPrices && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50 rounded-xl">
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-blue-800">Fetching prices...</p>
          </div>
        </div>
      )}
      
      {/* API Error Display */}
      {apiError && (
        <div className="absolute top-0 left-0 right-0 m-4 p-4 bg-red-50 border border-red-200 rounded-md z-40 shadow-md">
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
      
      <div className="absolute -top-10 left-6">
        <div className="relative h-10 bg-white rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="flex h-full">
            <button
              className={`w-32 relative z-10 transition-colors ${
                isOneWay ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(true)}
            >
              One Way
            </button>
            <button
              className={`w-32 relative z-10 transition-colors ${
                !isOneWay ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(false)}
            >
              Round Trip
            </button>
            <div 
              className={`absolute inset-y-0 w-32 bg-blue-600 transition-transform duration-300 ${
                isOneWay ? 'left-0' : 'left-32'
              }`}
            />
          </div>
        </div>
      </div>
      <div className="py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile View */}
          <div className="flex flex-col space-y-4 md:hidden">
            {/* Mobile Pickup Location */}
            <GooglePlacesAutocomplete
              value={pickupValue}
              onChange={(value) => {
                userInteractedRef.current = true;
                console.log('Pickup value changed to:', value);
                setPickupValue(value);
                // Clear coordinates when manually editing
                setPickupCoords(null);
              }}
              onPlaceSelect={(displayName, placeData) => handlePlaceSelect('pickup', displayName, placeData)}
              placeholder="From"
              className="w-full"
              required={true}
              onValidation={handlePickupValidation}
              id="pickup-field-mobile"
            />
            {/* Mobile Dropoff Location */}
            <GooglePlacesAutocomplete
              value={dropoffValue}
              onChange={(value) => {
                userInteractedRef.current = true;
                console.log('Dropoff value changed to:', value);
                setDropoffValue(value);
                // Clear coordinates when manually editing
                setDropoffCoords(null);
              }}
              onPlaceSelect={(displayName, placeData) => handlePlaceSelect('dropoff', displayName, placeData)}
              placeholder="To"
              className="w-full"
              required={true}
              onValidation={handleDropoffValidation}
              id="dropoff-field-mobile"
            />
            {isOneWay ? (
              <DatePicker
                date={formData.departureDate}
                onDateChange={(date) => {
                  userInteractedRef.current = true;
                  setFormData(prev => ({
                    ...prev,
                    departureDate: date,
                    dateRange: undefined
                  }));
                }}
                placeholder="Select date"
              />
            ) : (
              <DateRangePicker
                dateRange={formData.dateRange}
                onDateRangeChange={(dateRange) => {
                  userInteractedRef.current = true;
                  setFormData(prev => ({
                    ...prev,
                    dateRange,
                    departureDate: undefined
                  }));
                }}
                placeholder="Select dates"
                className="w-full"
              />
            )}
            <div className="relative">
              <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg bg-white flex justify-between items-center">
                <span className="text-gray-700 text-[12px]">
                  {displayPassengers} {' '}
                  Passenger{displayPassengers !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePassengerChange(false)}
                    className={`p-1 rounded-full transition-colors ${
                      formData.passengers > 1 ? 'text-black hover:bg-gray-50 active:bg-gray-100' : 'text-gray-300'
                    }`}
                    disabled={formData.passengers <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePassengerChange(true)}
                    className={`p-1 rounded-full transition-colors ${
                      formData.passengers < 100 ? 'text-black hover:bg-gray-50 active:bg-gray-100' : 'text-gray-300'
                    }`}
                    disabled={formData.passengers >= 100}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: hasChanges && pickupIsValid && dropoffIsValid ? 0.95 : 1 }}
              onClick={handleUpdateRoute}
              className={`w-full py-2 rounded-lg transition-all duration-300 ${
                hasChanges && pickupIsValid && dropoffIsValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges || isLoadingPrices || !pickupIsValid || !dropoffIsValid}
            >
              {isLoadingPrices ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </div>
              ) : (
                'Update Route'
              )}
            </motion.button>
          </div>
          {/* Desktop View */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex-1 grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-4">
              {/* Desktop Pickup Location */}
              <GooglePlacesAutocomplete
                value={pickupValue}
                onChange={(value) => {
                  userInteractedRef.current = true;
                  console.log('Pickup value changed to:', value);
                  setPickupValue(value);
                  // Clear coordinates when manually editing
                  setPickupCoords(null);
                }}
                onPlaceSelect={(displayName, placeData) => handlePlaceSelect('pickup', displayName, placeData)}
                placeholder="From"
                className="w-full"
                required={true}
                onValidation={handlePickupValidation}
                id="pickup-field-desktop"
              />
              {/* Desktop Dropoff Location */}
              <GooglePlacesAutocomplete
                value={dropoffValue}
                onChange={(value) => {
                  userInteractedRef.current = true;
                  console.log('Dropoff value changed to:', value);
                  setDropoffValue(value);
                  // Clear coordinates when manually editing
                  setDropoffCoords(null);
                }}
                onPlaceSelect={(displayName, placeData) => handlePlaceSelect('dropoff', displayName, placeData)}
                placeholder="To"
                className="w-full"
                required={true}
                onValidation={handleDropoffValidation}
                id="dropoff-field-desktop"
              />
              {isOneWay ? (
                <DatePicker
                  date={formData.departureDate}
                  onDateChange={(date) => {
                    userInteractedRef.current = true;
                    setFormData(prev => ({
                      ...prev,
                      departureDate: date,
                      dateRange: undefined
                    }));
                  }}
                  placeholder="Select date"
                />
              ) : (
                <DateRangePicker
                  dateRange={formData.dateRange}
                  onDateRangeChange={(dateRange) => {
                    userInteractedRef.current = true;
                    setFormData(prev => ({
                      ...prev,
                      dateRange,
                      departureDate: undefined
                    }));
                  }}
                  placeholder="Select dates"
                  className="col-span-1"
                />
              )}
              <div className="relative">
                <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg bg-white flex justify-between items-center">
                  <span className="text-gray-700 text-[12px]">
                    {displayPassengers} {' '}
                    Passenger{displayPassengers !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePassengerChange(false)}
                      className={`p-1 rounded-full transition-colors ${
                        formData.passengers > 1 ? 'text-black hover:bg-gray-50 active:bg-gray-100' : 'text-gray-300'
                      }`}
                      disabled={formData.passengers <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePassengerChange(true)}
                      className={`p-1 rounded-full transition-colors ${
                        formData.passengers < 100 ? 'text-black hover:bg-gray-50 active:bg-gray-100' : 'text-gray-300'
                      }`}
                      disabled={formData.passengers >= 100}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: hasChanges && pickupIsValid && dropoffIsValid ? 0.95 : 1 }}
              onClick={handleUpdateRoute}
              className={`px-6 py-2 rounded-lg transition-all duration-300 min-w-[120px] ${
                hasChanges && pickupIsValid && dropoffIsValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges || isLoadingPrices || !pickupIsValid || !dropoffIsValid}
            >
              {isLoadingPrices ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating
                </div>
              ) : (
                'Update Route'
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTopBar;