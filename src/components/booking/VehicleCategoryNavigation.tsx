import React from 'react';
import { motion } from 'framer-motion';

export interface VehicleCategory {
  id: string;
  name: string;
  color: string;
  icon?: React.ReactNode;
}

interface VehicleCategoryNavigationProps {
  categories: VehicleCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const VehicleCategoryNavigation: React.FC<VehicleCategoryNavigationProps> = ({
  categories,
  activeCategory,
  onCategoryChange
}) => {
  return (
    <div className="sticky top-0 z-10 bg-white py-4 shadow-sm">
      <div className="flex items-center justify-center md:justify-start space-x-2 overflow-x-auto scrollbar-hide py-2 px-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeCategory === category.id 
                ? `${category.color} text-gray-800 shadow-md` 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            aria-selected={activeCategory === category.id}
          >
            <div className="flex items-center space-x-1">
              {category.icon && <span>{category.icon}</span>}
              <span>{category.name}</span>
            </div>
            {activeCategory === category.id && (
              <motion.div 
                className="h-0.5 bg-gray-800 mt-1 mx-auto"
                layoutId="activeCategoryIndicator"
                initial={{ width: 0 }}
                animate={{ width: '50%' }}
                transition={{ duration: 0.3 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VehicleCategoryNavigation;