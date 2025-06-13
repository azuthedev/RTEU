import React from 'react';
import { X, MessageCircle, Mail, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactDialog = ({ isOpen, onClose }: ContactDialogProps) => {
  const openAIChat = () => {
    // Close the dialog first
    onClose();
    // @ts-ignore - voiceflow is added via script
    if (window.voiceflow && window.voiceflow.chat) {
      // @ts-ignore
      window.voiceflow.chat.open();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close contact dialog"
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>

              <h3 className="text-2xl font-bold mb-6 text-center">Contact Us</h3>
              
              <div className="space-y-4">
                <a
                  href="https://wa.me/3517482244"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  aria-label="Contact Royal Transfer EU via WhatsApp"
                >
                  <MessageCircle className="w-6 h-6 text-green-600 mr-3" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">WhatsApp</div>
                    <div className="text-sm text-gray-600">+393517482244</div>
                  </div>
                </a>

                <a
                  href="https://www.instagram.com/royaltransfer1991/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  aria-label="Follow Royal Transfer EU on Instagram"
                >
                  <Instagram className="w-6 h-6 text-purple-600 mr-3" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Instagram</div>
                    <div className="text-sm text-gray-600">@RoyalTransfer1991</div>
                  </div>
                </a>

                <a
                  href="mailto:support@royaltransfer.eu"
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  aria-label="Email Royal Transfer EU support team"
                >
                  <Mail className="w-6 h-6 text-blue-600 mr-3" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Email</div>
                    <div className="text-sm text-gray-600">support@royaltransfer.eu</div>
                  </div>
                </a>

                <button
                  onClick={openAIChat}
                  className="w-full flex items-center p-4 bg-[#E6AB00] rounded-lg hover:opacity-90 transition-colors text-white"
                  aria-label="Chat with Royal Transfer EU AI assistant"
                >
                  <MessageCircle className="w-6 h-6 mr-3" aria-hidden="true" />
                  <div className="text-left">
                    <div className="font-semibold">Speak to us Instantly!</div>
                    <div className="text-sm">Available 24/7</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContactDialog;