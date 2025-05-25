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
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookingState, setBookingState] = useState<BookingState>({
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

  // Track previous step for animation purposes
  const previousStepRef = useRef<1 | 2 | 3>(1);
  
  useEffect(() => {
    // When step changes, update the previousStep value
    if (bookingState.step !== previousStepRef.current) {
      setBookingState(prev => ({
        ...prev,
        previousStep: previousStepRef.current
      }));
      previousStepRef.current = bookingState.step;
    }
  }, [bookingState.step]);

  // Log state changes for debugging
  useEffect(() => {
    console.log("BookingContext location data updated:", {
      from: bookingState.from,
      fromDisplay: bookingState.fromDisplay,
      to: bookingState.to, 
      toDisplay: bookingState.toDisplay
    });
  }, [bookingState.from, bookingState.to, bookingState.fromDisplay, bookingState.toDisplay]);

  return (
    <BookingContext.Provider value={{ bookingState, setBookingState }}>
      {children}
    </BookingContext.Provider>
  );
};