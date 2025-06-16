import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../Header';
import BookingTopBar from './BookingTopBar';
import ProgressBar from './ProgressBar';
import { useBooking } from '../../contexts/BookingContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import Newsletter from '../Newsletter';
import { useToast } from '../ui/use-toast';

interface BookingLayoutProps {
  children: React.ReactNode;
  currentStep: 1 | 2 | 3;
  totalPrice: number;
  onBack?: () => void;
  onNext?: () => void;
  nextButtonText?: string;
  showNewsletter?: boolean;
  modalOpen?: boolean;
  preventScrollOnNext?: boolean;
  validateBeforeNext?: boolean;
}

const BookingLayout: React.FC<BookingLayoutProps> = ({
  children,
  currentStep,
  totalPrice,
  onBack,
  onNext,
  nextButtonText = 'Next Step',
  showNewsletter = true,
  modalOpen = false,
  preventScrollOnNext = false,
  validateBeforeNext = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { from, to, type, date, returnDate, passengers } = useParams();
  const { bookingState, setBookingState, validateStep, scrollToError } = useBooking();
  const { trackEvent } = useAnalytics();
  const { toast } = useToast();
  
  // Refs for scroll calculations
  const priceBarRef = useRef<HTMLDivElement>(null);
  const priceBarPlaceholderRef = useRef<HTMLDivElement>(null);
  const newsletterRef = useRef<HTMLDivElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  const [isFloating, setIsFloating] = useState(true);
  const [isSlotted, setIsSlotted] = useState(false);
  // Track exact position for smooth transitions
  const [slotPosition, setSlotPosition] = useState(0);
  // Track modal state from external events
  const [isModalActive, setIsModalActive] = useState(modalOpen);

  // Update modal state when prop changes
  useEffect(() => {
    setIsModalActive(modalOpen);
  }, [modalOpen]);

  // Add event listener for custom modal state changes
  useEffect(() => {
    const handleModalStateChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.isOpen === 'boolean') {
        setIsModalActive(event.detail.isOpen);
      }
    };

    window.addEventListener('modalStateChange' as any, handleModalStateChange);
    return () => {
      window.removeEventListener('modalStateChange' as any, handleModalStateChange);
    };
  }, []);

  // Add a class to the body to indicate this is a booking page
  useEffect(() => {
    document.body.classList.add('booking-page');
    document.body.setAttribute('data-page-type', 'booking');
    document.documentElement.classList.add('booking-page');
    
    // Try to reposition the chat widget when this component mounts
    const positionChatWidget = () => {
      const isTransferPage = location.pathname.startsWith('/transfer');
      const chatWidgets = [
        document.getElementById('voiceflow-chat-widget-container'),
        document.querySelector('.vf-widget-container'),
        document.querySelector('[id^="voiceflow-chat"]'),
        document.querySelector('button[aria-label*="chat"]'),
        ...Array.from(document.querySelectorAll('div[style*="position: fixed"][style*="bottom: 20px"]')),
        ...Array.from(document.querySelectorAll('div[style*="position: fixed"][style*="bottom: 16px"]'))
      ].filter(Boolean);
      
      chatWidgets.forEach(widget => {
        if (widget && widget.style) {
          widget.style.bottom = isTransferPage ? '16px' : '81px';
          widget.style.zIndex = '45';
          widget.setAttribute('data-modified-by-booking', 'true');
        }
      });
    };
    
    positionChatWidget();
    const interval = setInterval(positionChatWidget, 500);
    
    return () => {
      document.body.classList.remove('booking-page');
      document.body.removeAttribute('data-page-type');
      document.documentElement.classList.remove('booking-page');
      clearInterval(interval);
      
      const chatWidgets = document.querySelectorAll('[data-modified-by-booking="true"]');
      chatWidgets.forEach(widget => {
        if (widget instanceof HTMLElement) {
          widget.style.bottom = '16px';
          widget.removeAttribute('data-modified-by-booking');
        }
      });
    };
  }, [location.pathname]);

  // Calculate and update position on resize
  useEffect(() => {
    const updatePositions = () => {
      if (priceBarPlaceholderRef.current) {
        const rect = priceBarPlaceholderRef.current.getBoundingClientRect();
        const scrollY = window.scrollY;
        setSlotPosition(rect.top + scrollY);
      }
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!priceBarRef.current || !priceBarPlaceholderRef.current) return;

      // Update position in case layout has shifted
      if (priceBarPlaceholderRef.current) {
        const rect = priceBarPlaceholderRef.current.getBoundingClientRect();
        const scrollY = window.scrollY;
        setSlotPosition(rect.top + scrollY);
      }

      const placeholderRect = priceBarPlaceholderRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const scrollBuffer = 5; // Buffer pixels to make transition smoother
      
      // Check if the placeholder should be docked (when it's visible and near bottom of viewport)
      const shouldDock = placeholderRect.top <= viewportHeight - placeholderRect.height - scrollBuffer;
      
      setIsFloating(!shouldDock);
      setIsSlotted(shouldDock);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const handleBack = () => {
    // Track back button click
    trackEvent('Booking Flow', 'Navigate Back', `From Step ${currentStep}`);
    
    // Scroll to top first
    window.scrollTo(0, 0);
    
    if (onBack) {
      onBack();
    } else if (currentStep === 1) {
      // Navigate to home with preserved parameters
      navigate(`/home/transfer/${from}/${to}/${type}/${date}/${returnDate}/${passengers}/form`);
    } else {
      // Update step in context
      setBookingState(prev => ({
        ...prev,
        step: (prev.step - 1) as 1 | 2 | 3,
        validationErrors: [] // Clear validation errors when going back
      }));
    }
  };

  const handleNext = () => {
    // If validateBeforeNext is true, use the validation logic
    if (validateBeforeNext) {
      // Validate the current step
      const errors = validateStep(currentStep);
      
      if (errors.length > 0) {
        // Display toast with first error
        toast({
          title: "Please complete all required fields",
          description: errors[0].message,
          variant: "destructive"
        });
        
        // Scroll to the first error field if it exists
        if (errors[0].field) {
          scrollToError(errors[0].field);
        }
        
        return;
      }
    }
    
    // Track next button click
    trackEvent('Booking Flow', 'Navigate Next', `From Step ${currentStep}`);
    
    // Only scroll to top if preventScrollOnNext is false
    if (!preventScrollOnNext) {
      window.scrollTo(0, 0);
    }
    
    if (onNext) {
      onNext();
    } else {
      // Update step in context
      setBookingState(prev => ({
        ...prev,
        step: (prev.step + 1) as 1 | 2 | 3,
        validationErrors: [] // Clear validation errors when moving forward
      }));
    }
  };

  // Format price with euro symbol
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(totalPrice);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      
      <main className="pt-20 pb-20 booking-flow" ref={mainContentRef}>
        {/* Content */}
        <div className="relative z-10">
          {/* Top Booking Bar */}
          <div className="mb-8 mt-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg">
                <BookingTopBar
                  from={decodeURIComponent(from || '')}
                  to={decodeURIComponent(to || '')}
                  type={type === '2' ? 'round-trip' : 'one-way'}
                  date={date || ''}
                  returnDate={returnDate}
                  passengers={passengers || '1'}
                  currentStep={currentStep}
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <ProgressBar currentStep={currentStep} />
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              {children}
            </div>
          </div>

          {/* Price Bar Placeholder - always present even if newsletter isn't shown */}
          <div 
            ref={priceBarPlaceholderRef}
            className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 my-12"
          >
            {/* Empty placeholder with correct height */}
            <div className={`h-[72px] rounded-full ${isSlotted ? 'opacity-0' : 'opacity-0'}`} />
          </div>

          {/* This div serves as a reference point for the end of content when newsletter isn't shown */}
          <div ref={contentEndRef} className="h-8"></div>
        </div>

        {/* Floating/Docked Price Bar */}
        <div 
          ref={priceBarRef}
          className={`
            ${isSlotted ? 'absolute' : 'fixed'} 
            left-0 right-0 px-4 sm:px-6 lg:px-8 price-bar-container 
            ${isModalActive 
              ? isFloating 
                  ? 'z-[40]' // Lower z-index but still visible when not fixed to bottom
                  : 'z-[40] opacity-0 pointer-events-none' // Hide when fixed to bottom and modal is open
              : 'z-[40]'
            }
            transition-opacity duration-300
          `}
          style={{
            top: isSlotted ? slotPosition : 'auto',
            bottom: isSlotted ? 'auto' : '16px'
          }}
        >
          <div 
            className={`max-w-3xl mx-auto rounded-full ${
              isFloating 
                ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                : 'bg-white shadow-[0_4px_10px_rgba(0,0,0,0.1)]'
            } price-bar`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                disabled={isModalActive && isFloating === false}
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Price</div>
                  <div className="text-xl font-bold">
                    {formattedPrice}
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={isModalActive && isFloating === false}
                  className="bg-blue-600 text-white text-[13px] md:text-sm px-4 md:px-6 py-2.5 rounded-full hover:bg-blue-700 transition-all duration-300"
                >
                  {nextButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Removed Sitemap component to prevent duplicate footers */}
    </div>
  );
};

export default BookingLayout;
