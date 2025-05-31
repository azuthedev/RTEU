import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBooking } from '../../contexts/BookingContext';
import { vehicles } from '../../data/vehicles';
import VehicleCard from './VehicleCard';
import VehicleModal from './VehicleModal';
import { useAnalytics } from '../../hooks/useAnalytics';

interface VehicleSelectionProps {
  isLoading?: boolean;
}

const VehicleSelection: React.FC<VehicleSelectionProps> = ({ isLoading = false }) => {
  const { bookingState, setBookingState } = useBooking();
  const { trackEvent } = useAnalytics();
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<(typeof vehicles)[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingVehicleId, setLoadingVehicleId] = useState<string | null>(null);

  // Handle vehicle selection
  const selectVehicle = (vehicle: typeof vehicles[0]) => {
    setBookingState(prev => ({
      ...prev,
      selectedVehicle: vehicle
    }));

    // If there's a pricingResponse with multiple price options
    if (bookingState.pricingResponse?.prices) {
      // Find the price for this vehicle category
      const selectedPrice = bookingState.pricingResponse.prices.find(
        p => p.category === vehicle.id
      );

      if (selectedPrice) {
        // Update the selected_category in the pricing response
        setBookingState(prev => ({
          ...prev,
          pricingResponse: {
            ...prev.pricingResponse!,
            selected_category: vehicle.id
          }
        }));
      }
    }
  };

  // Get the price for a vehicle from pricing response
  const getVehiclePrice = useCallback((vehicleId: string) => {
    if (!bookingState.pricingResponse?.prices) {
      return null;
    }

    const priceData = bookingState.pricingResponse.prices.find(
      p => p.category === vehicleId
    );

    return priceData ? priceData.price : null;
  }, [bookingState.pricingResponse]);

  // Handle continue to next step
  const handleContinue = () => {
    trackEvent('Booking', 'Vehicle Selected', bookingState.selectedVehicle.id);
    setBookingState(prev => ({ ...prev, step: 2 }));
  };

  // Show details modal for a vehicle
  const showVehicleDetails = (vehicle: typeof vehicles[0]) => {
    setSelectedVehicleForModal(vehicle);
    setShowModal(true);
    trackEvent('Booking', 'View Vehicle Details', vehicle.name);
  };

  // When component mounts, make sure the selected vehicle exists
  useEffect(() => {
    // If we have no selected vehicle, set the first one
    if (!bookingState.selectedVehicle) {
      setBookingState(prev => ({
        ...prev,
        selectedVehicle: vehicles[0]
      }));
    }
    
    // Check if the selected vehicle is a valid object with all properties
    if (bookingState.selectedVehicle && !bookingState.selectedVehicle.id) {
      // Find the vehicle by ID if available
      const vehicleId = typeof bookingState.selectedVehicle === 'string' ? 
                        bookingState.selectedVehicle : 
                        bookingState.selectedVehicle?.id;
      
      if (vehicleId) {
        const validVehicle = vehicles.find(v => v.id === vehicleId) || vehicles[0];
        setBookingState(prev => ({
          ...prev,
          selectedVehicle: validVehicle
        }));
      } else {
        // Fall back to first vehicle
        setBookingState(prev => ({
          ...prev,
          selectedVehicle: vehicles[0]
        }));
      }
    }
  }, []);

  // If still loading prices, show loading state
  if (isLoading) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Select Your Vehicle</h1>
            <p className="text-gray-600">Fetching the best prices for your journey...</p>
          </div>
          
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-lg text-gray-700">Loading vehicle options...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Your Vehicle</h1>
          <p className="text-gray-600">
            Choose the perfect vehicle for your journey from {bookingState.fromDisplay || bookingState.from} to {bookingState.toDisplay || bookingState.to}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {vehicles.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={bookingState.selectedVehicle?.id === vehicle.id}
              onSelect={() => selectVehicle(vehicle)}
              onViewDetails={() => showVehicleDetails(vehicle)}
              price={getVehiclePrice(vehicle.id)}
              isLoading={loadingVehicleId === vehicle.id}
            />
          ))}
        </div>
        
        <div className="flex justify-center mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="bg-blue-600 text-white px-8 py-3 rounded-md flex items-center hover:bg-blue-700 transition-colors"
          >
            Continue with {bookingState.selectedVehicle?.name || 'selected vehicle'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Vehicle Details Modal */}
      {selectedVehicleForModal && (
        <VehicleModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          vehicle={selectedVehicleForModal}
          price={getVehiclePrice(selectedVehicleForModal.id)}
          onSelect={() => {
            selectVehicle(selectedVehicleForModal);
            setShowModal(false);
          }}
          isSelected={bookingState.selectedVehicle?.id === selectedVehicleForModal.id}
        />
      )}
    </div>
  );
};

export default VehicleSelection;