import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooking } from '../contexts/BookingContext';
import VehicleSelection from '../components/booking/VehicleSelection';
import PersonalDetails from '../components/booking/PersonalDetails';
import PaymentDetails from '../components/booking/PaymentDetails';

const BookingFlow = () => {
  const { from, to, type, date, returnDate, passengers } = useParams();
  const { bookingState, setBookingState } = useBooking();
  const navigate = useNavigate();

  // Initialize booking state from URL parameters
  useEffect(() => {
    if (from && to && date) {
      // Decode the URL parameters (but preserve case)
      const fromDecoded = decodeURIComponent(from.replace(/-/g, ' '));
      const toDecoded = decodeURIComponent(to.replace(/-/g, ' '));
      
      // Update the booking state with both URL values and display values
      setBookingState(prev => {
        // This is critical: we need to decide what to use as display values
        // 1. If we already have display values in the context, keep them
        // 2. Otherwise, use the decoded but preserved-case values from URL
        const fromDisplayValue = prev.fromDisplay || fromDecoded;
        const toDisplayValue = prev.toDisplay || toDecoded;
        
        console.log("BookingFlow initializing with display values:", {
          fromDisplay: fromDisplayValue,
          toDisplay: toDisplayValue,
          from: fromDecoded,
          to: toDecoded
        });
        
        return {
          ...prev,
          from: fromDecoded,
          to: toDecoded,
          // Always preserve display values if they exist
          fromDisplay: fromDisplayValue,
          toDisplay: toDisplayValue,
          isReturn: type === '2',
          departureDate: date,
          returnDate: returnDate !== '0' ? returnDate : undefined,
          passengers: parseInt(passengers || '1', 10)
        };
      });
    }
  }, [from, to, type, date, returnDate, passengers, setBookingState]);

  // Handle missing parameters
  useEffect(() => {
    if (!from || !to || !date) {
      navigate('/');
    }
  }, [from, to, date, navigate]);

  // Render the appropriate step based on context state
  const renderStep = () => {
    switch (bookingState.step) {
      case 1:
        return <VehicleSelection />;
      case 2:
        return <PersonalDetails />;
      case 3:
        return <PaymentDetails />;
      default:
        return <VehicleSelection />;
    }
  };

  return <div id="booking-flow-container">{renderStep()}</div>;
};

export default BookingFlow;