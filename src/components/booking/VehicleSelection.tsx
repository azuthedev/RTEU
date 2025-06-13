import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useBooking } from '../../contexts/BookingContext';
import BookingLayout from './BookingLayout';
import VehicleCard from './VehicleCard';
import VehicleModal from './VehicleModal';
import { vehicles } from '../../data/vehicles';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../ui/use-toast';

// Define vehicle categories
const vehicleCategories = [
  { 
    id: 'sedan', 
    name: 'Sedan',
    color: 'bg-blue-50'
  },
  { 
    id: 'minivan', 
    name: 'Minivan',
    color: 'bg-green-50'
  },
  { 
    id: 'sprinter', 
    name: 'Sprinter',
    color: 'bg-gray-50'
  },
  { 
    id: 'bus', 
    name: 'Coach',
    color: 'bg-amber-50'
  }
];

// Map vehicles to their categories
const categorizeVehicles = () => {
  const map = {
    sedan: vehicles.filter(v => 
      v.id.includes('sedan') || 
      ['economy-sedan', 'premium-sedan', 'vip-sedan'].includes(v.id)
    ),
    minivan: vehicles.filter(v => 
      v.id.includes('minivan') || 
      ['standard-minivan', 'xl-minivan', 'premium-minivan', 'vip-minivan'].includes(v.id)
    ),
    sprinter: vehicles.filter(v => 
      v.id.includes('sprinter') || 
      ['sprinter-8', 'sprinter-16', 'sprinter-21'].includes(v.id)
    ),
    bus: vehicles.filter(v => 
      v.id.includes('bus') || 
      ['bus-51'].includes(v.id)
    )
  };
  
  return map;
};

// Map API category names to our vehicle IDs
const apiCategoryMap: Record<string, string> = {
  'standard_sedan': 'economy-sedan',
  'premium_sedan': 'premium-sedan',
  'vip_sedan': 'vip-sedan',
  'standard_minivan': 'standard-minivan',
  'xl_minivan': 'xl-minivan',
  'vip_minivan': 'vip-minivan',
  'sprinter_8_pax': 'sprinter-8',
  'sprinter_16_pax': 'sprinter-16',
  'sprinter_21_pax': 'sprinter-21',
  'coach_51_pax': 'bus-51'
};

// Reverse mapping - from our vehicle IDs to API category names
const reverseApiCategoryMap: Record<string, string> = {
  'economy-sedan': 'standard_sedan',
  'premium-sedan': 'premium_sedan',
  'vip-sedan': 'vip_sedan',
  'standard-minivan': 'standard_minivan',
  'xl-minivan': 'xl_minivan',
  'vip-minivan': 'vip_minivan',
  'sprinter-8': 'sprinter_8_pax',
  'sprinter-16': 'sprinter_16_pax',
  'sprinter-21': 'sprinter_21_pax',
  'bus-51': 'coach_51_pax'
};

