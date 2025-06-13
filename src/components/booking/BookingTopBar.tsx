import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { MapPin, Users, Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
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

const BookingTopBar: React.FC<{
  from: string;
  to: string;
  type: string;
  date: string;
  returnDate?: string;
  passengers: string;
  currentStep?: number;
}> = ({ 
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
  
  // Add component mount tracking
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Get minimum booking time (4 hours from now)
  const minPickupDateTime = getMinimumBookingTime();
  
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
      
      // Ensure date is at least 4 hours in the future
      const minBookingTime = getMinimumBookingTime();
      if (parsedDate < minBookingTime) {
        return minBookingTime;
      }
      
      return parsedDate;
    } catch (e) {
      console.error("Error parsing URL date:", e);
      return undefined;
    }
  };
  
  // Form data state with full date objects including time
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    pickupDisplay: '', // Store the display version
    dropoffDisplay: '', // Store the display version
    pickupDateTime: undefined as Date | undefined,
    dropoffDateTime: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: parseInt(passengers, 10)
  });
  
  // Store original values for comparison
  const originalValuesRef = useRef({
    from: '',
    to: '',
    isOneWay: isOneWayFromProps,
    pickupDisplay: '',
    dropoffDisplay: '',
    pickupDateTime: undefined as Date | undefined,
    dropoffDateTime: undefined as Date | undefined,
    dateRange: undefined as DateRange | undefined,
    passengers: parseInt(passengers, 10),
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
    
    // Properly decode URL parameters for display
    const decodedFrom = decodeURIComponent(from.replace(/-/g, ' '));
    const decodedTo = decodeURIComponent(to.replace(/-/g, ' '));
    
    // Use the display names from context if available, otherwise use decoded URL params
    const initialPickupValue = bookingState.fromDisplay || decodedFrom;
    const initialDropoffValue = bookingState.toDisplay || decodedTo;
    
    // Parse dates from URL if needed
    const parsedPickupDate = parseUrlDate(date);
    const parsedDropoffDate = returnDate && returnDate !== '0' ? parseUrlDate(returnDate) : undefined;
    
    // Get dates from context if available, otherwise use parsed URL dates
    const pickupDateTime = bookingState.pickupDateTime || parsedPickupDate;
    const dropoffDateTime = bookingState.dropoffDateTime || parsedDropoffDate;
    
    // Set initial values
    setPickupValue(initialPickupValue);
    setDropoffValue(initialDropoffValue);
    
    // Preserve any existing coordinates from context
    if (bookingState.fromCoords) {
      setPickupCoords(bookingState.fromCoords);
    }
    
    if (bookingState.toCoords) {
      setDropoffCoords(bookingState.toCoords);
    }
    
    // Set initial date values
    if (isOneWay) {
      setFormData(prev => ({
        ...prev,
        pickup: initialPickupValue,
        dropoff: initialDropoffValue,
        pickupDisplay: initialPickupValue,
        dropoffDisplay: initialDropoffValue,
        pickupDateTime: pickupDateTime,
        dropoffDateTime: undefined,
        dateRange: undefined
      }));
    } else {
      if (pickupDateTime && dropoffDateTime) {
        setFormData(prev => ({
          ...prev,
          pickup: initialPickupValue,
          dropoff: initialDropoffValue,
          pickupDisplay: initialPickupValue,
          dropoffDisplay: initialDropoffValue,
          pickupDateTime: undefined,
          dropoffDateTime: undefined,
          dateRange: {
            from: pickupDateTime,
            to: dropoffDateTime
          }
        }));
      }
    }
    
    // Store original values for comparison
    originalValuesRef.current = {
      from: initialPickupValue,
      to: initialDropoffValue,
      isOneWay: isOneWayFromProps,
      pickupDisplay: initialPickupValue,
      dropoffDisplay: initialDropoffValue,
      pickupDateTime,
      dropoffDateTime,
      dateRange: pickupDateTime && dropoffDateTime && !isOneWayFromProps
        ? { from: pickupDateTime, to: dropoffDateTime }
        : undefined,
      passengers: parseInt(passengers, 10)
    };
    
    console.log("BookingTopBar initialized with:", {
      type,
      isOneWay: isOneWayFromProps,
      from: initialPickupValue,
      to: initialDropoffValue,
      pickupDateTime,
      dropoffDateTime
    });
    
    // Mark as initialized to prevent this effect from running again
    isInitializedRef.current = true;
  }, [from, to, type, date, returnDate, passengers, isOneWayFromProps, 
      bookingState.fromDisplay, bookingState.toDisplay, 
      bookingState.pickupDateTime, bookingState.dropoffDateTime,
      bookingState.fromCoords, bookingState.toCoords]);

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
      pickupValue !== original.from ||
      dropoffValue !== original.to;
    
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
    
    if (!isOneWay && (!formData.dateRange?.from || !formData.dateRange?.to)) {
      toast({
        title: "Missing Date Information",
        description: "Please select both pickup and return dates",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure pickup time is at least 4 hours in the future
    const pickupDateTime = isOneWay ? formData.pickupDateTime : formData.dateRange?.from;
    if (pickupDateTime && !isValidBookingTime(pickupDateTime)) {
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
          title: "Invalid Return Time",
          description: "Return time must be after pickup time",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Get values from current state - use actual display values for the URL
    const encodedFrom = encodeURIComponent(pickupValue.toLowerCase().replace(/\s+/g, '-'));
    const encodedTo = encodeURIComponent(dropoffValue.toLowerCase().replace(/\s+/g, '-'));
    
    // Prepare URL parameters for navigation
    const newType = isOneWay ? '1' : '2';
    
    let formattedDepartureDate = '';
    let formattedReturnDate = '0';
    
    if (isOneWay && formData.pickupDateTime) {
      formattedDepartureDate = formatDateForUrl(formData.pickupDateTime);
    } else if (!isOneWay && formData.dateRange?.from && formData.dateRange?.to) {
      formattedDepartureDate = formatDateForUrl(formData.dateRange.from);
      formattedReturnDate = formatDateForUrl(formData.dateRange.to);
    }
    
    const baseRoute = location.pathname.startsWith('/home') ? '/home/transfer' : '/transfer';
    const path = `${baseRoute}/${encodedFrom}/${encodedTo}/${newType}/${formattedDepartureDate}/${formattedReturnDate}/${formData.passengers}/form`;
    
    // Update original values to match the new route
    originalValuesRef.current = {
      from: pickupValue,
      to: dropoffValue,
      isOneWay: isOneWay,
      pickupDisplay: pickupValue,
      dropoffDisplay: dropoffValue,
      pickupDateTime: isOneWay ? formData.pickupDateTime : formData.dateRange?.from,
      dropoffDateTime: !isOneWay ? formData.dateRange?.to : undefined,
      dateRange: !isOneWay && formData.dateRange?.from && formData.dateRange?.to 
        ? { from: formData.dateRange.from, to: formData.dateRange.to }
        : undefined,
      passengers: formData.passengers
    };
    
    // Set loading state
    setIsLoadingPrices(true);
    setApiError(null);
    
    // Use the context's fetchPricingData function
    const dropoffDateTime = !isOneWay && formData.dateRange?.to ? formData.dateRange.to : undefined;
    const pickupDateObj = isOneWay ? formData.pickupDateTime! : formData.dateRange!.from;
    
    const pricingResponse = await fetchPricingData({
      from: pickupValue,
      to: dropoffValue,
      fromCoords: pickupCoords,
      toCoords: dropoffCoords,
      pickupDateTime: pickupDateObj,
      dropoffDateTime: dropoffDateTime,
      isReturn: !isOneWay,
      fromDisplay: pickupValue,
      toDisplay: dropoffValue,
      passengers: formData.passengers
    });
    
    // If price fetching failed, stop here
    if (!pricingResponse) {
      setIsLoadingPrices(false);
      return;
    }
    
    // Reset change detection before navigation
    setHasChanges(false);
    userInteractedRef.current = false;
    setIsLoadingPrices(false);
    
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
  
  // State for geocoding error field
  const [geocodingErrorField, setGeocodingErrorField] = useState<'pickup' | 'dropoff' | null>(null);
  
  // Function to cancel geocoding
  const handleCancelGeocoding = () => {
    setGeocodingErrorField(null);
    setIsLoadingPrices(false);
  };

  const handlePickupValidation = (isValid: boolean) => {
    setPickupIsValid(isValid);
  };

  const handleDropoffValidation = (isValid: boolean) => {
    setDropoffIsValid(isValid);
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
        const pickupDate = prev.pickupDateTime || minPickupDateTime;
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
      {isLoadingPrices && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-6">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <LoadingAnimation 
              onCancel={handleCancelGeocoding}
              onTryDifferentRoute={() => setGeocodingErrorField(null)}
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
                minDate={minPickupDateTime}
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
                minDate={minPickupDateTime}
              />
            )}
            <div className="relative">
              <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg bg-white flex justify-between items-center">
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
                  minDate={minPickupDateTime}
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
                  minDate={minPickupDateTime}
                />
              )}
              
              {/* Passengers */}
              <div className="relative">
                <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <div className="w-full h-[42px] pl-10 pr-4 border border-gray-200 rounded-lg bg-white flex justify-between items-center">
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