import { commonEmailTypos } from './emailTypoSuggestions';
import { supabase } from '../lib/supabase';

/**
 * Validates an email address and returns any corrections or validation issues
 */
export const validateEmail = async (email: string): Promise<{
  isValid: boolean;
  suggestedEmail?: string;
  error?: string;
}> => {
  // Basic format validation with more permissive regex
  const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidFormat) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  // Split email into local part and domain
  const [localPart, domain] = email.toLowerCase().split('@');
  if (!domain) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  // Look for typos in known domains using our comprehensive list
  for (const [correctDomain, typos] of Object.entries(commonEmailTypos)) {
    if (typos.includes(domain)) {
      const suggestedEmail = `${localPart}@${correctDomain}`;
      return {
        isValid: true, // Consider it valid but with suggestion
        suggestedEmail
      };
    }
  }

  // Common domains are always considered valid
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 
    'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com',
    'gmx.com', 'live.com', 'me.com', 'mac.com', 'msn.com'
  ];
  
  if (commonDomains.includes(domain.toLowerCase())) {
    return { isValid: true };
  }

  // For unknown domains, check MX records using the API
  try {
    const response = await fetch(`https://api.api-ninjas.com/v1/mxlookup?domain=${domain}`, {
      headers: {
        'X-Api-Key': '1fL7m1+wL7GjmkJKSVz0Mw==L0Fc9vi9AVFpoThd'
      }
    });

    if (!response.ok) {
      console.warn('MX lookup API error:', response.status);
      // Fail open - if API is down, consider the email valid
      return { isValid: true };
    }

    const mxRecords = await response.json();
    
    // If there are MX records, the domain can receive email
    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return { isValid: true };
    }
    
    // No MX records found
    return {
      isValid: false,
      error: 'This email domain does not appear to accept emails'
    };
    
  } catch (error) {
    console.error('Error checking MX records:', error);
    // Fail open - assume valid if check fails
    return { isValid: true };
  }
};

/**
 * Sends an OTP verification code to the provided email
 */
export const sendOtpEmail = async (email: string, name?: string): Promise<{
  success: boolean;
  verificationId?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('email-verification', {
      body: {
        action: 'send-otp',
        email,
        name
      }
    });

    if (error || !data.success) {
      throw new Error(error?.message || data?.error || 'Failed to send verification code');
    }

    return {
      success: true,
      verificationId: data.verificationId
    };
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    return {
      success: false,
      error: err.message || 'Failed to send verification code'
    };
  }
};

/**
 * Verifies an OTP code
 */
export const verifyOtp = async (otp: string, verificationId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('email-verification', {
      body: {
        action: 'verify-otp',
        otp,
        verificationId
      }
    });

    if (error || !data.success) {
      throw new Error(error?.message || data?.error || 'Failed to verify code');
    }

    return {
      success: true
    };
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    return {
      success: false,
      error: err.message || 'Failed to verify code'
    };
  }
};

/**
 * Checks if an email has been verified
 */
export const checkEmailVerification = async (email: string): Promise<{
  verified: boolean;
  exists: boolean;
  requiresVerification: boolean;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('email-verification', {
      body: {
        action: 'check-verification',
        email
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      verified: data.verified || false,
      exists: data.exists || false,
      requiresVerification: data.requiresVerification || false
    };
  } catch (err: any) {
    console.error('Error checking email verification:', err);
    return {
      verified: false,
      exists: false,
      requiresVerification: false,
      error: err.message || 'Failed to check verification status'
    };
  }
};