import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Users, ArrowRight, Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
import { throttle } from 'lodash-es';
import { DatePicker } from './ui/date-picker';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useAnalytics } from '../hooks/useAnalytics';
import { GooglePlacesAutocomplete } from './ui/GooglePlacesAutocomplete';
import { useBooking } from '../contexts/BookingContext';
import { useToast } from '../components/ui/use-toast';
import LoadingAnimation from './LoadingAnimation';
import { errorTracker, ErrorContext, ErrorSeverity } from '../utils/errorTracker';
import { requestTracker } from '../utils/requestTracker';
import { 
  formatDateForUrl, 
  parseDateFromUrl, 
  validateTransferAddress,
  getMinimumBookingTime,
  isValidBookingTime 
} from '../utils/searchFormHelpers';
import { useLanguage } from '../contexts/LanguageContext';

const SearchForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { bookingState, setBookingState, fetchPricingData, clearBookingState } = useBooking();
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
  
  // State for controlling the loading modal visibility
  const [showLoadingModal, setShowLoadingModal] = useState(false);

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

  // Initialize form with existing data from context if available
  useEffect(() => {
    // Only run this effect once during initialization
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
      
      // Initialize validation state based on context data
      setPickupIsValid(!!bookingState.fromValid || !!bookingState.fromCoords);
      setDropoffIsValid(!!bookingState.toValid || !!bookingState.toCoords);
      
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
    
    // IMPORTANT: Set loading state and show modal BEFORE making the API call
    setIsLoadingPrices(true);
    setApiError(null);
    setGeocodingErrorField(null);
    setShowLoadingModal(true);
    
    // Prepare the dropoff date/time for round trips
    const dropoffDateTime = isReturn ? formData.dateRange?.to : undefined;
    
    try {
      // Use the context's fetchPricingData function and AWAIT the result
      const pricingResponse = await fetchPricingData({
        from: formData.pickup,
        to: formData.dropoff,
        fromCoords: pickupCoords,
        toCoords: dropoffCoords,
        pickupDateTime: pickupDateTime,
        dropoffDateTime: dropoffDateTime,
        isReturn,
        fromDisplay: formData.pickupDisplay,
        toDisplay: formData.dropoffDisplay,
        passengers
      });
      
      // If component unmounted during the fetch, don't continue
      if (!isMountedRef.current) {
        console.log('Component unmounted during price fetch, aborting navigation');
        return;
      }
      
      // Hide loading modal AFTER data is fetched
      setShowLoadingModal(false);
      setIsLoadingPrices(false);
      
      // If price fetching failed, stop here
      if (!pricingResponse) {
        return;
      }
      
      // Store URL-friendly versions of pickup and dropoff (lowercase for URL)
      const encodedPickup = encodeURIComponent(formData.pickup.toLowerCase().replace(/\s+/g, '-'));
      const encodedDropoff = encodeURIComponent(formData.dropoff.toLowerCase().replace(/\s+/g, '-'));
      
      // Important: Type is '1' for One Way, '2' for Round Trip 
      const urlType = isReturn ? '2' : '1';
      
      // Format dates for URL
      const formattedDepartureDate = pickupDateTime ? formatDateForUrl(pickupDateTime) : '';
      
      // Always include returnDate parameter (use '0' for one-way trips)
      const returnDateParam = isReturn && formData.dateRange?.to
        ? formatDateForUrl(formData.dateRange.to)
        : '0';
      
      // Build the URL path
      const path = `/transfer/${encodedPickup}/${encodedDropoff}/${urlType}/${formattedDepartureDate}/${returnDateParam}/${passengers}/form`;
      
      // Reset change detection before navigation
      successfulSearchRef.current = true;
      
      // Reset original values to match the new state
      originalValuesRef.current = {
        isReturn,
        pickup: formData.pickup,
        dropoff: formData.dropoff,
        pickupDisplay: formData.pickupDisplay,
        dropoffDisplay: formData.dropoffDisplay,
        pickupDateTime: isReturn ? formData.dateRange?.from : formData.pickupDateTime,
        dropoffDateTime: isReturn ? formData.dateRange?.to : undefined,
        dateRange: isReturn && formData.dateRange?.from && formData.dateRange?.to 
          ? { from: formData.dateRange.from, to: formData.dateRange.to }
          : undefined,
        passengers
      };
      
      // Track search form submission
      trackEvent('Search Form', 'Form Submit', `${formData.pickup} to ${formData.dropoff}`, passengers);
      
      // Save address validation state to booking context
      setBookingState(prev => ({
        ...prev,
        fromValid: pickupIsValid,
        toValid: dropoffIsValid
      }));
      
      // Set navigating flag before navigation to prevent error toast
      navigatingIntentionallyRef.current = true;
      
      // Navigate to booking flow
      navigate(path);
      
      // Scroll to top after navigation
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error during search submission:", error);
      setShowLoadingModal(false);
      setIsLoadingPrices(false);
      
      // Display error to user
      toast({
        title: "Search Error",
        description: "Something went wrong while processing your search. Please try again.",
        variant: "destructive"
      });
      
      // Track error event
      errorTracker.trackError(
        error instanceof Error ? error : new Error(String(error)),
        ErrorContext.PRICING,
        ErrorSeverity.HIGH,
        { 
          from: formData.pickup,
          to: formData.dropoff
        }
      );
    }
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
    setShowLoadingModal(false);
  };
  
  // Function to try a different route (for geocoding errors)
  const handleTryDifferentRoute = () => {
    setGeocodingErrorField(null);
    
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
      {/* Loading Modal Overlay */}
      {showLoadingModal && (
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
            initialIsValid={pickupIsValid}
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
            initialIsValid={dropoffIsValid}
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
                  let returnDate = dateRange.to;
                  const minReturnTime = new Date(pickupDate.getTime() + 6 * 60 * 60 * 1000);
                  
                  if (returnDate.getTime() < minReturnTime.getTime()) {
                    returnDate = minReturnTime;
                  }
                  
                  setFormData(prev => ({
                    ...prev,
                    pickupDateTime: undefined,
                    dropoffDateTime: undefined,
                    dateRange: {
                      from: pickupDate,
                      to: returnDate
                    }
                  }));
                  
                  // Track selection
                  trackEvent('Search Form', 'Select Date Range', 
                    `${pickupDate.toISOString()} to ${returnDate.toISOString()}`);
                }
              }}
              placeholder={t('searchform.dates')}
              className="w-full"
              minDate={getMinimumBookingTime()}
            />
          ) : (
            <DatePicker
              date={formData.pickupDateTime}
              onDateChange={(date) => {
                userInteractedRef.current = true;
                
                // Ensure date is valid and at least 4 hours in the future
                if (date) {
                  const minDate = getMinimumBookingTime();
                  const finalDate = date.getTime() < minDate.getTime() ? minDate : date;
                  
                  setFormData(prev => ({
                    ...prev,
                    pickupDateTime: finalDate,
                    dropoffDateTime: undefined,
                    dateRange: undefined
                  }));
                  
                  if (date) {
                    trackEvent('Search Form', 'Select Date', date.toISOString());
                  }
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