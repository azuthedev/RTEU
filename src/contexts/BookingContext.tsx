import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { vehicles } from '../data/vehicles';

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
}

interface BookingContextType {
  bookingState: BookingState;
  setBookingState: React.Dispatch<React.SetStateAction<BookingState>>;
  clearBookingState: () => void;
  validateStep: (step: number) => ValidationError[];
  proceedToNextStep: () => boolean;
  scrollToError: (fieldId: string) => void;
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

// Get default booking state
const getDefaultBookingState = (): BookingState => ({
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
  pricingError: null, // Initialize with null
  validationErrors: []
});

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with default state or loaded state from sessionStorage
  const [bookingState, setBookingState] = useState<BookingState>(() => {
    const savedState = loadBookingState();
    
    // Return saved state if available, otherwise use default state
    return savedState || getDefaultBookingState();
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
      pricingData: bookingState.pricingResponse ? 'Available' : 'None',
      pricingError: bookingState.pricingError
    });
  }, [bookingState.from, bookingState.to, bookingState.fromDisplay, bookingState.toDisplay, 
      bookingState.pickupDateTime, bookingState.dropoffDateTime, 
      bookingState.pricingResponse, bookingState.pricingError]);

  // Function to clear booking state
  const clearBookingState = () => {
    console.log("Clearing booking state");
    sessionStorage.removeItem(BOOKING_STORAGE_KEY);
    setBookingState(getDefaultBookingState());
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
      scrollToError
    }}>
      {children}
    </BookingContext.Provider>
  );
};