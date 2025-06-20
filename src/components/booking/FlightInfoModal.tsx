import React from 'react';
import { X, Plane, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlightInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FlightInfoModal: React.FC<FlightInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center text-blue-600">
                <Plane className="w-5 h-5 mr-2" />
                <h2 className="text-xl font-semibold">Flight Information</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-800">Why we need flight information:</h3>
                <p className="text-blue-700 mb-4">
                  Your flight number helps us track your flight status and adjust pickup times automatically in case of delays.
                </p>
                <p className="text-blue-700">
                  This ensures you'll always have a driver waiting when you arrive, even if your flight is delayed.
                </p>
              </div>
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-gray-700">
                    <h4 className="font-semibold mb-1">What happens with flight delays?</h4>
                    <p className="text-sm">
                      We monitor your flight status in real-time. If your flight is delayed, your driver will automatically adjust their schedule to meet you when you arrive.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Got It
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FlightInfoModal;