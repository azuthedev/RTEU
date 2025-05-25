/**
 * Centralized configuration and messages for the email verification system
 */

export const VerificationConfig = {
  // Timing settings
  OTP_EXPIRY_MINUTES: 15,
  MIN_RESEND_INTERVAL_SECONDS: 60, // Minimum time before allowing resend
  
  // OTP format settings
  OTP_LENGTH: 6, // Must match the regex pattern below
  OTP_PATTERN: /^\d{2}[a-z]\d{3}$/, // Format: 00a000 (2 digits, 1 letter, 3 digits)
  
  // Rate limiting
  RESEND_LIMIT_PER_HOUR: 5, // Maximum number of verification emails per hour
  
  // Development settings
  DEV_MODE_PREFIX: 'dev-',
  
  // URLs
  VERIFICATION_ENDPOINT: '/functions/v1/email-verification',
  VERIFICATION_VERIFY_ENDPOINT: '/functions/v1/email-verification/verify',
  
  // UI settings
  SHOW_SPAM_WARNING_AFTER_SECONDS: 15,
  
  // Error messages
  ERRORS: {
    EXPIRED: 'This verification code has expired. Please request a new one.',
    INVALID: 'Invalid verification code. Please check and try again.',
    RATE_LIMITED: 'Too many verification attempts. Please try again later.',
    MISSING_CODE: 'Please enter all 6 characters of the verification code',
    EMAIL_REQUIRED: 'Please enter your email address',
    SEND_FAILED: 'Failed to send verification code. Please try again.',
    USER_NOT_FOUND: 'No account found with this email address',
    ALREADY_VERIFIED: 'Your email has already been verified',
    GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
  },
  
  // Success messages
  SUCCESS: {
    VERIFIED: 'Your email has been successfully verified',
    EMAIL_SENT: 'Verification email sent successfully'
  },
  
  // Help messages
  HELP: {
    SPAM_FOLDER: 'Don\'t see the email? Check your spam/junk folder.',
    CHECK_EMAIL: 'Please check your email for a verification link.',
    EXPIRES_SOON: 'This code will expire soon. Need a new one?',
    VERIFICATION_LINK: 'You can also use the verification link sent to your email.'
  }
};

/**
 * Helper functions for verification system
 */

// Check if a verification ID is from the development environment
export const isDevVerificationId = (id?: string): boolean => {
  return !!id && id.startsWith(VerificationConfig.DEV_MODE_PREFIX);
};

// Check if the current environment is development
export const isDevEnvironment = (): boolean => {
  return typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('local-credentialless') ||
    window.location.hostname.includes('webcontainer')
  );
};