// Function to get user-friendly category name
const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'standard_sedan': 'Standard Sedan',
    'premium_sedan': 'Premium Sedan',
    'vip_sedan': 'VIP Sedan',
    'standard_minivan': 'Standard Minivan',
    'xl_minivan': 'XL Minivan',
    'vip_minivan': 'VIP Minivan',
    'sprinter_8_pax': 'Sprinter (up to 8 Passengers)',
    'sprinter_16_pax': 'Sprinter (up to 16 Passengers)',
    'sprinter_21_pax': 'Sprinter (up to 21 Passengers)',
    'coach_51_pax': 'Bus (up to 51 Passengers)'
  };
  
  return categoryMap[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const VehicleSelection = () => {
  const { bookingState, setBookingState, validateStep } = useBooking();
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [modalVehicle, setModalVehicle] = useState<typeof vehicles[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('sedan');
  const [categorizedVehicles, setCategorizedVehicles] = useState<Record<string, typeof vehicles>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth < 768;
  const itemsPerView = isMobile ? 1 : 3;
  
  // Logging prices from API for debugging
  useEffect(() => {
    if (bookingState.pricingResponse) {
      console.log("API Pricing Response:", bookingState.pricingResponse);
      console.log("Available categories:", bookingState.pricingResponse.prices.map(p => p.category));
    }
  }, [bookingState.pricingResponse]);

  // Set initial categorized vehicles and selected vehicle
  useEffect(() => {
    const vehiclesByCategory = categorizeVehicles();
    setCategorizedVehicles(vehiclesByCategory);
    
    // Apply API prices to all vehicles
    if (bookingState.pricingResponse) {
      applyApiPricesToVehicles(vehiclesByCategory);
    }
    
    // If there's already a selected vehicle in context, use that
    if (bookingState.selectedVehicle) {
      // Check if we have an API price for this vehicle
      if (bookingState.pricingResponse) {
        const apiPrice = getVehiclePrice(bookingState.selectedVehicle.id);
        if (apiPrice !== null) {
          // Use the vehicle with updated price
          setSelectedVehicle({
            ...bookingState.selectedVehicle,
            price: apiPrice
          });
        } else {
          setSelectedVehicle(bookingState.selectedVehicle);
        }
      } else {
        setSelectedVehicle(bookingState.selectedVehicle);
      }
      // Find and set active category based on selected vehicle
      for (const [category, vehicleList] of Object.entries(vehiclesByCategory)) {
        if (vehicleList.some(v => v.id === bookingState.selectedVehicle.id)) {
          setActiveCategory(category);
          break;
        }
      }
    } else if (bookingState.pricingResponse) {
      // Try to find a matching vehicle for each price
      let foundMatch = false;
      
      const firstPrice = bookingState.pricingResponse.prices[0];
      if (firstPrice) {
        const vehicleId = apiCategoryMap[firstPrice.category];
        if (vehicleId) {
          const matchingVehicle = vehicles.find(v => v.id === vehicleId);
          if (matchingVehicle) {
            setSelectedVehicle({
              ...matchingVehicle,
              price: firstPrice.price
            });
            foundMatch = true;
            
            // Set the appropriate category
            for (const [category, vehicleList] of Object.entries(vehiclesByCategory)) {
              if (vehicleList.some(v => v.id === vehicleId)) {
                setActiveCategory(category);
                break;
              }
            }
          }
        }
      }
      
      // If no match found, default to first vehicle
      if (!foundMatch && vehiclesByCategory.sedan && vehiclesByCategory.sedan.length > 0) {
        setSelectedVehicle(vehiclesByCategory.sedan[0]);
      }
    }
  }, [bookingState.selectedVehicle, bookingState.pricingResponse]);

  // Apply API prices to all vehicles
  const applyApiPricesToVehicles = (vehiclesByCategory: Record<string, typeof vehicles>) => {
    if (!bookingState.pricingResponse) return;
    
    console.log("Applying API prices to vehicles");
    
    const updatedVehiclesByCategory: Record<string, typeof vehicles> = {};
    
    // Go through each category and update vehicle prices
    for (const [category, vehicleList] of Object.entries(vehiclesByCategory)) {
      updatedVehiclesByCategory[category] = vehicleList.map(vehicle => {
        const apiPrice = getVehiclePrice(vehicle.id);
        if (apiPrice !== null) {
          console.log(`Updating ${vehicle.id} price from ${vehicle.price} to API price ${apiPrice}`);
          return { ...vehicle, price: apiPrice };
        }
        return vehicle;
      });
    }
    
    setCategorizedVehicles(updatedVehiclesByCategory);
  };

  // Handle modal open state
  const handleOpenModal = (vehicle: typeof vehicles[0]) => {
    // Apply API price if available
    const apiPrice = getVehiclePrice(vehicle.id);
    if (apiPrice !== null) {
      setModalVehicle({
        ...vehicle,
        price: apiPrice
      });
    } else {
      setModalVehicle(vehicle);
    }
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalVehicle(null);
    }, 300); // Wait for animation to complete
  };

  // Navigate carousel
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleCarouselNext = () => {
    const activeVehicles = categorizedVehicles[activeCategory] || [];
    if (currentIndex < activeVehicles.length - itemsPerView) {
      setCurrentIndex(currentIndex + 1);
      scrollToIndex(currentIndex + 1);
    }
  };

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.querySelector('.vehicle-card')?.clientWidth || 0;
      const gap = 16; // Equal to gap-4 class
      carouselRef.current.scrollTo({
        left: index * (cardWidth + gap),
        behavior: 'smooth'
      });
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setCurrentIndex(0);
    
    // Reset carousel scroll position
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }
    
    // Clear any validation error when changing category
    setValidationError(null);
  };

  const handleNext = () => {
    // Validate that a vehicle is selected
    if (!selectedVehicle) {
      setValidationError("Please select a vehicle to continue");
      toast({
        title: "Vehicle Selection Required",
        description: "Please select a vehicle to continue",
        variant: "destructive"
      });
      return;
    }
    
    // Validate other required data for this step
    const errors = validateStep(1);
    if (errors.length > 0) {
      setValidationError(errors[0].message);
      toast({
        title: "Required Information Missing",
        description: errors[0].message,
        variant: "destructive"
      });
      return;
    }

    // Update selected vehicle in context with current API price
    const apiPrice = getVehiclePrice(selectedVehicle.id);
    const vehicleWithPrice = apiPrice !== null ? 
      { ...selectedVehicle, price: apiPrice } : 
      selectedVehicle;
    
    setBookingState(prev => ({
      ...prev,
      step: 2,
      selectedVehicle: vehicleWithPrice,
      validationErrors: [] // Clear validation errors
    }));
  };

  // Handle snap scrolling on touch end
  const handleTouchEnd = () => {
    if (!carouselRef.current) return;
    
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = carouselRef.current.querySelector('.vehicle-card')?.clientWidth || 0;
    const gap = 16; // Equal to gap-4 class
    // Calculate the closest card index to snap to
    const cardIndex = Math.round(scrollLeft / (cardWidth + gap));
    setCurrentIndex(cardIndex);
    scrollToIndex(cardIndex);
  };

  // Function to get price for a vehicle from pricing response
  const getVehiclePrice = (vehicleId: string): number | null => {
    if (!bookingState.pricingResponse) return null;
    
    // Map vehicle ID to API category
    const apiCategory = reverseApiCategoryMap[vehicleId];
    if (!apiCategory) {
      console.warn(`No API category mapping found for vehicle ID: ${vehicleId}`);
      return null;
    }
    
    const priceInfo = bookingState.pricingResponse.prices.find(p => p.category === apiCategory);
    if (priceInfo) {
      console.log(`Found price for ${vehicleId} (${apiCategory}): ${priceInfo.price}`);
      return priceInfo.price;
    } else {
      console.warn(`No price found for category ${apiCategory}`);
      return null;
    }
  };

  // Get current vehicle price (API price or default)
  const getCurrentVehiclePrice = () => {
    if (!selectedVehicle) return 0;
    const apiPrice = getVehiclePrice(selectedVehicle.id);
    return apiPrice !== null ? apiPrice : selectedVehicle.price;
  };

  // Calculate active vehicles
  const activeVehicles = categorizedVehicles[activeCategory] || [];
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < activeVehicles.length - itemsPerView;

  return (
    <BookingLayout
      currentStep={1}
      totalPrice={getCurrentVehiclePrice()}
      onNext={handleNext}
      nextButtonText="Next: Personal Details"
      modalOpen={isModalOpen}
      validateBeforeNext={false} // We'll handle validation ourselves
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl mb-8">Choose Your Vehicle</h1>
        
        {/* Validation error alert */}
        {validationError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
        
        {/* Category Tabs - UPDATED TO TEXT-ONLY BUTTONS */}
        <div className="mb-8 sticky top-0 z-10 bg-white py-4 -mt-4 shadow-sm">
          <div className="flex justify-center md:justify-start gap-2 overflow-x-auto py-2 px-1">
            {vehicleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeCategory === category.id 
                    ? `bg-blue-600 text-white shadow-sm`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-selected={activeCategory === category.id}
                id={`category-tab-${category.id}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Category Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl" id="vehicle-category-heading">
            {vehicleCategories.find(c => c.id === activeCategory)?.name} Options
          </h2>
          <div className="flex items-center">
            <button
              onClick={handlePrevious}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full ${
                canScrollLeft ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
              }`}
              aria-label="View previous vehicles"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleCarouselNext}
              disabled={!canScrollRight}
              className={`p-2 rounded-full ${
                canScrollRight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
              }`}
              aria-label="View more vehicles"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Vehicles Carousel */}
        <div className="relative overflow-hidden p-2" aria-labelledby="vehicle-category-heading">
          <div 
            ref={carouselRef}
            className="flex space-x-4 overflow-x-auto snap-x scroll-smooth scrollbar-hide pb-6"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              scrollSnapType: 'x mandatory' 
            }}
            onTouchEnd={handleTouchEnd}
            onScroll={() => {
              // Update current index based on scroll position for better UX
              if (carouselRef.current) {
                const scrollLeft = carouselRef.current.scrollLeft;
                const cardWidth = carouselRef.current.querySelector('.vehicle-card')?.clientWidth || 0;
                const gap = 16; // Equal to gap-4 class
                const approxIndex = Math.round(scrollLeft / (cardWidth + gap));
                if (approxIndex !== currentIndex) {
                  setCurrentIndex(approxIndex);
                }
              }
            }}
            role="list"
          >
            {activeVehicles.length > 0 ? (
              activeVehicles.map((vehicle) => {
                // Get API price if available
                const apiPrice = getVehiclePrice(vehicle.id);
                const finalPrice = apiPrice !== null ? apiPrice : vehicle.price;
                
                // Create a vehicle copy with updated price if needed
                const vehicleWithPrice = apiPrice !== null ? {...vehicle, price: apiPrice} : vehicle;
                
                return (
                  <div 
                    key={vehicle.id}
                    className="vehicle-card flex-shrink-0 w-full md:w-[calc(33.333%-16px)] snap-center p-2"
                    style={{ scrollSnapAlign: 'center' }}
                    role="listitem"
                  >
                    <VehicleCard
                      {...vehicleWithPrice}
                      isSelected={selectedVehicle.id === vehicle.id}
                      onSelect={() => {
                        setSelectedVehicle(vehicleWithPrice);
                        setValidationError(null); // Clear validation error when a vehicle is selected
                      }}
                      onLearnMore={() => handleOpenModal(vehicleWithPrice)}
                      aria-label={`${vehicle.name} - €${finalPrice} - ${vehicle.seats} passengers`}
                      id={`vehicle-${vehicle.id}`}
                    />
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center py-12 text-gray-500">
                No vehicles available in this category.
              </div>
            )}
          </div>
          
          {/* Mobile Navigation Indicators */}
          <div className="flex justify-center mt-4 md:hidden">
            {activeVehicles.map((_, index) => (
              <button
                key={index}
                className={`h-2 w-2 rounded-full mx-1 ${
                  index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => {
                  setCurrentIndex(index);
                  scrollToIndex(index);
                }}
                aria-label={`View vehicle ${index + 1}`}
              />
            ))}
          </div>
          {/* Desktop Navigation Arrows */}
          <div className="hidden md:block">
            {canScrollLeft && (
              <button
                onClick={handlePrevious}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg p-2 z-10 hover:bg-gray-50"
                aria-label="View previous vehicles"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={handleCarouselNext}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg p-2 z-10 hover:bg-gray-50"
                aria-label="View more vehicles"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </button>
            )}
          </div>
        </div>
        
        {/* Pricing information from API */}
        {bookingState.pricingResponse && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 font-medium mb-2">
              Live pricing based on your route:
            </p>
            <p className="text-sm text-gray-600">
              {bookingState.fromDisplay || bookingState.from} → {bookingState.toDisplay || bookingState.to}
            </p>
          </div>
        )}
      </div>
      {/* Vehicle Detail Modal */}
      {modalVehicle && (
        <VehicleModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSelect={() => {
            // Use API price if available
            const apiPrice = getVehiclePrice(modalVehicle.id);
            const vehicleWithPrice = apiPrice !== null ? 
              {...modalVehicle, price: apiPrice} : 
              modalVehicle;
            
            setSelectedVehicle(vehicleWithPrice);
            setValidationError(null); // Clear validation error when a vehicle is selected
          }}
          vehicle={modalVehicle}
          isSelected={selectedVehicle.id === modalVehicle.id}
        />
      )}
    </BookingLayout>
  );
};

export default VehicleSelection;