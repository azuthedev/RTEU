import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { DatePicker } from '../ui/date-picker';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { GooglePlacesAutocomplete } from '../ui/GooglePlacesAutocomplete';
import { useBooking } from '../../contexts/BookingContext';
import { initGoogleMaps } from '../../utils/optimizeThirdParty';

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
  
  // Input field states - use the display names from context if available
  const [pickupValue, setPickupValue] = useState(bookingState.fromDisplay || from);
  const [dropoffValue, setDropoffValue] = useState(bookingState.toDisplay || to);
  
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

  // Initialize component once
  useEffect(() => {
    // Force hasChanges to false initially
    setHasChanges(false);
    isInitializedRef.current = true;

    // Use the display names from context if available
    if (bookingState.fromDisplay) {
      setPickupValue(bookingState.fromDisplay);
    }
    
    if (bookingState.toDisplay) {
      setDropoffValue(bookingState.toDisplay);
    }

    console.log("BookingTopBar initialized with:", {
      type,
      isOneWay: isOneWayFromProps,
      from: pickupValue,
      to: dropoffValue,
      date,
      returnDate
    });
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

  // Handle place selection from autocomplete
  const handlePlaceSelect = (field: 'pickup' | 'dropoff', displayName: string) => {
    userInteractedRef.current = true;
    
    if (field === 'pickup') {
      setPickupValue(displayName);
    } else {
      setDropoffValue(displayName);
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

  const handleUpdateRoute = () => {
    if (!hasChanges) return;

    // Get values from current state - use actual display values for the URL
    const encodedFrom = encodeURIComponent(pickupValue.toLowerCase().replace(/\s+/g, '-'));
    const encodedTo = encodeURIComponent(dropoffValue.toLowerCase().replace(/\s+/g, '-'));
    
    let formattedDepartureDate;
    let formattedReturnDate = '0';

    if (!isOneWay && formData.dateRange) {
      if (!formData.dateRange.from || !formData.dateRange.to) {
        alert('Please select both departure and return dates for round trips.');
        return;
      }
      formattedDepartureDate = formatDateForUrl(formData.dateRange.from);
      formattedReturnDate = formatDateForUrl(formData.dateRange.to);
    } else if (isOneWay && formData.departureDate) {
      formattedDepartureDate = formatDateForUrl(formData.departureDate);
    } else {
      alert('Please select a date for your trip.');
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
      passengers: formData.passengers
    }));

    // Reset change detection before navigation
    setHasChanges(false);
    userInteractedRef.current = false;
    
    navigate(path);
  };

  return (
    <div className="relative">
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
              className={`absolute inset-y-0 w-32 bg-black transition-transform duration-300 ${
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
              onChange={(value) => handlePlaceSelect('pickup', value)}
              onPlaceSelect={(displayName) => handlePlaceSelect('pickup', displayName)}
              placeholder="From"
              className="w-full"
            />

            {/* Mobile Dropoff Location */}
            <GooglePlacesAutocomplete
              value={dropoffValue}
              onChange={(value) => handlePlaceSelect('dropoff', value)}
              onPlaceSelect={(displayName) => handlePlaceSelect('dropoff', displayName)}
              placeholder="To"
              className="w-full"
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
              whileTap={{ scale: hasChanges ? 0.95 : 1 }}
              onClick={handleUpdateRoute}
              className={`w-full py-2 rounded-lg transition-all duration-300 ${
                hasChanges 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges}
            >
              Update Route
            </motion.button>
          </div>

          {/* Desktop View */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex-1 grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-4">
              {/* Desktop Pickup Location */}
              <GooglePlacesAutocomplete
                value={pickupValue}
                onChange={(value) => handlePlaceSelect('pickup', value)}
                onPlaceSelect={(displayName) => handlePlaceSelect('pickup', displayName)}
                placeholder="From"
                className="w-full"
              />

              {/* Desktop Dropoff Location */}
              <GooglePlacesAutocomplete
                value={dropoffValue}
                onChange={(value) => handlePlaceSelect('dropoff', value)}
                onPlaceSelect={(displayName) => handlePlaceSelect('dropoff', displayName)}
                placeholder="To"
                className="w-full"
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
              whileTap={{ scale: hasChanges ? 0.95 : 1 }}
              onClick={handleUpdateRoute}
              className={`px-6 py-2 rounded-lg transition-all duration-300 min-w-[120px] ${
                hasChanges 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!hasChanges}
            >
              Update Route
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTopBar;