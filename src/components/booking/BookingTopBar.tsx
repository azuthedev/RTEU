import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { MapPin, Users, Plus, Minus, Loader2, AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { DatePicker } from '../ui/date-picker';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { GooglePlacesAutocomplete } from '../ui/GooglePlacesAutocomplete';
import { useBooking } from '../../contexts/BookingContext';
import { initGoogleMaps } from '../../utils/optimizeThirdParty';
import { useToast } from '../ui/use-toast';
import LoadingAnimation from '../LoadingAnimation';
import { 
  formatDateForUrl, 
  getMinimumBookingTime,
  isValidBookingTime 
} from '../../utils/searchFormHelpers';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { bookingState, setBookingState, fetchPricingData } = useBooking();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Flag to track component initialization
  const isInitializedRef = useRef(false);
  
  // Flag to track user interaction
  const userInteractedRef = useRef(false);
  
  // Determine if it's a one-way trip based on bookingState first, then URL params as fallback
  const [isOneWay, setIsOneWay] = useState(!bookingState.isReturn);
  const [displayPassengers, setDisplayPassengers] = useState(bookingState.passengers || parseInt(passengers, 10) || 1);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Input field states - initialize with bookingState (which was populated in BookingFlow)
  const [pickupValue, setPickupValue] = useState('');
  const [dropoffValue, setDropoffValue] = useState('');
  
  // State for geocoded coordinates and place IDs - initialize from bookingState
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(bookingState.fromCoords || null);
  const [dropoffCoords, setDropoffCoords] = useState<{lat: number, lng: number} | null>(bookingState.toCoords || null);
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(null);
  const [dropoffPlaceId, setDropoffPlaceId] = useState<string | null>(null);
  
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Initialize validation state based on whether we have addresses in bookingState
  // If addresses exist in bookingState, they were already validated in SearchForm
  const [pickupIsValid, setPickupIsValid] = useState(!!bookingState.fromDisplay);
  const [dropoffIsValid, setDropoffIsValid] = useState(!!bookingState.toDisplay);

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
        // Code to abort the active request would go here
      }
    };
  }, []);

  // Get minimum booking time (4 hours from now)
  const minimumDate = getMinimumBookingTime();

  // Initialize form with existing data from context
  useEffect(() => {
    // Only run this effect once during initialization
    if (isInitializedRef.current) {
      return;
    }

    console.log("🔄 BookingTopBar - Initializing from context");
    
    // CRITICAL CHANGE: Always use bookingContext as the primary source of truth
    // URL parameters should only be used as fallbacks
    
    // Set initial values directly from bookingState
    setPickupValue(bookingState.fromDisplay || bookingState.from || '');
    setDropoffValue(bookingState.toDisplay || bookingState.to || '');
    
    // Use isReturn from bookingState (default to URL param type if not set)
    setIsOneWay(!bookingState.isReturn);
    
    // Use passengers from bookingState (default to URL param if not set)
    setDisplayPassengers(bookingState.passengers || parseInt(passengers, 10) || 1);
    
    // Use coordinates from bookingState if available
    if (bookingState.fromCoords) {
      setPickupCoords(bookingState.fromCoords);
    }
    
    if (bookingState.toCoords) {
      setDropoffCoords(bookingState.toCoords);
    }
    
    // Set form data with actual date objects from bookingState
    setFormData({
      pickup: bookingState.fromDisplay || bookingState.from || '',
      dropoff: bookingState.toDisplay || bookingState.to || '',
      pickupDisplay: bookingState.fromDisplay || bookingState.from || '',
      dropoffDisplay: bookingState.toDisplay || bookingState.to || '',
      pickupDateTime: bookingState.isReturn ? undefined : bookingState.pickupDateTime,
      dropoffDateTime: bookingState.isReturn ? undefined : bookingState.dropoffDateTime,
      dateRange: bookingState.isReturn && bookingState.pickupDateTime && bookingState.dropoffDateTime
        ? { from: bookingState.pickupDateTime, to: bookingState.dropoffDateTime }
        : undefined,
      passengers: bookingState.passengers || parseInt(passengers, 10) || 1
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
      dateRange: bookingState.isReturn && bookingState.pickupDateTime && bookingState.dropoffDateTime
        ? { from: bookingState.pickupDateTime, to: bookingState.dropoffDateTime }
        : undefined,
      passengers: bookingState.passengers || parseInt(passengers, 10) || 1
    };
    
    console.log("BookingTopBar initialized with context data:", {
      pickupValue: bookingState.fromDisplay || bookingState.from,
      dropoffValue: bookingState.toDisplay || bookingState.to,
      isOneWay: !bookingState.isReturn,
      pickupDateTime: bookingState.pickupDateTime,
      dropoffDateTime: bookingState.dropoffDateTime,
      fromCoords: bookingState.fromCoords ? 'Present' : 'None',
      toCoords: bookingState.toCoords ? 'Present' : 'None',
      initialPickupValid: !!bookingState.fromDisplay,
      initialDropoffValid: !!bookingState.toDisplay
    });
    
    // Mark as initialized
    isInitializedRef.current = true;
  }, [bookingState, from, to, type, date, returnDate, passengers]);

  // Form data state with full date objects including time
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    pickupDisplay: '', // Store the display version
    dropoffDisplay: '', // Store the display version
    pickupDateTime: undefined as Date | undefined,
    dropoffDateTime: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: displayPassengers
  });
  
  // Store original values for comparison
  const originalValuesRef = useRef({
    from: '',
    to: '',
    isOneWay: true,
    pickupDisplay: '',
    dropoffDisplay: '',
    pickupDateTime: undefined as Date | undefined,
    dropoffDateTime: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: 1,
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
    const original = originalValuesRef.current;
    
    // Compare current form data with original values
    const hasAddressChanges = 
      pickupValue !== original.pickupDisplay ||
      dropoffValue !== original.dropoffDisplay;
    
    const hasDateChanges = isOneWay
      ? formData.pickupDateTime?.getTime() !== original.pickupDateTime?.getTime()
      : formData.dateRange?.from?.getTime() !== original.dateRange?.from?.getTime() ||
        formData.dateRange?.to?.getTime() !== original.dateRange?.to?.getTime();
    
    const hasTypeChange = formType !== (original.isOneWay ? '1' : '2');
    const hasPassengerChange = formData.passengers !== original.passengers;
    
    // Determine if there are any changes
    const formHasChanges = hasAddressChanges || hasDateChanges || hasTypeChange || hasPassengerChange;
    
    console.log('Change detection:', {
      hasChanges: formHasChanges,
      hasAddressChanges,
      hasDateChanges,
      hasTypeChange,
      hasPassengerChange,
      userInteracted: userInteractedRef.current
    });
    
    setHasChanges(formHasChanges);
  }, [formData, isOneWay, pickupValue, dropoffValue]);

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
    
    // Check date validity
    if (isOneWay && !formData.pickupDateTime) {
      toast({
        title: "Missing Pickup Date",
        description: "Please select a pickup date and time",
        variant: "destructive"
      });
      return;
    }
    
    // Check if return date is set for round trips - using full date objects
    if (!isOneWay && (!formData.dateRange?.from || !formData.dateRange?.to)) {
      toast({
        title: "Missing Return Date",
        description: "Please select both pickup and return dates",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure pickup time is at least 4 hours in the future
    const pickupDateObj = isOneWay ? formData.pickupDateTime : formData.dateRange!.from;
    if (pickupDateObj && !isValidBookingTime(pickupDateObj)) {
      toast({
        title: "Invalid Pickup Time",
        description: "Pickup time must be at least 4 hours from now",
        variant: "destructive"
      });
      return;
    }
    
    // For round trips, ensure dropoff is after pickup
    if (!isOneWay && formData.dateRange?.from && formData.dateRange?.to) {
      if (formData.dateRange.to.getTime() <= formData.dateRange.from.getTime()) {
        toast({
          title: "Invalid Return Date",
          description: "Return time must be after pickup time",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Set loading state
    setIsLoadingPrices(true);
    setApiError(null);
    setGeocodingErrorField(null);
    
    // Show loading modal
    setShowLoadingModal(true);
    
    // Use the context's fetchPricingData function
    const dropoffDateTime = !isOneWay && formData.dateRange?.to ? formData.dateRange.to : undefined;
    
    const pricingResponse = await fetchPricingData({
      from: pickupValue,
      to: dropoffValue,
      fromCoords: pickupCoords,
      toCoords: dropoffCoords,
      pickupDateTime: pickupDateObj!,
      dropoffDateTime: dropoffDateTime,
      isReturn: !isOneWay,
      fromDisplay: pickupValue,
      toDisplay: dropoffValue,
      passengers: formData.passengers
    });
    
    // Hide loading modal
    setShowLoadingModal(false);
    setIsLoadingPrices(false);
    
    // If price fetching failed, stop here
    if (!pricingResponse) {
      return;
    }
    
    // Store URL-friendly versions of pickup and dropoff (lowercase for URL)
    const encodedPickup = encodeURIComponent(pickupValue.toLowerCase().replace(/\s+/g, '-'));
    const encodedDropoff = encodeURIComponent(dropoffValue.toLowerCase().replace(/\s+/g, '-'));
    
    // Important: Type is '1' for One Way, '2' for Round Trip 
    const urlType = isOneWay ? '1' : '2';
    
    // Format dates for URL
    const formattedDepartureDate = pickupDateObj ? formatDateForUrl(pickupDateObj) : '';
    
    // Always include returnDate parameter (use '0' for one-way trips)
    const returnDateParam = !isOneWay && formData.dateRange?.to
      ? formatDateForUrl(formData.dateRange.to)
      : '0';
    
    // Build the URL path
    const path = `/transfer/${encodedPickup}/${encodedDropoff}/${urlType}/${formattedDepartureDate}/${returnDateParam}/${formData.passengers}/form`;
    
    // Reset change detection before navigation
    setHasChanges(false);
    userInteractedRef.current = false;
    
    // Reset original values to match the new state
    originalValuesRef.current = {
      isOneWay: isOneWay,
      from: pickupValue,
      to: dropoffValue,
      pickupDisplay: pickupValue,
      dropoffDisplay: dropoffValue,
      pickupDateTime: isOneWay ? formData.pickupDateTime : formData.dateRange?.from,
      dropoffDateTime: !isOneWay ? formData.dateRange?.to : undefined,
      dateRange: !isOneWay && formData.dateRange?.from && formData.dateRange?.to 
        ? { from: formData.dateRange.from, to: formData.dateRange.to }
        : undefined,
      passengers: formData.passengers
    };
    
    navigate(path);
  };

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
      // Code to abort the active request would go here
      activeRequestRef.current = null;
    }
    
    setIsLoadingPrices(false);
    setGeocodingErrorField(null);
    setShowLoadingModal(false);
  };
  
  // Function to try a different route (for geocoding errors)
  const handleTryDifferentRoute = () => {
    setGeocodingErrorField(null);
    setIsLoadingPrices(false);
    setShowLoadingModal(false);
    
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
        pickupDateTime: originalValuesRef.current.pickupDateTime,
        dropoffDateTime: originalValuesRef.current.dropoffDateTime,
        dateRange: originalValuesRef.current.pickupDateTime && originalValuesRef.current.dropoffDateTime
          ? { from: originalValuesRef.current.pickupDateTime, to: originalValuesRef.current.dropoffDateTime }
          : undefined
      }));
      return;
    }
    
    setIsOneWay(oneWay);
    
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
        const pickupDate = prev.pickupDateTime || minimumDate;
        const defaultDropoffDate = new Date(pickupDate);
        defaultDropoffDate.setDate(defaultDropoffDate.getDate() + 1);
        
        return {
          ...prev,
          pickupDateTime: undefined,
          dropoffDateTime: undefined,
          dateRange: {
            from: pickupDate,
            to: prev.dropoffDateTime || defaultDropoffDate
          }
        };
      });
    }
  };

  return (
    <div className="relative">
      {/* Loading overlay */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-6">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <LoadingAnimation 
              onCancel={handleCancelLoading}
              onTryDifferentRoute={handleTryDifferentRoute}
              geocodingErrorField={geocodingErrorField}
              isSlowConnection={false}
            />
          </div>
        </div>
      )}
      
      {/* API Error Display */}
      {apiError && (
        <div className="absolute top-0 left-0 right-0 m-4 p-4 bg-red-50 border border-red-200 rounded-md z-40 shadow-md">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <p className="font-medium text-red-800">{t('common.api_error', 'API Error')}</p>
              <p className="text-red-700 text-sm mt-1">{apiError}</p>
              <button 
                onClick={() => setApiError(null)}
                className="text-xs text-blue-600 mt-2 hover:underline"
              >
                {t('common.dismiss', 'Dismiss')}
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
              {t('searchform.oneway', 'One Way')}
            </button>
            <button
              className={`w-32 relative z-10 transition-colors ${
                !isOneWay ? 'text-white' : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => handleTripTypeChange(false)}
            >
              {t('searchform.roundtrip', 'Round Trip')}
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
                setGeocodingErrorField(null);
              }}
              onPlaceSelect={(displayName, placeData) => handlePlaceSelect('pickup', displayName, placeData)}
              placeholder={t('searchform.pickup', 'Pickup location')}
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
                setGeocodingErrorField(null);
              }}
              onPlaceSelect={(displayName, placeData) => handlePlaceSelect('dropoff', displayName, placeData)}
              placeholder={t('searchform.dropoff', 'Dropoff location')}
              className="w-full"
              required={true}
              onValidation={handleDropoffValidation}
              id="dropoff-field-mobile"
            />
            
            {/* Date Selection */}
            {isOneWay ? (
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
                  }
                }}
                placeholder={t('searchform.date', 'Select departure date')}
                minDate={minimumDate}
              />
            ) : (
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
                    if (returnDate.getTime() <= pickupDate.getTime()) {
                      returnDate = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000); // Next day
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
                  }
                }}
                placeholder={t('searchform.dates', 'Select departure & return dates')}
                className="w-full"
                minDate={minimumDate}
              />
            )}
            <div className="relative">
              <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-md bg-white flex justify-between items-center">
                <span className="text-gray-700 text-[12px]">
                  {displayPassengers} {' '}
                  {displayPassengers !== 1 ? t('searchform.passengers', 'Passengers') : t('searchform.passenger', 'Passenger')}
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
                  {t('searchform.updating', 'Updating...')}
                </div>
              ) : (
              t('searchform.update_route', 'Update Route')
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
                  setGeocodingErrorField(null);
                }}
                onPlaceSelect={(displayName, placeData) => handlePlaceSelect('pickup', displayName, placeData)}
                placeholder={t('searchform.pickup', 'Pickup location')}
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
                  setGeocodingErrorField(null);
                }}
                onPlaceSelect={(displayName, placeData) => handlePlaceSelect('dropoff', displayName, placeData)}
                placeholder={t('searchform.dropoff', 'Dropoff location')}
                className="w-full"
                required={true}
                onValidation={handleDropoffValidation}
                id="dropoff-field-desktop"
              />
              
              {/* Date Selection */}
              {isOneWay ? (
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
                    }
                  }}
                  placeholder={t('searchform.date', 'Select departure date')}
                  minDate={minimumDate}
                />
              ) : (
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
                      if (returnDate.getTime() <= pickupDate.getTime()) {
                        returnDate = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000); // Next day
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
                    }
                  }}
                  placeholder={t('searchform.dates', 'Select departure & return dates')}
                  className="col-span-1"
                  minDate={minimumDate}
                />
              )}
              
              {/* Passengers */}
              <div className="relative">
                <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-md bg-white flex justify-between items-center">
                  <span className="text-gray-700 text-[12px]">
                    {displayPassengers} {' '}
                    {displayPassengers !== 1 ? t('searchform.passengers', 'Passengers') : t('searchform.passenger', 'Passenger')}
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
                  {t('searchform.updating', 'Updating')}
                </div>
              ) : (
                t('searchform.update_route', 'Update Route')
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTopBar;