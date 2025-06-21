import { commonEmailTypos } from './emailTypoSuggestions';
import { supabase } from '../lib/supabase';

// Configuration constants
const OTP_EXPIRY_MINUTES = 15;

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
 * Uses the Edge Function for centralized verification
 */
export const sendOtpEmail = async (
  email: string, 
  name?: string, 
  userId?: string
): Promise<{
  success: boolean;
  verificationId?: string;
  error?: string;
  remainingAttempts?: number;
}> => {
  try {
    console.log(`Sending verification email to ${email}${userId ? ` for user ${userId}` : ''}`);
    console.log(`With name: ${name || 'Not provided'}`);
    
    // Get webhook secret from environment variables
    const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET;
    
    console.log('Webhook secret available:', !!webhookSecret);
    
    if (!webhookSecret) {
      console.error('Missing VITE_WEBHOOK_SECRET environment variable');
      console.log('Available env variables:', Object.keys(import.meta.env)
        .filter(key => !key.includes('KEY') && key !== 'VITE_WEBHOOK_SECRET')
        .join(', '));
      
      return {
        success: false,
        error: 'Server configuration error: Missing webhook authentication'
      };
    }
    
    // Call the Supabase Edge Function
    try {
      console.log('Calling Edge Function with X-Auth header');
      
      // Determine URL based on environment
      const baseUrl = import.meta.env.DEV 
        ? '/api/email-verification'  // Use local proxy in development
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-verification`;
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'X-Auth': webhookSecret
      };
      
      console.log('Request headers:', Object.keys(headers).join(', '));
      console.log('Using base URL:', baseUrl);
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          name, // Explicitly include name in the request
          user_id: userId,
          action: 'send-otp'
        })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429) {
          throw new Error('Too many verification attempts. Please try again later.');
        }
        
        const errorText = await response.text();
        console.error('Error response from Edge Function:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || 'Failed to send verification email');
      }
      
      const data = await response.json();
      console.log('Successful response from Edge Function:', data);
      
      return {
        success: true,
        verificationId: data.verificationId,
        remainingAttempts: data.remainingAttempts
      };
    } catch (fetchError) {
      console.error('Fetch error sending OTP via Edge Function:', fetchError);
      throw fetchError;
    }
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    return {
      success: false,
      error: err.message || 'Failed to send verification code'
    };
  }
};

/**
 * Verifies an OTP code via the Edge Function
 */
export const verifyOtp = async (otp: string, verificationId: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Get webhook secret from environment variables
    const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET;
    
    console.log('Webhook secret available:', !!webhookSecret);
    if (!webhookSecret) {
      console.error('Missing VITE_WEBHOOK_SECRET environment variable');
      console.log('Available env variables:', Object.keys(import.meta.env)
        .filter(key => !key.includes('KEY') && key !== 'VITE_WEBHOOK_SECRET')
        .join(', '));
      
      return {
        success: false,
        error: 'Server configuration error: Missing webhook authentication'
      };
    }
    
    // Call the Edge Function to verify the OTP
    try {
      console.log('Calling verify Edge Function with token and verificationId');
      
      // Determine URL based on environment
      const baseUrl = import.meta.env.DEV 
        ? '/api/email-verification'  // Use local proxy in development
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-verification`;
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'X-Auth': webhookSecret
        },
        body: JSON.stringify({
          token: otp,
          verificationId,
          action: 'verify-otp'
        })
      });
      
      console.log('Verify response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from verify Edge Function:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || 'Invalid verification code');
      }
      
      const data = await response.json();
      
      return { 
        success: data.success
      };
    } catch (fetchError) {
      console.error('Fetch error verifying OTP:', fetchError);
      throw fetchError;
    }
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
  hasPendingVerification?: boolean;
  verificationAge?: number;
  error?: string;
}> => {
  try {
    // Get webhook secret from environment variables
    const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET;
    
    console.log('Webhook secret available:', !!webhookSecret);
    if (!webhookSecret) {
      console.error('Missing VITE_WEBHOOK_SECRET environment variable');
      console.log('Available env variables:', Object.keys(import.meta.env)
        .filter(key => !key.includes('KEY') && key !== 'VITE_WEBHOOK_SECRET')
        .join(', '));
      
      return {
        verified: false,
        exists: false,
        requiresVerification: false,
        error: 'Server configuration error: Missing webhook authentication'
      };
    }
    
    // Determine URL based on environment
    const baseUrl = import.meta.env.DEV 
      ? '/api/email-verification'  // Use local proxy in development
      : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-verification`;
    
    // Call the Edge Function to check verification status
    try {
      console.log('Checking verification status with webhook secret');
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'X-Auth': webhookSecret
        },
        body: JSON.stringify({
          email,
          action: 'check-verification'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from check verification:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || 'Failed to check verification status');
      }
      
      const data = await response.json();
      
      return {
        verified: data.verified,
        exists: data.exists,
        requiresVerification: data.requiresVerification,
        hasPendingVerification: data.hasPendingVerification,
        verificationAge: data.verificationAge
      };
    } catch (fetchError) {
      console.error('Fetch error checking verification status:', fetchError);
      throw fetchError;
    }
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