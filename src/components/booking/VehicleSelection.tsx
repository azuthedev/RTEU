import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBooking } from '../../contexts/BookingContext';
import BookingLayout from './BookingLayout';
import VehicleCard from './VehicleCard';
import VehicleModal from './VehicleModal';
import { vehicles } from '../../data/vehicles';
import { motion, AnimatePresence } from 'framer-motion';

// Define vehicle categories
const vehicleCategories = [
  { id: 'sedan', name: 'Sedan', color: 'bg-blue-50' },
  { id: 'minivan', name: 'Minivan', color: 'bg-green-50' },
  { id: 'sprinter', name: 'Sprinter', color: 'bg-gray-50' },
  { id: 'bus', name: 'Bus', color: 'bg-amber-50' }
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
      ['sprinter-8', 'sprinter-12', 'sprinter-16', 'sprinter-21'].includes(v.id)
    ),
    bus: vehicles.filter(v => 
      v.id.includes('bus') || 
      ['bus-51'].includes(v.id)
    )
  };
  
  return map;
};

const VehicleSelection = () => {
  const { bookingState, setBookingState } = useBooking();
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]);
  const [modalVehicle, setModalVehicle] = useState<typeof vehicles[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('sedan');
  const [categorizedVehicles, setCategorizedVehicles] = useState<Record<string, typeof vehicles>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const isMobile = window.innerWidth < 768;
  const itemsPerView = isMobile ? 1 : 3;

  // Set initial categorized vehicles and selected vehicle
  useEffect(() => {
    const vehiclesByCategory = categorizeVehicles();
    setCategorizedVehicles(vehiclesByCategory);
    
    // If there's already a selected vehicle in context, use that
    if (bookingState.selectedVehicle) {
      setSelectedVehicle(bookingState.selectedVehicle);
      
      // Find and set active category based on selected vehicle
      for (const [category, vehicleList] of Object.entries(vehiclesByCategory)) {
        if (vehicleList.some(v => v.id === bookingState.selectedVehicle.id)) {
          setActiveCategory(category);
          break;
        }
      }
    }
  }, [bookingState.selectedVehicle]);

  // Handle modal open state
  const handleOpenModal = (vehicle: typeof vehicles[0]) => {
    setModalVehicle(vehicle);
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
  };

  const handleNext = () => {
    // Update selected vehicle in context
    setBookingState(prev => ({
      ...prev,
      step: 2,
      selectedVehicle
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

  // Calculate active vehicles
  const activeVehicles = categorizedVehicles[activeCategory] || [];
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < activeVehicles.length - itemsPerView;

  return (
    <BookingLayout
      currentStep={1}
      totalPrice={selectedVehicle.price}
      onNext={handleNext}
      nextButtonText="Next: Personal Details"
      modalOpen={isModalOpen}
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Choose Your Vehicle</h1>
        
        {/* Category Tabs */}
        <div className="mb-8 sticky top-0 z-10 bg-white py-4 -mt-4 shadow-sm">
          <div className="flex items-center justify-center md:justify-start space-x-2 overflow-x-auto py-2 px-1">
            {vehicleCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === category.id 
                    ? `${category.color} text-gray-800 shadow-md`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                aria-selected={activeCategory === category.id}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Category Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
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
        <div className="relative overflow-hidden p-2">
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
          >
            {activeVehicles.length > 0 ? (
              activeVehicles.map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  className="vehicle-card flex-shrink-0 w-full md:w-[calc(33.333%-16px)] snap-center p-2"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <VehicleCard
                    {...vehicle}
                    isSelected={selectedVehicle.id === vehicle.id}
                    onSelect={() => setSelectedVehicle(vehicle)}
                    onLearnMore={() => handleOpenModal(vehicle)}
                  />
                </div>
              ))
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
      </div>

      {/* Vehicle Detail Modal */}
      {modalVehicle && (
        <VehicleModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSelect={() => setSelectedVehicle(modalVehicle)}
          vehicle={modalVehicle}
          isSelected={selectedVehicle.id === modalVehicle.id}
        />
      )}
    </BookingLayout>
  );
};

export default VehicleSelection;