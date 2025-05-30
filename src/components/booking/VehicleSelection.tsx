import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBooking } from '../../contexts/BookingContext';
import VehicleCard from './VehicleCard';
import ProgressBar from './ProgressBar';
import { vehicles } from '../../data/vehicles';
import { fetchWithCors, getApiUrl } from '../../utils/corsHelper';
import { useAnalytics } from '../../hooks/useAnalytics';

const VehicleSelection = () => {
  const navigate = useNavigate();
  const { bookingState, setBookingState } = useBooking();
  const { trackEvent } = useAnalytics();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // Get pricing on component mount
  useEffect(() => {
    // If we already have pricing data, don't fetch again
    if (bookingState.pricingResponse) {
      setLoading(false);
      setSelectedVehicleId(bookingState.selectedVehicle.id);
      return;
    }

    const fetchPricing = async () => {
      if (!bookingState.from || !bookingState.to) {
        setError('Missing location information. Please go back and try again.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching pricing with params:', {
          from: bookingState.from,
          to: bookingState.to,
          date: bookingState.departureDate,
          isReturn: bookingState.isReturn,
          returnDate: bookingState.returnDate,
          passengers: bookingState.passengers
        });
        
        // This should point to your price API
        const url = getApiUrl('/get-price');
        
        const response = await fetchWithCors(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: bookingState.from,
            to: bookingState.to,
            date: bookingState.departureDate,
            return: bookingState.isReturn,
            return_date: bookingState.returnDate,
            passengers: bookingState.passengers
          })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to get pricing: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('Pricing API response:', data);
        
        // Store pricing response in booking context
        setBookingState(prev => ({
          ...prev,
          pricingResponse: data
        }));
        
        // Set selected vehicle to match the one from pricing if available
        if (data.selected_category) {
          const selectedVehicle = vehicles.find(v => 
            v.id.toLowerCase() === data.selected_category.toLowerCase()
          );
          
          if (selectedVehicle) {
            setBookingState(prev => ({
              ...prev,
              selectedVehicle
            }));
            setSelectedVehicleId(selectedVehicle.id);
          } else {
            setSelectedVehicleId(bookingState.selectedVehicle.id);
          }
        } else {
          setSelectedVehicleId(bookingState.selectedVehicle.id);
        }
        
        // Track successful pricing
        trackEvent('Booking', 'Pricing Fetched', `${bookingState.fromDisplay} to ${bookingState.toDisplay}`);
      } catch (error: any) {
        console.error('Error fetching pricing:', error);
        setError('Unable to load pricing information. Please try again later.');
        
        // Track error
        trackEvent('Error', 'Pricing Fetch Failed', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [bookingState.from, bookingState.to, bookingState.departureDate, bookingState.isReturn, bookingState.returnDate, bookingState.pricingResponse, bookingState.selectedVehicle.id, bookingState.fromDisplay, bookingState.toDisplay, bookingState.passengers, setBookingState, trackEvent]);

  const handleSelectVehicle = (vehicle: typeof vehicles[0]) => {
    // Update selected vehicle in booking state
    setBookingState(prev => ({
      ...prev,
      selectedVehicle: vehicle
    }));
    setSelectedVehicleId(vehicle.id);
  };

  const handleContinue = () => {
    // Proceed to next step
    setBookingState(prev => ({
      ...prev,
      step: 2
    }));
    
    // Track vehicle selection
    trackEvent('Booking', 'Vehicle Selected', bookingState.selectedVehicle.name);
  };

  const getVehiclePrice = (vehicleId: string) => {
    // First try to get price from API response
    if (bookingState.pricingResponse?.prices) {
      const vehiclePrice = bookingState.pricingResponse.prices.find(
        p => p.category.toLowerCase() === vehicleId.toLowerCase()
      );
      
      if (vehiclePrice) {
        return vehiclePrice.price;
      }
    }
    
    // Fallback to hardcoded price from vehicle data
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.price || 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProgressBar currentStep={1} />
      
      <h1 className="text-3xl font-bold mb-6 mt-8 text-center">Select Your Vehicle</h1>
      
      <div className="max-w-3xl mx-auto mb-8">
        <p className="text-center text-gray-600">
          Choose the perfect vehicle for your journey from {bookingState.fromDisplay} to {bookingState.toDisplay}.
          Our fleet ranges from standard sedans to luxury minivans.
        </p>
      </div>
      
      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          <p className="font-medium">{error}</p>
          <p className="mt-2">Please try refreshing the page or start a new booking.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {vehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isSelected={selectedVehicleId === vehicle.id}
                onSelect={() => handleSelectVehicle(vehicle)}
                price={getVehiclePrice(vehicle.id)}
              />
            ))}
          </div>
          
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-blue-600 text-white px-8 py-3 rounded-md font-bold shadow-md hover:bg-blue-700 transition-colors"
              onClick={handleContinue}
            >
              Continue to Personal Details
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};

export default VehicleSelection;