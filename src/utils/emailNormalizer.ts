/**
 * Utility functions for normalizing and validating email addresses
 */

/**
 * Normalizes an email address by:
 * - Converting to lowercase
 * - Trimming whitespace
 * - Replacing URL-encoded @ symbol (%40)
 * 
 * @param email The email address to normalize
 * @returns The normalized email address
 */
export const normalizeEmail = (email: string): string => {
  if (!email) return '';
  
  // First decode any URL encoding
  let decoded = email;
  try {
    // Try to decode if it looks URL-encoded
    if (email.includes('%')) {
      decoded = decodeURIComponent(email);
    }
  } catch (e) {
    // If decoding fails, continue with original string
    console.warn('Failed to decode email:', e);
  }
  
  // Then replace any remaining %40 with @, trim whitespace, and convert to lowercase
  return decoded.replace(/%40/g, '@').trim().toLowerCase();
};

/**
 * Checks if an email is valid
 * 
 * @param email The email address to validate
 * @returns True if the email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalizeEmail(email));
};

/**
 * Compares two email addresses in a case-insensitive way
 * 
 * @param email1 The first email address
 * @param email2 The second email address
 * @returns True if the emails match (case-insensitive), false otherwise
 */
export const emailsMatch = (email1: string, email2: string): boolean => {
  if (!email1 || !email2) return false;
  
  return normalizeEmail(email1) === normalizeEmail(email2);
};