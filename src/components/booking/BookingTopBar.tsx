import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useBooking } from '../../contexts/BookingContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BookingTopBarProps {
  className?: string;
}

const BookingTopBar: React.FC<BookingTopBarProps> = ({ className = '' }) => {
  const { bookingState } = useBooking();
  const navigate = useNavigate();

  // Extract booking details from context
  const { 
    fromDisplay, 
    toDisplay, 
    departureDate, 
    isReturn, 
    returnDate, 
    passengers,
    pricingResponse 
  } = bookingState;

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Get selected vehicle price
  const getVehiclePrice = () => {
    // First check if we have pricing from the API
    if (pricingResponse?.prices && pricingResponse.prices.length > 0) {
      // Find the price for the selected vehicle or return the first price
      const selectedVehiclePrice = pricingResponse.prices.find(
        p => p.category.toLowerCase() === bookingState.selectedVehicle.id.toLowerCase()
      );
      
      if (selectedVehiclePrice) {
        return `€${selectedVehiclePrice.price.toFixed(2)}`;
      }
      
      // If no match found, return the first price
      return `€${pricingResponse.prices[0].price.toFixed(2)}`;
    }
    
    // Fallback to the hardcoded price from vehicle data
    return `€${bookingState.selectedVehicle.price.toFixed(2)}`;
  };

  // Check if we have sufficient information to display the booking details
  const hasBookingDetails = fromDisplay && toDisplay && departureDate;

  // Navigate to home page if no booking details are available
  useEffect(() => {
    if (!hasBookingDetails && !window.location.pathname.includes('/home/transfer/')) {
      navigate('/');
    }
  }, [hasBookingDetails, navigate]);

  if (!hasBookingDetails) return null;

  return (
    <div 
      className={`bg-white shadow-md border-b border-gray-200 py-4 px-4 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center mb-3 sm:mb-0">
            <div className="text-gray-800 font-medium">
              <span>{fromDisplay}</span>
              <ArrowRight className="inline mx-2 h-4 w-4" />
              <span>{toDisplay}</span>
            </div>
            <div className="text-gray-600 text-sm mt-1 sm:mt-0 sm:ml-4">
              {formatDate(departureDate)}
              {isReturn && returnDate && (
                <>
                  <span className="mx-2">•</span>
                  <span>Return: {formatDate(returnDate)}</span>
                </>
              )}
              {passengers && (
                <>
                  <span className="mx-2">•</span>
                  <span>{passengers} {passengers === 1 ? 'Passenger' : 'Passengers'}</span>
                </>
              )}
            </div>
          </div>
          <div className="font-bold text-lg text-blue-600">
            {getVehiclePrice()}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingTopBar;