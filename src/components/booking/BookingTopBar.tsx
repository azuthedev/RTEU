import React, { useState, useEffect } from 'react';
import { ArrowRight, Calendar, Users, RotateCcw, Info, MapPin, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBooking } from '../../contexts/BookingContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { format } from 'date-fns';

const BookingTopBar = () => {
  const { bookingState } = useBooking();
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const [stickyShadow, setStickyShadow] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Get the selected vehicle price from pricing response
  const getSelectedPrice = () => {
    if (!bookingState.pricingResponse?.prices) {
      // If no pricing response, use the vehicle's default price
      return bookingState.selectedVehicle?.price || 0;
    }
    
    const selectedCategory = bookingState.pricingResponse.selected_category || 
                            bookingState.selectedVehicle?.id;
    
    const priceData = bookingState.pricingResponse.prices.find(
      p => p.category === selectedCategory
    );
    
    return priceData ? priceData.price : bookingState.selectedVehicle?.price || 0;
  };

  // Listen for scroll to add shadow when sticky
  useEffect(() => {
    const handleScroll = () => {
      setStickyShadow(window.scrollY > 0);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateStr;
    }
  };
  
  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2
    }).format(price);
  };
  
  // Calculate total price based on return trip or one way
  const getTotalPrice = () => {
    const basePrice = getSelectedPrice();
    
    // Apply return multiplier if it's a return trip
    return bookingState.isReturn ? basePrice * 2 : basePrice;
  };

  // Go back to homepage
  const handleGoBack = () => {
    trackEvent('Navigation', 'Cancel Booking', 'From TopBar');
    navigate('/');
  };
  
  // Animation variants for the progress indicator
  const progressVariants = {
    active: {
      backgroundColor: '#1d4ed8',
      color: 'white',
      scale: 1.1
    },
    inactive: {
      backgroundColor: '#E5E7EB',
      color: '#6B7280',
      scale: 1
    },
    completed: {
      backgroundColor: '#10B981',
      color: 'white',
      scale: 1
    }
  };

  return (
    <div 
      className={`sticky top-0 z-40 bg-white ${
        stickyShadow ? 'shadow-md' : 'shadow-sm'
      } transition-shadow duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between">
          {/* Left: Journey Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 sm:mb-0 flex-1">
            <div className="flex items-center text-gray-500 mr-4 mb-2 sm:mb-0">
              <MapPin className="h-5 w-5 mr-1" />
              <span className="text-sm sm:text-base font-medium line-clamp-1">
                {bookingState.fromDisplay || bookingState.from}
              </span>
              <ArrowRight className="h-4 w-4 mx-1" />
              <span className="text-sm sm:text-base font-medium line-clamp-1">
                {bookingState.toDisplay || bookingState.to}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center text-gray-500">
              <div className="flex items-center mr-3 mb-1 sm:mb-0">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-xs sm:text-sm">{formatDate(bookingState.departureDate)}</span>
              </div>
              
              {bookingState.isReturn && bookingState.returnDate && (
                <div className="flex items-center mr-3 mb-1 sm:mb-0">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  <span className="text-xs sm:text-sm">{formatDate(bookingState.returnDate)}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span className="text-xs sm:text-sm">{bookingState.passengers || 1} passengers</span>
              </div>
            </div>
          </div>
          
          {/* Right: Price & Steps */}
          <div className="flex items-center">
            {/* Price */}
            <div className="mr-6 relative">
              <div 
                className="flex flex-col items-end"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <div className="flex items-center">
                  <span className="text-xl font-bold text-blue-600">
                    {formatPrice(getTotalPrice())}
                  </span>
                  <Info className="h-4 w-4 text-gray-400 ml-1 cursor-pointer" />
                </div>
                <span className="text-xs text-gray-500">
                  {bookingState.isReturn ? 'Round trip' : 'One way'}
                </span>
              </div>
              
              {/* Price details tooltip */}
              {showTooltip && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-10 text-sm">
                  <h3 className="font-semibold text-gray-700 mb-2">Price Breakdown</h3>
                  <div className="flex justify-between mb-2">
                    <span>{bookingState.selectedVehicle?.name}</span>
                    <span>{formatPrice(getSelectedPrice())}</span>
                  </div>
                  
                  {bookingState.isReturn && (
                    <div className="flex justify-between mb-2">
                      <span>Return journey</span>
                      <span>{formatPrice(getSelectedPrice())}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(getTotalPrice())}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Progress steps */}
            <div className="hidden sm:flex items-center space-x-2 mr-2">
              {[1, 2, 3].map(step => (
                <motion.div
                  key={step}
                  initial={step <= bookingState.step ? "active" : "inactive"}
                  animate={
                    step < bookingState.step 
                      ? "completed" 
                      : step === bookingState.step 
                        ? "active" 
                        : "inactive"
                  }
                  variants={progressVariants}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                  transition={{ duration: 0.2 }}
                >
                  {step < bookingState.step ? <Check className="h-4 w-4" /> : step}
                </motion.div>
              ))}
            </div>
            
            {/* Cancel button */}
            <button
              onClick={handleGoBack}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingTopBar;