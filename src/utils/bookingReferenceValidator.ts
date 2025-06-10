import { supabase } from '../lib/supabase';

/**
 * Validates a booking reference against the database
 * @param reference The booking reference to validate
 * @returns Object containing validation results
 */
export const validateBookingReference = async (reference: string): Promise<{
  isValid: boolean;
  bookingData?: any;
  userExists?: boolean;
  error?: string;
}> => {
  try {
    // Check if the booking reference has the correct format (0000a0)
    const refRegex = /^\d{4}[a-z]\d{1}$/;
    if (!refRegex.test(reference)) {
      return {
        isValid: false,
        error: 'Invalid booking reference format'
      };
    }
    
    // Query the trips table to find a matching booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('trips')
      .select('*')
      .eq('booking_reference', reference)
      .single();
    
    if (bookingError || !bookingData) {
      return {
        isValid: false,
        error: 'No booking found with this reference'
      };
    }
    
    // Check if we have customer email on the booking
    const customerEmail = bookingData.customer_email;
    if (!customerEmail) {
      return {
        isValid: true,
        bookingData,
        userExists: false
      };
    }
    
    // Check if a user with this email already exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', customerEmail)
      .maybeSingle();
      
    // User exists if we found a match
    const userExists = !userError && userData !== null;
    
    return {
      isValid: true,
      bookingData,
      userExists
    };
  } catch (error: any) {
    console.error('Error validating booking reference:', error);
    return {
      isValid: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

/**
 * Checks if a user account exists with the given email
 * @param email Email address to check
 * @returns Boolean indicating if a user with this email exists
 */
export const checkUserExistsByEmail = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
      
    return !error && data !== null;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

/**
 * Links a booking to a user account
 * @param bookingReference Booking reference
 * @param userId User ID to link to the booking
 * @returns Success or failure result
 */
export const linkBookingToUser = async (
  bookingReference: string, 
  userId: string
): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase
      .from('trips')
      .update({ user_id: userId })
      .eq('booking_reference', bookingReference);
      
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error linking booking to user:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to link booking to user account'
    };
  }
};