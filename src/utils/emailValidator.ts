import { commonEmailTypos } from './emailTypoSuggestions';
import { supabase } from '../lib/supabase';

/**
 * Generates an OTP code in format 0000a0
 * 4 digits, 1 letter, 1 digit
 */
function generateOTP(): string {
  // Generate 4 random digits
  const firstPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Generate a random lowercase letter
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  
  // Generate the last digit
  const lastDigit = Math.floor(Math.random() * 10).toString();
  
  // Combine to form 0000a0 format
  return `${firstPart}${letter}${lastDigit}`;
}

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
 * Uses direct webhook to n8n instead of Supabase Edge Function
 */
export const sendOtpEmail = async (email: string, name?: string): Promise<{
  success: boolean;
  verificationId?: string;
  error?: string;
}> => {
  try {
    console.log(`Sending verification email to ${email}`);
    
    // Generate a new OTP code
    const otpCode = generateOTP();
    console.log(`Generated OTP code: ${otpCode}`);
    
    // Calculate expiration time (15 minutes from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    
    // Store the OTP in the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error checking user:', userError);
    }
    
    // Create verification record in database
    const { data: verificationData, error: insertError } = await supabase
      .from('email_verifications')
      .insert([{
        user_id: userData?.id || null,
        token: otpCode,
        email: email,
        expires_at: expiresAt,
        verified: false
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating verification record:', insertError);
      throw new Error('Failed to create verification record');
    }
    
    const verificationId = verificationData.id;
    
    // Send the actual email using the webhook
    const webhookUrl = 'https://n8n.capohq.com/webhook/rteu-tx-email';
    
    // Log the webhook request
    console.log('Sending webhook request to:', webhookUrl);
    console.log('Webhook payload:', {
      name: name || email.split('@')[0],
      email: email,
      otp_code: otpCode,
      email_type: "OTP"
    });
    
    // Make the POST request to the webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name || email.split('@')[0],
        email: email,
        otp_code: otpCode,
        email_type: "OTP"
      })
    });
    
    if (!webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      console.error('Webhook error:', webhookResponse.status, responseText);
      throw new Error(`Failed to send email: ${webhookResponse.status} ${responseText}`);
    }
    
    console.log('Email sent successfully via webhook');

    return {
      success: true,
      verificationId
    };
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    
    // Try fallback for development environment
    const isDev = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('local-credentialless') ||
      window.location.hostname.includes('webcontainer')
    );
    
    if (isDev) {
      console.log('DEVELOPMENT FALLBACK: Simulating email verification');
      
      try {
        // Generate a fake verification ID
        const otpCode = generateOTP();
        
        // Store in database for dev testing
        const { data, error } = await supabase
          .from('email_verifications')
          .insert([{
            user_id: null,
            token: otpCode,
            email: email,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            verified: false
          }])
          .select()
          .single();
          
        if (error) {
          console.warn('Could not create dev verification record:', error);
          return {
            success: true,
            verificationId: `dev-${Date.now()}`
          };
        }
        
        console.log(`DEVELOPMENT MODE: Generated OTP code: ${otpCode} for testing`);
        console.log(`DEVELOPMENT MODE: Use this code in the verification form`);
        
        return {
          success: true,
          verificationId: data.id
        };
      } catch (devError) {
        console.error('Error in dev fallback:', devError);
        return {
          success: true,
          verificationId: `dev-${Date.now()}`
        };
      }
    }
    
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
    // Check if this is a development verification ID
    if (verificationId.startsWith('dev-')) {
      console.log('DEVELOPMENT MODE: Verification code accepted without validation');
      return { success: true };
    }
    
    // Find the verification record
    const { data: verification, error: verificationError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('id', verificationId)
      .eq('token', otp)
      .single();
    
    if (verificationError) {
      return {
        success: false,
        error: 'Invalid verification code. Please try again or request a new code.'
      };
    }
    
    // Check expiration
    if (new Date(verification.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Verification code has expired. Please request a new code.'
      };
    }
    
    // Mark as verified
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verificationId);
    
    if (updateError) {
      console.error('Error updating verification status:', updateError);
    }
    
    // If we have a user_id, update the user's email_verified status
    if (verification.user_id) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('id', verification.user_id);
      
      if (userUpdateError) {
        console.error('Error updating user verification status:', userUpdateError);
      }
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    
    // Development fallback
    const isDev = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('local-credentialless') ||
      window.location.hostname.includes('webcontainer')
    );
    
    if (isDev) {
      console.log('DEVELOPMENT FALLBACK: Accepting verification code in dev mode');
      return { success: true };
    }
    
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
    // Check if user exists and is verified
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error('Error checking user:', userError);
      throw new Error(userError.message);
    }
    
    // If user doesn't exist or is already verified
    if (!userData) {
      return {
        verified: false,
        exists: false,
        requiresVerification: false
      };
    }
    
    return {
      verified: !!userData.email_verified,
      exists: true,
      requiresVerification: !userData.email_verified
    };
  } catch (err: any) {
    console.error('Error checking email verification:', err);
    
    // Development fallback
    const isDev = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('local-credentialless') ||
      window.location.hostname.includes('webcontainer')
    );
    
    if (isDev) {
      // Provide test cases for development
      const testCases: Record<string, { verified: boolean, exists: boolean, requiresVerification: boolean }> = {
        'verified@example.com': { verified: true, exists: true, requiresVerification: false },
        'unverified@example.com': { verified: false, exists: true, requiresVerification: true },
        'admin@example.com': { verified: true, exists: true, requiresVerification: false }
      };
      
      const emailKey = email.toLowerCase();
      if (testCases[emailKey]) {
        return testCases[emailKey];
      }
      
      // Default test case
      return {
        verified: false,
        exists: true,
        requiresVerification: true
      };
    }
    
    return {
      verified: false,
      exists: false,
      requiresVerification: false,
      error: err.message || 'Failed to check verification status'
    };
  }
};