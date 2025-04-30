import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import VehicleCard from './VehicleCard';

interface VehicleCarouselProps {
  vehicles: any[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicle: any) => void;
  onViewDetails: (vehicle: any) => void;
  itemsPerView?: number;
}

const VehicleCarousel: React.FC<VehicleCarouselProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  onViewDetails,
  itemsPerView = 3
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = window.innerWidth < 768;
  const effectiveItemsPerView = isMobile ? 1 : itemsPerView;
  
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < vehicles.length - effectiveItemsPerView;

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

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < vehicles.length - effectiveItemsPerView) {
      setCurrentIndex(currentIndex + 1);
      scrollToIndex(currentIndex + 1);
    }
  };

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="flex space-x-4 overflow-x-auto snap-x scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="vehicle-card flex-shrink-0 w-full md:w-[calc(33.333%-16px)] snap-center"
            >
              <VehicleCard
                {...vehicle}
                isSelected={selectedVehicleId === vehicle.id}
                onSelect={() => onSelectVehicle(vehicle)}
                onLearnMore={() => onViewDetails(vehicle)}
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
        {vehicles.map((_, index) => (
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
            onClick={handleNext}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg p-2 z-10 hover:bg-gray-50"
            aria-label="View more vehicles"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>
        )}
      </div>
    </div>
  );
};

export default VehicleCarousel;