import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { vehicles } from '../data/vehicles';
import { useLocation } from 'react-router-dom';
import { fetchWithCors, getApiUrl } from '../utils/corsHelper';
import { requestTracker } from '../utils/requestTracker';
import { errorTracker, ErrorContext, ErrorSeverity } from '../utils/errorTracker';
import { geocodeAddress } from '../utils/searchFormHelpers';
import { useToast } from '../components/ui/use-toast';

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
  version?: string;
  checksum?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Define the shape of our booking state
export interface BookingState {
  step: 1 | 2 | 3;
  previousStep?: 1 | 2 | 3; // Added to track previous step for animations
  selectedVehicle: typeof vehicles[0];
  from?: string;
  to?: string;
  fromDisplay?: string; // Store the display name for from location
  toDisplay?: string;   // Store the display name for to location
  // Store coordinates to prevent repeated geocoding
  fromCoords?: {lat: number, lng: number} | null;
  toCoords?: {lat: number, lng: number} | null;
  fromValid?: boolean;  // Track if pickup location is valid
  toValid?: boolean;    // Track if dropoff location is valid
  isReturn?: boolean;
  // Full date objects with time information
  pickupDateTime?: Date;
  dropoffDateTime?: Date;
  // Keep these for URL compatibility
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  bookingReference?: string; // Added to store the booking reference
  personalDetails: {
    title: 'mr' | 'ms';
    firstName: string;
    lastName: string;
    email: string;
    country: string;
    phone: string;
    selectedExtras: Set<string>;
    pickup?: string; // Added to store pickup location from form
    dropoff?: string; // Added to store dropoff location from form
    pickupDisplay?: string; // Display name for pickup
    dropoffDisplay?: string; // Display name for dropoff
    flightNumber?: string; // Added flight number field
    extraStops?: {address: string, lat?: number, lng?: number}[]; // Added extra stops
    childSeats?: Record<string, number>; // Added child seat quantities
    luggageCount?: number; // Added luggage count
  };
  paymentDetails: {
    method: 'card' | 'cash';
    cardNumber?: string;
    expiryDate?: string;
    cvc?: string;
    discountCode?: string;
  };
  pricingResponse?: PricingResponse; // Store pricing data from API
  pricingError?: string | null; // Added to track pricing fetch errors
  validationErrors: ValidationError[]; // Added to track validation errors
  isPricingLoading: boolean; // Added to track global pricing loading state
}

interface BookingContextType {
  bookingState: BookingState;
  setBookingState: React.Dispatch<React.SetStateAction<BookingState>>;
  clearBookingState: () => void;
  validateStep: (step: number) => ValidationError[];
  proceedToNextStep: () => boolean;
  scrollToError: (fieldId: string) => void;
  fetchPricingData: (params: {
    from: string;
    to: string;
    fromCoords?: {lat: number, lng: number} | null;
    toCoords?: {lat: number, lng: number} | null;
    pickupDateTime: Date;
    dropoffDateTime?: Date;
    isReturn: boolean;
    fromDisplay?: string;
    toDisplay?: string;
    passengers: number;
  }) => Promise<PricingResponse | null>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const BOOKING_STORAGE_KEY = 'royaltransfer_booking_state';

// Serialize booking state for storage
// Explicitly exclude sensitive payment information
const serializeBookingState = (state: BookingState): string => {
  // Create a copy to avoid modifying the original state
  const stateCopy = { ...state };

  // Convert Set to Array for JSON serialization
  if (stateCopy.personalDetails?.selectedExtras) {
    stateCopy.personalDetails = {
      ...stateCopy.personalDetails,
      selectedExtras: Array.from(stateCopy.personalDetails.selectedExtras)
    };
  }

  // Convert Date objects to ISO strings
  if (stateCopy.pickupDateTime) {
    stateCopy.pickupDateTime = stateCopy.pickupDateTime.toISOString();
  }
  
  if (stateCopy.dropoffDateTime) {
    stateCopy.dropoffDateTime = stateCopy.dropoffDateTime.toISOString();
  }
  
  // Remove sensitive payment information
  if (stateCopy.paymentDetails) {
    stateCopy.paymentDetails = {
      method: stateCopy.paymentDetails.method,
      discountCode: stateCopy.paymentDetails.discountCode
    };
  }

  return JSON.stringify(stateCopy);
};

// Deserialize booking state from storage
const deserializeBookingState = (serialized: string | null): BookingState | null => {
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized);

    // Convert Array back to Set for selectedExtras
    if (parsed.personalDetails?.selectedExtras) {
      parsed.personalDetails = {
        ...parsed.personalDetails,
        selectedExtras: new Set(parsed.personalDetails.selectedExtras)
      };
    }
    
    // Convert ISO strings back to Date objects
    if (parsed.pickupDateTime) {
      parsed.pickupDateTime = new Date(parsed.pickupDateTime);
    }
    
    if (parsed.dropoffDateTime) {
      parsed.dropoffDateTime = new Date(parsed.dropoffDateTime);
    }

    // Ensure we have proper vehicle object with all methods and properties
    if (parsed.selectedVehicle) {
      // Find the matching vehicle from our data
      const matchedVehicle = vehicles.find(v => v.id === parsed.selectedVehicle.id);
      if (matchedVehicle) {
        parsed.selectedVehicle = matchedVehicle;
      } else {
        parsed.selectedVehicle = vehicles[0]; // Default to first vehicle if not found
      }
    }

    // Initialize validation errors if not present
    if (!parsed.validationErrors) {
      parsed.validationErrors = [];
    }
    
    // CRITICAL FIX: Ensure fromValid and toValid are properly deserialized
    if (parsed.fromValid === undefined && parsed.fromDisplay) {
      parsed.fromValid = true; // If we have a display name, it was validated
    }
    
    if (parsed.toValid === undefined && parsed.toDisplay) {
      parsed.toValid = true; // If we have a display name, it was validated
    }

    return parsed;
  } catch (e) {
    console.error('Failed to parse booking state:', e);
    return null;
  }
};

// Save booking state to sessionStorage
const saveBookingState = (state: BookingState): void => {
  try {
    const serialized = serializeBookingState(state);
    sessionStorage.setItem(BOOKING_STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save booking state:', e);
  }
};

// Load booking state from sessionStorage
const loadBookingState = (): BookingState | null => {
  try {
    const serialized = sessionStorage.getItem(BOOKING_STORAGE_KEY);
    return deserializeBookingState(serialized);
  } catch (e) {
    console.error('Failed to load booking state:', e);
    return null;
  }
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

// Helper function to parse URL parameters for booking flow
const initializeFromUrlParams = (pathname: string): Partial<BookingState> | null => {
  // Match pattern like /transfer/rome/milan/1/230415/0/2/form
  const urlPattern = /\/transfer\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)/;
  const match = pathname.match(urlPattern);
  
  if (!match) return null;
  
  // Extract path parameters
  const [, from, to, type, date, returnDate, passengers] = match;
  
  // Parse properly for display
  const decodedFrom = decodeURIComponent(from.replace(/-/g, ' '));
  const decodedTo = decodeURIComponent(to.replace(/-/g, ' '));
  
  // Helper function to parse dates
  const parseUrlDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr === '0') return undefined;
    
    try {
      // Format is YYMMDD
      const year = parseInt(`20${dateStr.slice(0, 2)}`);
      const month = parseInt(dateStr.slice(2, 4)) - 1; // JS months are 0-indexed
      const day = parseInt(dateStr.slice(4, 6));
      
      // Create date with default time (noon)
      return new Date(year, month, day, 12, 0, 0);
    } catch (e) {
      console.error('Error parsing URL date:', e);
      return undefined;
    }
  };
  
  // Parse dates
  const pickupDateTime = parseUrlDate(date);
  const dropoffDateTime = returnDate !== '0' ? parseUrlDate(returnDate) : undefined;
  
  return {
    from: decodedFrom,
    to: decodedTo,
    fromDisplay: decodedFrom,
    toDisplay: decodedTo,
    isReturn: type === '2',
    pickupDateTime,
    dropoffDateTime,
    departureDate: date,
    returnDate: returnDate !== '0' ? returnDate : undefined,
    passengers: parseInt(passengers, 10)
  };
};

// Get default booking state
const getDefaultBookingState = (pathname?: string): BookingState => {
  // First try to initialize from URL parameters if we're on a booking page
  const urlInitialization = pathname ? initializeFromUrlParams(pathname) : null;
  
  // Base default state
  const baseState: BookingState = {
    step: 1,
    selectedVehicle: vehicles[0],
    personalDetails: {
      title: 'mr',
      firstName: '',
      lastName: '',
      email: '',
      country: '',
      phone: '',
      selectedExtras: new Set(),
      extraStops: [], // Initialize extra stops array
      childSeats: {}, // Initialize child seats object
      luggageCount: 2 // Default to 2 luggage items
    },
    paymentDetails: {
      method: 'card'
    },
    fromCoords: null,
    toCoords: null,
    fromValid: false,  // Initialize validation state as false
    toValid: false,    // Initialize validation state as false
    pricingError: null, // Initialize with null
    validationErrors: [],
    isPricingLoading: false // Initialize loading state as false
  };
  
  // Merge with URL parameters if available
  return urlInitialization 
    ? { ...baseState, ...urlInitialization }
    : baseState;
};

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { toast } = useToast();
  
  // Initialize with default state or loaded state from sessionStorage
  const [bookingState, setBookingState] = useState<BookingState>(() => {
    // First try to load from sessionStorage
    const savedState = loadBookingState();
    
    // Then initialize from URL if we're on a booking page
    const urlState = initializeFromUrlParams(location.pathname);
    
    // Return in priority order: saved state, URL state, or default state
    if (savedState) {
      // If saved state exists, only update the URL parameters
      if (urlState) {
        return {
          ...savedState,
          // Only update URL-specific fields if they don't exist in savedState
          departureDate: savedState.departureDate || urlState.departureDate,
          returnDate: savedState.returnDate || urlState.returnDate
        };
      }
      return savedState;
    } 
    
    // If no saved state, use URL state or default
    return urlState 
      ? { ...getDefaultBookingState(), ...urlState }
      : getDefaultBookingState(location.pathname);
  });

  // Track previous step for animation purposes
  const previousStepRef = useRef<1 | 2 | 3>(bookingState.step);
  
  // Save to sessionStorage whenever bookingState changes
  useEffect(() => {
    saveBookingState(bookingState);
    
    // When step changes, update the previousStep value
    if (bookingState.step !== previousStepRef.current) {
      setBookingState(prev => ({
        ...prev,
        previousStep: previousStepRef.current
      }));
      previousStepRef.current = bookingState.step;
    }
  }, [bookingState]);

  // Log state changes for debugging
  useEffect(() => {
    console.log("BookingContext location data updated:", {
      from: bookingState.from,
      fromDisplay: bookingState.fromDisplay,
      to: bookingState.to, 
      toDisplay: bookingState.toDisplay,
      pickupDateTime: bookingState.pickupDateTime,
      dropoffDateTime: bookingState.dropoffDateTime,
      fromValid: bookingState.fromValid,
      toValid: bookingState.toValid,
      fromCoords: bookingState.fromCoords ? 'Present' : 'None',
      toCoords: bookingState.toCoords ? 'Present' : 'None',
      pricingData: bookingState.pricingResponse ? 'Available' : 'None',
      pricingError: bookingState.pricingError,
      isPricingLoading: bookingState.isPricingLoading
    });
  }, [bookingState.from, bookingState.to, bookingState.fromDisplay, bookingState.toDisplay, 
      bookingState.pickupDateTime, bookingState.dropoffDateTime, bookingState.fromValid, 
      bookingState.toValid, bookingState.fromCoords, bookingState.toCoords,
      bookingState.pricingResponse, bookingState.pricingError, 
      bookingState.isPricingLoading]);

  // Function to clear booking state
  const clearBookingState = () => {
    console.log("Clearing booking state");
    sessionStorage.removeItem(BOOKING_STORAGE_KEY);
    setBookingState(getDefaultBookingState());
  };

  // Function to fetch pricing data
  const fetchPricingData = async (params: {
    from: string;
    to: string;
    fromCoords?: {lat: number, lng: number} | null;
    toCoords?: {lat: number, lng: number} | null;
    pickupDateTime: Date;
    dropoffDateTime?: Date;
    isReturn: boolean;
    fromDisplay?: string;
    toDisplay?: string;
    passengers: number;
  }): Promise<PricingResponse | null> => {
    // Extract params
    const {
      from,
      to,
      fromCoords,
      toCoords,
      pickupDateTime,
      dropoffDateTime,
      isReturn,
      fromDisplay,
      toDisplay,
      passengers
    } = params;

    // Update loading state immediately
    setBookingState(prev => ({
      ...prev,
      isPricingLoading: true,
      pricingError: null
    }));

    try {
      console.log("📡 Fetching prices for route:", { from, to, isReturn });
      const { requestId, signal } = requestTracker.startRequest('fetch-prices');

      requestTracker.updateStage(requestId, 'geocoding');
      
      // Use stored coordinates when available for more reliable geocoding
      let pickup = fromCoords;
      let dropoff = toCoords;
      
      if (!pickup) {
        try {
          pickup = await geocodeAddress(from, 'pickup');
          console.log("🌎 Geocoded pickup:", pickup);
        } catch (error) {
          console.error("❌ Geocoding failed for pickup:", error);
          
          setBookingState(prev => ({
            ...prev,
            isPricingLoading: false,
            pricingError: `Could not locate pickup address. Please try a different address.`
          }));
          
          toast({
            title: "Location Error",
            description: "Unable to find coordinates for pickup location. Please select a more specific address.",
            variant: "destructive"
          });
          
          requestTracker.updateStage(requestId, 'failed', {
            error: `Geocoding failed for pickup location: ${error.message}`
          });
          
          return null;
        }
      }
      
      if (!dropoff) {
        try {
          dropoff = await geocodeAddress(to, 'dropoff');
          console.log("🌎 Geocoded dropoff:", dropoff);
        } catch (error) {
          console.error("❌ Geocoding failed for dropoff:", error);
          
          setBookingState(prev => ({
            ...prev,
            isPricingLoading: false,
            pricingError: `Could not locate dropoff address. Please try a different address.`
          }));
          
          toast({
            title: "Location Error",
            description: "Unable to find coordinates for dropoff location. Please select a more specific address.",
            variant: "destructive"
          });
          
          requestTracker.updateStage(requestId, 'failed', {
            error: `Geocoding failed for dropoff location: ${error.message}`
          });
          
          return null;
        }
      }
      
      if (!pickup || !dropoff) {
        setBookingState(prev => ({
          ...prev,
          isPricingLoading: false,
          pricingError: `Missing location coordinates. Please try again.`
        }));
        
        requestTracker.updateStage(requestId, 'failed', {
          error: `Missing coordinates for ${!pickup ? 'pickup' : 'dropoff'} location`
        });
        
        return null;
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
      
      const response = await fetchWithCors(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
      });
      
      requestTracker.updateStage(requestId, 'processing');
      
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
        
        setBookingState(prev => ({
          ...prev,
          isPricingLoading: false,
          pricingError: `Failed to get pricing: ${response.status} ${response.statusText}`
        }));
        
        requestTracker.updateStage(requestId, 'failed', {
          error: errorDetail,
          status: response.status
        });
        
        throw new Error(`API Error: ${errorDetail}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorMessage = `Expected JSON response but got: ${contentType}`;
        console.error(errorMessage);
        
        setBookingState(prev => ({
          ...prev,
          isPricingLoading: false,
          pricingError: errorMessage
        }));
        
        requestTracker.updateStage(requestId, 'failed', {
          error: errorMessage
        });
        
        throw new Error(errorMessage);
      }
      
      const data: PricingResponse = await response.json();
      console.log('Pricing data received:', data);
      
      requestTracker.updateStage(requestId, 'complete');
      
      // Update state with all necessary data, using display names from params or URL-decoded versions
      setBookingState(prev => ({
        ...prev,
        isPricingLoading: false,
        pricingResponse: data,
        from: from, 
        to: to,
        fromDisplay: fromDisplay || from, 
        toDisplay: toDisplay || to,
        isReturn: isReturn,
        fromCoords: pickup,
        toCoords: dropoff,
        fromValid: true,  // Mark address as valid since we have coordinates
        toValid: true,    // Mark address as valid since we have coordinates
        pickupDateTime: pickupDateTime,
        dropoffDateTime: isReturn ? dropoffDateTime : undefined,
        passengers: passengers,
        pricingError: null
      }));
      
      return data;
    } catch (error: any) {
      console.error('Error fetching prices:', error);
      
      // Update state with error
      setBookingState(prev => ({
        ...prev,
        isPricingLoading: false,
        pricingError: error.message || 'An unexpected error occurred'
      }));
      
      // Track error
      errorTracker.trackError(
        error instanceof Error ? error : new Error(String(error)),
        ErrorContext.PRICING,
        ErrorSeverity.HIGH,
        {
          from: from,
          to: to,
          isReturn: isReturn
        }
      );
      
      return null;
    }
  };

  // Function to validate a specific step of the booking process
  const validateStep = (step: number): ValidationError[] => {
    const errors: ValidationError[] = [];

    switch (step) {
      case 1: // Vehicle selection step
        if (!bookingState.selectedVehicle) {
          errors.push({ field: 'vehicle', message: 'Please select a vehicle' });
        }
        
        // Check if we have the required route information
        if (!bookingState.from || !bookingState.to) {
          errors.push({ field: 'route', message: 'Route information is missing' });
        }
        
        // Check if addresses are validated
        if (bookingState.fromValid === false) {
          errors.push({ field: 'from', message: 'Pickup address is invalid or incomplete' });
        }
        
        if (bookingState.toValid === false) {
          errors.push({ field: 'to', message: 'Dropoff address is invalid or incomplete' });
        }
        
        // Check if we have date information - using full date objects
        if (!bookingState.pickupDateTime) {
          errors.push({ field: 'pickupDateTime', message: 'Pickup date and time are required' });
        }
        
        // Check if return date is set for round trips - using full date objects
        if (bookingState.isReturn && !bookingState.dropoffDateTime) {
          errors.push({ field: 'dropoffDateTime', message: 'Return date and time are required for round trips' });
        }
        
        // Check if pricing error exists
        if (bookingState.pricingError) {
          errors.push({ field: 'pricing', message: 'There was an error fetching prices. Please try again.' });
        }
        
        break;
      
      case 2: // Personal details step
        // Validate personal details
        if (!bookingState.personalDetails.firstName) {
          errors.push({ field: 'firstName', message: 'First name is required' });
        }
        
        if (!bookingState.personalDetails.lastName) {
          errors.push({ field: 'lastName', message: 'Last name is required' });
        }
        
        if (!bookingState.personalDetails.email) {
          errors.push({ field: 'email', message: 'Email is required' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingState.personalDetails.email)) {
          errors.push({ field: 'email', message: 'Please enter a valid email address' });
        }
        
        if (!bookingState.personalDetails.country) {
          errors.push({ field: 'country', message: 'Country is required' });
        }
        
        // Validate flight number if pickup or dropoff is an airport
        const pickupLocation = bookingState.fromDisplay || bookingState.from || '';
        const dropoffLocation = bookingState.toDisplay || bookingState.to || '';
        
        const isAirportTransfer = 
          pickupLocation.toLowerCase().includes('airport') || 
          dropoffLocation.toLowerCase().includes('airport') ||
          /\b(MXP|LIN|FCO|CIA|NAP)\b/i.test(pickupLocation) ||
          /\b(MXP|LIN|FCO|CIA|NAP)\b/i.test(dropoffLocation);
        
        if (isAirportTransfer && !bookingState.personalDetails.flightNumber) {
          errors.push({ field: 'flightNumber', message: 'Flight number is required for airport transfers' });
        }
        
        // Validate extra stops if any
        if (bookingState.personalDetails.extraStops && bookingState.personalDetails.extraStops.length > 0) {
          bookingState.personalDetails.extraStops.forEach((stop, index) => {
            if (!stop.address) {
              errors.push({ field: `extraStop${index}`, message: `Address for stop ${index + 1} is required` });
            }
          });
        }
        
        // Check if luggage count is valid
        if (bookingState.personalDetails.luggageCount !== undefined) {
          if (bookingState.personalDetails.luggageCount > bookingState.selectedVehicle.suitcases) {
            // This is now just a warning, not a validation error
            console.warn(`Luggage count (${bookingState.personalDetails.luggageCount}) exceeds vehicle capacity (${bookingState.selectedVehicle.suitcases})`);
          }
        }
        
        break;
      
      case 3: // Payment details step
        // No validation needed for payment method selection as there's always a default
        // Any card validation will be handled by Stripe
        
        // Check if we have all the necessary details from previous steps
        if (!bookingState.selectedVehicle) {
          errors.push({ field: 'vehicle', message: 'Vehicle selection is missing' });
        }
        
        if (!bookingState.personalDetails.firstName || !bookingState.personalDetails.lastName) {
          errors.push({ field: 'personalDetails', message: 'Personal details are incomplete' });
        }
        
        if (!bookingState.personalDetails.email) {
          errors.push({ field: 'email', message: 'Email is required' });
        }
        
        break;
    }

    // Update the validation errors in the state
    setBookingState(prev => ({
      ...prev,
      validationErrors: errors
    }));

    return errors;
  };

  // Function to attempt proceeding to the next step, with validation
  const proceedToNextStep = (): boolean => {
    const currentStep = bookingState.step;
    const errors = validateStep(currentStep);

    if (errors.length > 0) {
      // Cannot proceed if there are validation errors
      console.log(`Cannot proceed to step ${currentStep + 1} due to validation errors:`, errors);
      return false;
    }

    // All validation passed, proceed to next step
    const nextStep = (currentStep + 1) as 1 | 2 | 3;
    if (nextStep <= 3) {
      setBookingState(prev => ({
        ...prev,
        step: nextStep,
        validationErrors: [] // Clear validation errors
      }));
      return true;
    }

    return false;
  };

  // Function to scroll to an error field
  const scrollToError = (fieldId: string) => {
    const element = document.getElementById(fieldId);
    if (element) {
      // Calculate the position to scroll to
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementTop = rect.top + scrollTop;
      
      // Scroll with offset to account for the fixed header
      window.scrollTo({
        top: elementTop - 120, // 120px offset to account for header and padding
        behavior: 'smooth'
      });
      
      // Focus the element after scrolling
      setTimeout(() => {
        element.focus();
      }, 500);
    }
  };

  return (
    <BookingContext.Provider value={{ 
      bookingState, 
      setBookingState,
      clearBookingState,
      validateStep,
      proceedToNextStep,
      scrollToError,
      fetchPricingData
    }}>
      {children}
    </BookingContext.Provider>
  );
};