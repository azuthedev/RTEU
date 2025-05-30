import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBooking } from '../contexts/BookingContext';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import BookingTopBar from '../components/booking/BookingTopBar';
import BookingLayout from '../components/booking/BookingLayout';
import { updateMetaTags } from '../utils/seo';
import { useAnalytics } from '../hooks/useAnalytics';
import { initGoogleMaps } from '../utils/optimizeThirdParty';

// Determine the actual display name for a location by title casing words
const formatLocationDisplay = (location: string): string => {
  if (!location) return '';
  
  // Split by hyphens, capitalize each word, and join with spaces
  return location
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const BookingFlow: React.FC = () => {
  const { bookingState, setBookingState } = useBooking();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const { 
    from, 
    to, 
    type, 
    date, 
    returnDate, 
    passengers 
  } = useParams<{ 
    from: string; 
    to: string; 
    type: string; 
    date: string; 
    returnDate: string; 
    passengers: string; 
  }>();
  
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  // Initialize Google Maps early for address autocomplete
  useEffect(() => {
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          console.log('BookingFlow: Google Maps API initialization:', success ? 'successful' : 'failed');
        });
    }
  }, []);

  // Update metadata for SEO
  useEffect(() => {
    updateMetaTags(
      'Book Your Transfer | Royal Transfer EU',
      `Book your premium airport transfer from ${formatLocationDisplay(from || '')} to ${formatLocationDisplay(to || '')}. Simple online booking with instant confirmation.`,
      window.location.pathname
    );
  }, [from, to]);

  // Initialize booking state from URL parameters if not already set
  // This should only run once when the component mounts
  useEffect(() => {
    // Skip if we've already initialized from URL or if we already have booking data
    if (initializedFromUrl || (bookingState.from && bookingState.to)) {
      return;
    }

    // Only initialize from URL if we have the minimum required parameters
    if (from && to && date) {
      // Use existing display values if available, otherwise format from URL
      const fromDisplayValue = bookingState.fromDisplay || formatLocationDisplay(from);
      const toDisplayValue = bookingState.toDisplay || formatLocationDisplay(to);
      
      // Get properly formatted dates
      const departureDateValue = date.replace(/(\d{2})(\d{2})(\d{4})/, '$2/$1/$3');
      let returnDateValue = undefined;
      if (returnDate && returnDate !== 'none') {
        returnDateValue = returnDate.replace(/(\d{2})(\d{2})(\d{4})/, '$2/$1/$3');
      }

      // Update booking state with URL parameters
      setBookingState(prev => ({
        ...prev,
        from,
        to,
        fromDisplay: fromDisplayValue,
        toDisplay: toDisplayValue,
        isReturn: type === 'return',
        departureDate: departureDateValue,
        returnDate: returnDateValue,
        passengers: passengers ? parseInt(passengers) : undefined
      }));

      // Mark as initialized to prevent re-runs
      setInitializedFromUrl(true);
      
      // Track booking flow initiation
      trackEvent(
        'Booking', 
        'Booking Flow Initiated', 
        `${fromDisplayValue} to ${toDisplayValue}`
      );
    } else {
      // If we don't have the required parameters, navigate back to the home page
      // This should only happen if the URL is malformed
      console.warn('Missing required booking parameters. Redirecting to home page.');
      navigate('/');
    }
  }, [from, to, type, date, returnDate, passengers, bookingState, setBookingState, navigate, trackEvent, initializedFromUrl]);

  // If we don't have the required parameters, show a loading state until redirection
  if (!from || !to || !date || !initializedFromUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Book Your Transfer | Royal Transfer EU</title>
        <meta name="description" content={`Book your premium airport transfer from ${formatLocationDisplay(from)} to ${formatLocationDisplay(to)}. Simple online booking with instant confirmation.`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header hideSignIn />
        <BookingTopBar className="mt-20" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${bookingState.step}`}
            initial={{ opacity: 0, x: bookingState.previousStep && bookingState.previousStep > bookingState.step ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: bookingState.previousStep && bookingState.previousStep < bookingState.step ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 w-full pt-6 pb-16"
          >
            <BookingLayout />
          </motion.div>
        </AnimatePresence>

        <Sitemap />
      </div>
    </>
  );
};

export default BookingFlow;