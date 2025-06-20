import React from 'react';
import { Star, Info, Users, Briefcase as Suitcase } from 'lucide-react';
import { motion } from 'framer-motion';

interface VehicleCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  seats: number;
  suitcases: number;
  price: number;
  isSelected: boolean;
  canAccommodate?: boolean; // New prop to indicate if vehicle can accommodate passenger count
  onSelect: () => void;
  onLearnMore: () => void;
  'aria-label'?: string;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  id,
  name,
  image,
  rating,
  reviews,
  seats,
  suitcases,
  price,
  isSelected,
  canAccommodate = true, // Default to true
  onSelect,
  onLearnMore,
  'aria-label': ariaLabel
}) => {
  // Format price with euro symbol
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-xl shadow-lg p-6 relative h-full flex flex-col ${
        isSelected ? 'ring-2 ring-blue-600' : ''
      }`}
      whileHover={{ y: -5 }}
      aria-label={ariaLabel}
    >
      {/* Vehicle Image */}
      <div className="relative aspect-[16/9] mb-4 flex items-center justify-center">
        <img
          src={image}
          alt={`${name} - ${seats}-passenger vehicle for Royal Transfer EU services with space for ${suitcases} suitcases`}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Vehicle Details */}
      <div className="space-y-4 flex-grow">
        <div className="flex items-center justify-between">
          <h3 className="text-xl">{name}</h3>
          <button
            onClick={onLearnMore}
            className="flex items-center text-gray-500 hover:text-blue-600 transition-colors p-2 hover:bg-gray-100 rounded-lg group"
            aria-label={`Learn more about ${name}`}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="flex" aria-label={`Rating: ${rating} out of 5 stars from ${reviews} reviews`}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {rating} ({reviews} reviews)
          </span>
        </div>

        {/* Capacity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="text-sm">
              <span className="font-medium">{seats}</span> passengers
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Suitcase className="h-4 w-4 text-gray-500" />
            <div className="text-sm">
              <span className="font-medium">{suitcases}</span> luggage
            </div>
          </div>
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <div>
          <div className="text-sm text-gray-600">From</div>
          <div className="text-2xl font-bold">{formattedPrice}</div>
        </div>
        {canAccommodate ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onSelect}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isSelected
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            aria-pressed={isSelected}
            id={id}
          >
            {isSelected ? 'Selected' : 'Choose'}
          </motion.button>
        ) : (
          <div className="text-xs text-amber-600 px-3 py-2 bg-amber-50 rounded border border-amber-100">
            Requires multiple bookings
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default VehicleCard;