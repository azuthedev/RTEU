import React, { useState } from 'react';
import { Search, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';

interface BookingReferenceFormProps {
  onSuccess: (data: any) => void;
  onCancel: () => void;
}

const BookingReferenceForm: React.FC<BookingReferenceFormProps> = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    bookingReference: '',
    email: ''
  });
  const { trackEvent } = useAnalytics();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.bookingReference || !formData.email) {
      setError('Please enter both booking reference and email');
      return;
    }

    setLoading(true);
    
    try {
      trackEvent('Authentication', 'Booking Reference Lookup', formData.bookingReference);
      
      // Query the trips table to find a matching booking
      const { data, error: queryError } = await supabase
        .from('trips')
        .select('*')
        .eq('booking_reference', formData.bookingReference)
        .eq('customer_email', formData.email)
        .single();

      if (queryError || !data) {
        throw new Error('No matching booking found. Please check your booking reference and email');
      }

      // Check if this booking is already linked to a user account
      if (data.user_id) {
        // Check if this is a real user (not null/placeholder)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', data.user_id)
          .single();
        
        if (!userError && userData) {
          throw new Error('This booking is already linked to a user account. Please sign in instead.');
        }
        // If we get an error on the user lookup, the user_id might be invalid/stale, so we can proceed
      }

      // Send the found booking data back to the parent component
      trackEvent('Authentication', 'Booking Reference Lookup Success', formData.bookingReference);
      onSuccess(data);
    } catch (error: any) {
      console.error('Error looking up booking:', error);
      setError(error.message || 'An error occurred while looking up your booking');
      trackEvent('Authentication', 'Booking Reference Lookup Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Find Your Booking</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error}</p>
        </div>
      )}
      
      <p className="text-gray-600 mb-6">
        Enter your booking reference and email to find and link your booking to your new account.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bookingReference" className="block text-sm font-medium text-gray-700 mb-1">
            Booking Reference
          </label>
          <input
            id="bookingReference"
            name="bookingReference"
            type="text"
            value={formData.bookingReference}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="e.g. 1234a5"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="email@example.com"
            required
          />
        </div>
        
        <div className="flex space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading || !formData.bookingReference || !formData.email}
            className={`flex-1 px-4 py-2 rounded-md flex items-center justify-center ${
              loading || !formData.bookingReference || !formData.email
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Find Booking
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingReferenceForm;