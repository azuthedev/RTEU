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
  // 1. Basic format validation
  const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidFormat) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  // 2. Check for common typos
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

  // 3. For non-common domains, check MX records via Edge Function
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
  if (!commonDomains.includes(domain.toLowerCase())) {
    try {
      const { data, error } = await supabase.functions.invoke('email-verification', {
        body: {
          action: 'validate',
          email
        }
      });

      if (error) {
        console.error('Error validating email:', error);
        return { isValid: true }; // Fallback to valid if service fails
      }

      if (!data.valid) {
        return {
          isValid: false,
          error: 'This email domain does not appear to accept emails'
        };
      }

      if (data.suggested) {
        return {
          isValid: true,
          suggestedEmail: data.suggested
        };
      }
    } catch (err) {
      console.error('Error checking email domain:', err);
      // Fail gracefully - if we can't check, assume it's valid
      return { isValid: true };
    }
  }

  // All checks passed
  return { isValid: true };
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