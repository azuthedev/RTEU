import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';

interface BookingReferenceInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidBookingFound: (bookingData: any) => void;
  disabled?: boolean;
  className?: string;
}

const BookingReferenceInput: React.FC<BookingReferenceInputProps> = ({
  value,
  onChange,
  onValidBookingFound,
  disabled = false,
  className = ''
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [timeout, setTimeout] = useState<NodeJS.Timeout | null>(null);
  const { trackEvent } = useAnalytics();

  // Regular expression for booking reference format: 0000a0
  const refRegex = /^\d{4}[a-z]\d{1}$/;

  useEffect(() => {
    // Reset validation states when value changes
    setIsValid(false);
    setError(null);

    // Clear previous timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Only validate if there's a value and it matches the expected format
    if (value && refRegex.test(value)) {
      // Debounce the validation to avoid unnecessary API calls
      const newTimeout = setTimeout(() => {
        validateBookingReference(value);
      }, 500);

      setTimeout(newTimeout);
    }
  }, [value]);

  const validateBookingReference = async (reference: string) => {
    setIsValidating(true);
    setError(null);

    try {
      trackEvent('Form', 'Validate Booking Reference', reference);

      // Query the trips table to find a matching booking
      const { data, error: queryError } = await supabase
        .from('trips')
        .select('*')
        .eq('booking_reference', reference)
        .single();

      if (queryError || !data) {
        setIsValid(false);
        setError('No booking found with this reference');
        return;
      }

      // We found a valid booking
      setIsValid(true);
      
      // Notify parent component
      onValidBookingFound(data);
      
      // Track success
      trackEvent('Form', 'Valid Booking Reference Found', reference);
    } catch (error: any) {
      console.error('Error validating booking reference:', error);
      setIsValid(false);
      setError(error.message || 'An error occurred while validating the booking reference');
      trackEvent('Form', 'Booking Reference Validation Error', error.message);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={`${className}`}>
      <label htmlFor="booking-reference" className="block text-sm font-medium text-gray-700 mb-1">
        Booking Reference <span className="text-xs text-gray-500">(Optional)</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          id="booking-reference"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className={`w-full pl-10 pr-10 py-2 border ${
            error ? 'border-red-300 bg-red-50' : 
            isValid ? 'border-green-300 bg-green-50' : 'border-gray-300'
          } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          placeholder="e.g., 1234a5"
          disabled={disabled}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isValidating && (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          )}
          {error && !isValidating && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {isValid && !isValidating && (
            <Check className="h-5 w-5 text-green-500" />
          )}
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {isValid && (
        <p className="mt-1 text-sm text-green-600">Booking found! Details will be used to pre-fill the form.</p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        Enter your booking reference to automatically fill in your details.
      </p>
    </div>
  );
};

export default BookingReferenceInput;