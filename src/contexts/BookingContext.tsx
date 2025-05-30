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

interface BookingState {
  step: 1 | 2 | 3;
  previousStep?: 1 | 2 | 3; // Added to track previous step for animations
  selectedVehicle: typeof vehicles[0];
  from?: string;
  to?: string;
  fromDisplay?: string; // Store the display name for from location
  toDisplay?: string;   // Store the display name for to location
  isReturn?: boolean;
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
  };
  paymentDetails: {
    method: 'card' | 'cash';
    cardNumber?: string;
    expiryDate?: string;
    cvc?: string;
    discountCode?: string;
  };
  pricingResponse?: PricingResponse; // Store pricing data from API
}

interface BookingContextType {
  bookingState: BookingState;
  setBookingState: React.Dispatch<React.SetStateAction<BookingState>>;
  clearBookingState: () => void;
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

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with default state or loaded state from sessionStorage
  const [bookingState, setBookingState] = useState<BookingState>(() => {
    const savedState = loadBookingState();
    
    // Return saved state if available, otherwise use default state
    return savedState || {
      step: 1,
      selectedVehicle: vehicles[0],
      personalDetails: {
        title: 'mr',
        firstName: '',
        lastName: '',
        email: '',
        country: '',
        phone: '',
        selectedExtras: new Set()
      },
      paymentDetails: {
        method: 'card'
      }
    };
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
      toDisplay: bookingState.toDisplay
    });
  }, [bookingState.from, bookingState.to, bookingState.fromDisplay, bookingState.toDisplay]);

  // Function to clear booking state
  const clearBookingState = () => {
    sessionStorage.removeItem(BOOKING_STORAGE_KEY);
    setBookingState({
      step: 1,
      selectedVehicle: vehicles[0],
      personalDetails: {
        title: 'mr',
        firstName: '',
        lastName: '',
        email: '',
        country: '',
        phone: '',
        selectedExtras: new Set()
      },
      paymentDetails: {
        method: 'card'
      }
    });
  };

  return (
    <BookingContext.Provider value={{ 
      bookingState, 
      setBookingState,
      clearBookingState
    }}>
      {children}
    </BookingContext.Provider>
  );
};