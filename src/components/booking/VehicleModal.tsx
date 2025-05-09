import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  vehicle: {
    name: string;
    image: string;
    description: string;
    sampleVehicles: string[];
    features: {
      icon: string;
      title: string;
      description: string;
    }[];
  };
  isSelected?: boolean;
}

const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  vehicle,
  isSelected = false
}) => {
  // Dispatch custom event when modal state changes
  useEffect(() => {
    const event = new CustomEvent('modalStateChange', { 
      detail: { isOpen } 
    });
    window.dispatchEvent(event);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-[100]"
          onClick={onClose}
        />
        
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[101] overflow-hidden flex items-center justify-center"
          style={{
            // Add padding to avoid header and price bar
            paddingTop: 'calc(80px + 1rem)', // Header height + some spacing
            paddingBottom: '6rem', // Price bar height + some spacing
            paddingLeft: '1rem',
            paddingRight: '1rem'
          }}
        >
          {/* Modal Content */}
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl relative flex flex-col max-h-full">
            {/* Header - Always visible */}
            <div className="sticky top-0 z-10 bg-white border-b p-4 md:p-6 flex items-center justify-between rounded-t-lg">
              <h2 className="text-xl md:text-2xl">{vehicle.name}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content - Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Left Column */}
                <div>
                  <motion.img
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    src={vehicle.image}
                    alt={`${vehicle.name} - Detailed view of the premium transfer vehicle showing interior and exterior features`}
                    className="w-full h-auto rounded-lg"
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg mb-2">About this category</h3>
                    <p className="text-gray-600">{vehicle.description}</p>
                  </div>

                  <div>
                    <h3 className="text-lg mb-2">Sample vehicles</h3>
                    <ul className="list-disc list-inside text-gray-600">
                      {vehicle.sampleVehicles.map((v, index) => (
                        <li key={index}>{v}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-8">
                <h3 className="text-lg mb-4">What's included?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {vehicle.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-gray-50 p-4 rounded-lg"
                    >
                      <img
                        src={feature.icon}
                        alt={`${feature.title} icon - ${feature.description}`}
                        className="w-8 h-8 mb-2"
                      />
                      <h4 className="font-medium mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer - Always visible */}
            <div className="sticky bottom-0 bg-gray-50 border-t p-4 md:p-6 flex flex-col sm:flex-row justify-end gap-3 rounded-b-lg">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSelect();
                  onClose();
                }}
                className={`w-full sm:w-auto px-6 py-2 rounded-md transition-colors flex items-center justify-center ${
                  isSelected
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Check className="w-5 h-5 mr-2" />
                {isSelected ? 'Already Selected' : 'Choose this vehicle'}
              </button>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default VehicleModal;