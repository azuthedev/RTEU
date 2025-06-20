import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Loader2, Users } from 'lucide-react';
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
      ['xl-minivan', 'premium-minivan', 'vip-minivan'].includes(v.id)
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
  
  // Initialize with previously selected vehicle if available, otherwise use default
  const [selectedVehicle, setSelectedVehicle] = useState(() => 
    bookingState.selectedVehicle || vehicles[0]
  );
  
  const [modalVehicle, setModalVehicle] = useState<typeof vehicles[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Set initial category based on selected vehicle if exists
  const getInitialCategory = (): string => {
    if (!bookingState.selectedVehicle) return 'sedan';
    
    // Find which category the selected vehicle belongs to
    for (const category of Object.keys(categorizeVehicles())) {
      const vehiclesInCategory = categorizeVehicles()[category];
      if (vehiclesInCategory.some(v => v.id === bookingState.selectedVehicle?.id)) {
        return category;
      }
    }
    return 'sedan'; // Default fallback
  };
  
  const [activeCategory, setActiveCategory] = useState(getInitialCategory());
  const [categorizedVehicles, setCategorizedVehicles] = useState<Record<string, typeof vehicles>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [preSelectionMessage, setPreSelectionMessage] = useState<string | null>(null);
  
  const carouselRef = useRef<HTMLDivElement>(null);
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth < 768;
  const itemsPerView = isMobile ? 1 : 3;
  const initializeAttemptRef = useRef(false);
  
  // Get passenger count from booking state
  const passengerCount = bookingState.passengers || 1;
  
  // Logging prices from API for debugging
  useEffect(() => {
    console.log("Booking state updated:", { 
      hasPricingResponse: !!bookingState.pricingResponse,
      pricingError: bookingState.pricingError,
      isPricingLoading: bookingState.isPricingLoading,
      passengerCount: bookingState.passengers
    });
    
    if (bookingState.pricingResponse) {
      console.log("API Pricing Response:", bookingState.pricingResponse);
      console.log("Available categories:", bookingState.pricingResponse.prices.map(p => p.category));
    }
    
    // Check if there's a pricing error to display
    if (bookingState.pricingError) {
      console.error("Pricing Error:", bookingState.pricingError);
      setValidationError(`Pricing Error: ${bookingState.pricingError}`);
    }
  }, [bookingState.pricingResponse, bookingState.pricingError, bookingState.isPricingLoading, bookingState.passengers]);

  // Set initial categorized vehicles
  useEffect(() => {
    // Make sure we only run initialization once
    if (initializeAttemptRef.current) return;
    
    console.log("🔄 Starting initial vehicle categorization");
    initializeAttemptRef.current = true;
    
    // Get base vehicle categories
    const vehiclesByCategory = categorizeVehicles();
    setCategorizedVehicles(vehiclesByCategory);
    
    // Initialize with first vehicle as default if no selection in state
    if (!selectedVehicle && vehiclesByCategory.sedan && vehiclesByCategory.sedan.length > 0) {
      setSelectedVehicle(vehiclesByCategory.sedan[0]);
    }
    
    // If we have an existing selected vehicle in context, use that
    if (bookingState.selectedVehicle) {
      setSelectedVehicle(bookingState.selectedVehicle);
      
      // Find and set active category based on selected vehicle
      for (const [category, vehicleList] of Object.entries(vehiclesByCategory)) {
        if (vehicleList.some(v => v.id === bookingState.selectedVehicle?.id)) {
          setActiveCategory(category);
          break;
        }
      }
    }
    
    console.log("🔄 Initial categorization complete");
  }, [bookingState.selectedVehicle, selectedVehicle]);

  // Ensure category tabs are scrolled to show active category
  useEffect(() => {
    // Wait for the DOM to be fully rendered
    setTimeout(() => {
      if (categoryTabsRef.current) {
        // Reset scroll position to 0 (left edge) when component mounts
        categoryTabsRef.current.scrollLeft = 0;
      }
    }, 100);
  }, []);

  // Apply API prices to vehicles when we have pricing data
  useEffect(() => {
    // Show loading if we're waiting for essential context data
    const isWaitingForData = bookingState.isPricingLoading || 
      (!bookingState.fromDisplay && !bookingState.from) || 
      (!bookingState.toDisplay && !bookingState.to) ||
      !bookingState.pickupDateTime;
      
    if (isWaitingForData) {
      return;
    }
    
    // Skip if we have a pricing error
    if (bookingState.pricingError) {
      return;
    }
    
    // Skip if we don't have pricing data yet
    if (!bookingState.pricingResponse) {
      console.log("Waiting for pricing data...");
      return;
    }
    
    console.log("🔄 Applying API prices to vehicles");
    
    // Get base vehicle categories
    const vehiclesByCategory = categorizeVehicles();
    
    // Apply API prices to all vehicles
    const updatedVehiclesByCategory: Record<string, typeof vehicles> = {};
    
    // Check if pricing data is valid
    if (!bookingState.pricingResponse.prices || bookingState.pricingResponse.prices.length === 0) {
      console.warn("⚠️ API response has no valid prices");
      return;
    }
    
    // Log available API categories
    const availableCategories = bookingState.pricingResponse.prices.map(p => p.category);
    console.log("Available API categories:", availableCategories);
    
    // Apply prices to each vehicle by category
    for (const [category, vehicleList] of Object.entries(vehiclesByCategory)) {
      updatedVehiclesByCategory[category] = vehicleList.map(vehicle => {
        // Map our vehicle ID to API category
        const apiCategory = reverseApiCategoryMap[vehicle.id];
        
        // If we don't have a mapping, keep the vehicle as is
        if (!apiCategory) {
          console.log(`⚠️ No API mapping for vehicle ${vehicle.id}`);
          return vehicle;
        }
        
        // Find price info for this category in API response
        const priceInfo = bookingState.pricingResponse?.prices.find(p => p.category === apiCategory);
        
        if (priceInfo) {
          // Found a price - update the vehicle
          console.log(`✅ Found price for ${vehicle.id} (${apiCategory}): ${priceInfo.price}`);
          return { ...vehicle, price: priceInfo.price };
        } else {
          // No price found - mark as unavailable
          console.log(`❌ No price found for ${vehicle.id} (${apiCategory})`);
          return { ...vehicle, price: 0 }; // Use 0 to indicate unavailable
        }
      });
    }
    
    // Update categorized vehicles with API prices
    setCategorizedVehicles(updatedVehiclesByCategory);
    
    // For 4+ passengers, default to XL minivan if available
    const defaultToMinivan = passengerCount >= 4;
    let minivansAvailable = false;
    
    // Check if there are any minivans available
    const minivans = updatedVehiclesByCategory['minivan'] || [];
    const xlMinivan = minivans.find(v => v.id === 'xl-minivan' && v.price > 0);
    if (xlMinivan) {
      minivansAvailable = true;
    }
    
    if (defaultToMinivan && minivansAvailable && xlMinivan) {
      console.log(`✅ Setting XL minivan as default for ${passengerCount} passengers`);
      setSelectedVehicle(xlMinivan);
      setActiveCategory('minivan');
      
      // Set the preselection message
      setPreSelectionMessage(
        `You've entered ${passengerCount} passengers. Need a smaller car? Lower the passenger count and book separate rides.`
      );
    } else {
      // Get the recommended category from the API response
      const recommendedCategory = bookingState.pricingResponse.selected_category || null;
      
      if (recommendedCategory) {
        console.log("🔄 API recommended category:", recommendedCategory);
        const vehicleId = apiCategoryMap[recommendedCategory];
        
        if (vehicleId) {
          // Find which category this vehicle belongs to and the vehicle itself
          for (const [category, vehicleList] of Object.entries(updatedVehiclesByCategory)) {
            const matchingVehicle = vehicleList.find(v => v.id === vehicleId);
            if (matchingVehicle) {
              // Use API price for this vehicle
              const apiPrice = bookingState.pricingResponse?.prices.find(
                p => p.category === recommendedCategory
              )?.price || matchingVehicle.price;
              
              console.log(`✅ Setting recommended vehicle: ${matchingVehicle.name} at €${apiPrice}`);
              
              // Update selected vehicle and category
              setSelectedVehicle({...matchingVehicle, price: apiPrice});
              setActiveCategory(category);
              break;
            }
          }
        }
      } else if (bookingState.selectedVehicle) {
        // If we have a previously selected vehicle, check if it has an API price
        const apiCategory = reverseApiCategoryMap[bookingState.selectedVehicle.id];
        const priceInfo = apiCategory ? bookingState.pricingResponse.prices.find(
          p => p.category === apiCategory
        ) : null;
        
        if (priceInfo) {
          // Update the selected vehicle with API price
          setSelectedVehicle({
            ...bookingState.selectedVehicle,
            price: priceInfo.price
          });
        } else {
          // If the previously selected vehicle doesn't have an API price,
          // find the first available vehicle
          for (const [category, vehicleList] of Object.entries(updatedVehiclesByCategory)) {
            const availableVehicle = vehicleList.find(v => {
              const apiCat = reverseApiCategoryMap[v.id];
              return apiCat && bookingState.pricingResponse?.prices.some(p => p.category === apiCat);
            });
            
            if (availableVehicle) {
              const apiCat = reverseApiCategoryMap[availableVehicle.id];
              const price = bookingState.pricingResponse?.prices.find(
                p => p.category === apiCat
              )?.price || 0;
              
              console.log(`✅ Selected first available vehicle: ${availableVehicle.name} at €${price}`);
              
              setSelectedVehicle({...availableVehicle, price});
              setActiveCategory(category);
              break;
            }
          }
        }
      } else {
        // No previously selected vehicle - find the first available vehicle
        let foundVehicle = false;
        
        for (const [category, vehicleList] of Object.entries(updatedVehiclesByCategory)) {
          // Find first vehicle with a valid API price
          for (const vehicle of vehicleList) {
            const apiCategory = reverseApiCategoryMap[vehicle.id];
            const priceInfo = apiCategory ? bookingState.pricingResponse.prices.find(
              p => p.category === apiCategory
            ) : null;
            
            if (priceInfo && priceInfo.price > 0) {
              console.log(`✅ Selected first vehicle with price: ${vehicle.name} at €${priceInfo.price}`);
              
              // Set as selected vehicle
              setSelectedVehicle({...vehicle, price: priceInfo.price});
              setActiveCategory(category);
              foundVehicle = true;
              break;
            }
          }
          
          if (foundVehicle) break;
        }
        
        // If no vehicle with price was found, show error
        if (!foundVehicle) {
          console.error("❌ No vehicles with prices found");
          setValidationError("No vehicles are available for this route. Please try a different route.");
        }
      }
    }
    
    // Check for passenger capacity warnings
    checkPassengerCapacity();
    
    console.log("✅ Applied API prices to vehicles");
  }, [bookingState.pricingResponse, bookingState.pricingError, bookingState.isPricingLoading,
      bookingState.selectedVehicle, bookingState.fromDisplay, bookingState.toDisplay, 
      bookingState.from, bookingState.to, bookingState.pickupDateTime, bookingState.passengers, passengerCount]);

  // Check passenger capacity
  const checkPassengerCapacity = () => {
    // Clear any existing capacity warning and preselection message
    setCapacityWarning(null);
    
    // If no selected vehicle or no passenger count, skip check
    if (!selectedVehicle || !bookingState.passengers) return;
    
    // Compare passenger count with vehicle capacity
    if (bookingState.passengers > selectedVehicle.seats) {
      setCapacityWarning(
        `This vehicle can only accommodate ${selectedVehicle.seats} passengers, but you've selected ${bookingState.passengers} passengers.`
      );
    }
  };

  // Run passenger capacity check whenever selected vehicle or passenger count changes
  useEffect(() => {
    checkPassengerCapacity();
  }, [selectedVehicle, bookingState.passengers]);

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
    
    // Check passenger capacity
    if (bookingState.passengers > selectedVehicle.seats) {
      setValidationError(`The selected vehicle cannot accommodate ${bookingState.passengers} passengers. Please select a vehicle with at least ${bookingState.passengers} seats.`);
      toast({
        title: "Insufficient Vehicle Capacity",
        description: `Please select a vehicle that can accommodate ${bookingState.passengers} passengers`,
        variant: "destructive"
      });
      return;
    }
    
    // Check if the selected vehicle has a valid price from API
    const apiPrice = getVehiclePrice(selectedVehicle.id);
    if (bookingState.pricingResponse && (apiPrice === null || apiPrice <= 0)) {
      setValidationError("The selected vehicle is not available for this route. Please select another vehicle.");
      toast({
        title: "Vehicle Not Available",
        description: "The selected vehicle is not available for this route. Please select another vehicle.",
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
    const vehicleWithPrice = { 
      ...selectedVehicle, 
      price: apiPrice !== null ? apiPrice : selectedVehicle.price 
    };
    
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
    if (!bookingState.pricingResponse || !bookingState.pricingResponse.prices) {
      return null;
    }
    
    // Map vehicle ID to API category
    const apiCategory = reverseApiCategoryMap[vehicleId];
    if (!apiCategory) {
      console.warn(`No API category mapping found for vehicle ID: ${vehicleId}`);
      return null;
    }
    
    const priceInfo = bookingState.pricingResponse.prices.find(p => p.category === apiCategory);
    if (priceInfo) {
      return priceInfo.price;
    } else {
      return null;
    }
  };

  // Get current vehicle price (API price or default)
  const getCurrentVehiclePrice = () => {
    if (!selectedVehicle) return 0;
    const apiPrice = getVehiclePrice(selectedVehicle.id);
    return apiPrice !== null ? apiPrice : selectedVehicle.price;
  };

  // Filter out vehicles with no API prices when showing categorized vehicles
  const filterAvailableVehicles = (vehicles: typeof activeVehicles) => {
    if (!bookingState.pricingResponse) {
      return vehicles; // Show all vehicles if no API pricing
    }
    
    return vehicles.filter(vehicle => {
      const apiPrice = getVehiclePrice(vehicle.id);
      return apiPrice !== null && apiPrice > 0;
    });
  };

  // This function now doesn't filter out vehicles but marks them as capable or not
  const getVehiclesWithCapacityFlags = (vehicles: typeof activeVehicles) => {
    return vehicles.map(vehicle => ({
      ...vehicle,
      canAccommodate: vehicle.seats >= bookingState.passengers
    }));
  };

  // Calculate active vehicles
  const activeVehicles = categorizedVehicles[activeCategory] || [];
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < activeVehicles.length - itemsPerView;
  
  // Filter available vehicles
  const availableVehicles = filterAvailableVehicles(activeVehicles);
  
  // Add capacity flags to available vehicles
  const vehiclesWithCapacityFlags = getVehiclesWithCapacityFlags(availableVehicles);

  // Do we have a pricing error to display?
  const hasPricingError = bookingState.pricingError !== null && bookingState.pricingError !== undefined;
  
  // No available vehicles in this category
  const noVehiclesAvailable = bookingState.pricingResponse && availableVehicles.length === 0;
  
  // No vehicles in this category that meet passenger requirements
  const noCapableVehicles = vehiclesWithCapacityFlags.length > 0 && !vehiclesWithCapacityFlags.some(v => v.canAccommodate);
  
  // Check if we're waiting for essential data to load
  const isWaitingForData = bookingState.isPricingLoading || 
    (!bookingState.fromDisplay && !bookingState.from) || 
    (!bookingState.toDisplay && !bookingState.to) ||
    !bookingState.pickupDateTime ||
    !bookingState.pricingResponse;

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
        
        {/* API Pricing Error Alert */}
        {hasPricingError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Pricing Error</p>
              <p className="mt-1">{bookingState.pricingError}</p>
              <p className="text-sm mt-2">
                Please try searching again with different locations or contact our customer support if the issue persists.
              </p>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isWaitingForData && !hasPricingError && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-lg text-gray-700">Loading vehicle options...</p>
            <p className="text-sm text-gray-500 mt-2">
              We're calculating the best rates for your journey
            </p>
          </div>
        )}
        
        {/* Main content - only show if not loading and no pricing error */}
        {!isWaitingForData && !hasPricingError && (
          <>
            {/* Category Tabs */}
            <div className="mb-8 sticky top-0 z-10 bg-white py-4 -mt-4 shadow-sm">
              <div 
                ref={categoryTabsRef}
                className="flex justify-start gap-2 overflow-x-auto py-2 px-1 pl-1 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {vehicleCategories.map((category) => {
                  // Count available vehicles in this category
                  const vehiclesInCategory = categorizedVehicles[category.id] || [];
                  const availableCount = vehiclesInCategory.filter(v => {
                    const apiPrice = getVehiclePrice(v.id);
                    return !bookingState.pricingResponse || (apiPrice !== null && apiPrice > 0);
                  }).length;
                  
                  // Count vehicles that can accommodate the passenger count
                  const capableCount = vehiclesInCategory.filter(v => {
                    const apiPrice = getVehiclePrice(v.id);
                    return (!bookingState.pricingResponse || (apiPrice !== null && apiPrice > 0)) && 
                           v.seats >= bookingState.passengers;
                  }).length;
                  
                  // Only show categories with available vehicles when we have pricing data
                  if (bookingState.pricingResponse && availableCount === 0) {
                    return null;
                  }
                  
                  // Highlight categories that have vehicles capable of accommodating all passengers
                  const hasCapableVehicles = capableCount > 0;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`px-3 py-1 text-sm md:text-base md:px-4 md:py-2 rounded-lg transition-colors ${
                        activeCategory === category.id 
                          ? hasCapableVehicles
                            ? `bg-blue-600 text-white shadow-sm`
                            : `bg-amber-500 text-white shadow-sm`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${!hasCapableVehicles ? 'relative' : ''}`}
                      aria-selected={activeCategory === category.id}
                      id={`category-tab-${category.id}`}
                    >
                      {category.name}
                      {bookingState.pricingResponse && (
                        <span className="ml-1 text-xs">
                          ({availableCount})
                        </span>
                      )}
                      
                      {/* Add indicator for categories without vehicles that can fit passengers */}
                      {!hasCapableVehicles && availableCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Category Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl" id="vehicle-category-heading">
                  {vehicleCategories.find(c => c.id === activeCategory)?.name} Options
                </h2>
                {bookingState.passengers > 1 && (
                  <p className="text-sm text-gray-500 mt-1 sm:mt-0 sm:ml-2">
                    (Showing vehicles for {bookingState.passengers} passengers)
                  </p>
                )}
              </div>
              <div className="flex items-center mt-2 sm:mt-0">
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
            
            {/* No vehicles available message */}
            {noVehiclesAvailable && (
              <div className="bg-amber-50 p-6 rounded-lg text-center mb-6">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-amber-800 mb-2">No vehicles available in this category</h3>
                <p className="text-amber-700">
                  Please select another vehicle category or try a different route.
                </p>
              </div>
            )}
            
            {/* No vehicles that can handle passenger count */}
            {noCapableVehicles && (
              <div className="bg-amber-50 p-6 rounded-lg text-center mb-6">
                <Users className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Passenger Capacity Warning</h3>
                <p className="text-amber-700 mb-4">
                  None of the vehicles in this category can accommodate {bookingState.passengers} passengers.
                </p>
                <div className="flex flex-col md:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      // Find first category with capable vehicles
                      for (const category of vehicleCategories) {
                        const vehicles = categorizedVehicles[category.id] || [];
                        const vehiclesWithFlags = getVehiclesWithCapacityFlags(filterAvailableVehicles(vehicles));
                        const capableVehicles = vehiclesWithFlags.filter(v => v.canAccommodate);
                        if (capableVehicles.length > 0) {
                          handleCategoryChange(category.id);
                          toast({
                            title: "Category Changed",
                            description: `Switched to ${category.name} category with vehicles that can accommodate ${bookingState.passengers} passengers.`,
                            variant: "default"
                          });
                          break;
                        }
                      }
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                  >
                    Find Suitable Vehicles
                  </button>
                  <button
                    onClick={() => {
                      toast({
                        title: "Multiple Bookings Needed",
                        description: "For your group size, we recommend making multiple bookings.",
                        variant: "default"
                      });
                    }}
                    className="px-4 py-2 border border-amber-600 text-amber-700 rounded-md hover:bg-amber-50"
                  >
                    Book Multiple Vehicles
                  </button>
                </div>
              </div>
            )}
            
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
                {vehiclesWithCapacityFlags.length > 0 ? (
                  vehiclesWithCapacityFlags.map((vehicle) => {
                    // Get API price if available
                    const apiPrice = getVehiclePrice(vehicle.id);
                    
                    // Skip vehicles with no API price or price of 0 if we have pricing data
                    if (bookingState.pricingResponse && (apiPrice === null || apiPrice <= 0)) {
                      return null;
                    }
                    
                    // Use API price if available, otherwise use vehicle's default price
                    const finalPrice = apiPrice !== null ? apiPrice : vehicle.price;
                    
                    // Create a vehicle copy with updated price
                    const vehicleWithPrice = {...vehicle, price: finalPrice};
                    
                    return (
                      <div 
                        key={vehicle.id}
                        className="vehicle-card flex-shrink-0 w-full md:w-[calc(33.333%-16px)] snap-center p-2"
                        style={{ scrollSnapAlign: 'center' }}
                        role="listitem"
                      >
                        <VehicleCard
                          {...vehicleWithPrice}
                          isSelected={selectedVehicle?.id === vehicle.id}
                          canAccommodate={vehicle.canAccommodate}
                          onSelect={() => {
                            // First check if this vehicle can handle the passenger count
                            if (!vehicle.canAccommodate) {
                              toast({
                                title: "Passenger Capacity Exceeded",
                                description: `This vehicle can only accommodate ${vehicle.seats} passengers, but you've selected ${bookingState.passengers} passengers.`,
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Validate the vehicle has a price if we have pricing data
                            if (bookingState.pricingResponse && (apiPrice === null || apiPrice <= 0)) {
                              toast({
                                title: "Vehicle Not Available",
                                description: "This vehicle is not available for your selected route. Please choose another vehicle.",
                                variant: "destructive"
                              });
                              return;
                            }
                            setSelectedVehicle(vehicleWithPrice);
                            setValidationError(null); // Clear validation error when a vehicle is selected
                            // Clear capacity warning if this vehicle can handle the passenger count
                            if (vehicle.canAccommodate) {
                              setCapacityWarning(null);
                            }
                            
                            // Clear the preselection message when user explicitly selects a vehicle
                            if (preSelectionMessage) {
                              setPreSelectionMessage(null);
                            }
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
                    {bookingState.pricingResponse ? 
                      'No vehicles available for this route in this category.' :
                      'Unable to load vehicle information. Please try again later.'}
                  </div>
                )}
              </div>
              
              {/* Mobile Navigation Indicators */}
              {vehiclesWithCapacityFlags.length > 1 && (
                <div className="flex justify-center mt-4 md:hidden">
                  {vehiclesWithCapacityFlags.map((_, index) => (
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
              )}
              
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
            
            {/* Preselection message */}
            {preSelectionMessage && (
              <div className="mb-6 bg-[#f6f8fc] text-[#334155] px-4 py-3 rounded-lg flex items-start">
                <Users className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm md:text-[15px] leading-tight max-w-[90%]">{preSelectionMessage}</span>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Vehicle Detail Modal */}
      {modalVehicle && (
        <VehicleModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSelect={() => {
            // Check if this vehicle can handle the passenger count
            if (modalVehicle.seats < bookingState.passengers) {
              toast({
                title: "Passenger Capacity Exceeded",
                description: `This vehicle can only accommodate ${modalVehicle.seats} passengers, but you've selected ${bookingState.passengers} passengers.`,
                variant: "destructive"
              });
              return;
            }
            
            // Check if vehicle is available based on API price
            const apiPrice = getVehiclePrice(modalVehicle.id);
            if (bookingState.pricingResponse && (apiPrice === null || apiPrice <= 0)) {
              toast({
                title: "Vehicle Not Available",
                description: "This vehicle is not available for your selected route. Please choose another vehicle.",
                variant: "destructive"
              });
              return;
            }
            
            const vehicleWithPrice = apiPrice !== null ? 
              {...modalVehicle, price: apiPrice} : 
              modalVehicle;
            
            setSelectedVehicle(vehicleWithPrice);
            setValidationError(null); // Clear validation error when a vehicle is selected
            
            // Clear capacity warning if this vehicle can handle the passenger count
            if (modalVehicle.seats >= bookingState.passengers) {
              setCapacityWarning(null);
            }
            
            // Clear the preselection message when user explicitly selects a vehicle
            if (preSelectionMessage) {
              setPreSelectionMessage(null);
            }
          }}
          vehicle={modalVehicle}
          isSelected={selectedVehicle?.id === modalVehicle.id}
        />
      )}
    </BookingLayout>
  );
};

export default VehicleSelection;