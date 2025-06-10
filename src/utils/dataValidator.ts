/**
 * Data validation utility for ensuring data integrity
 */

import xss from 'xss';

// API response validation

// For pricing data
interface PricingResponse {
  prices: Array<{
    category: string;
    price: number;
    currency: string;
  }>;
  selected_category: string | null;
  details: {
    pickup_time: string;
    pickup_location: {
      lat: number;
      lng: number;
    };
    dropoff_location: {
      lat: number;
      lng: number;
    };
  };
  version?: string;
  checksum?: string;
}

/**
 * Sanitize string inputs to prevent XSS attacks
 * @param input The string to sanitize
 * @returns Sanitized string safe for rendering
 */
export const sanitizeInput = (input: string): string => {
  // Use the xss library to sanitize the input
  return xss(input, {
    whiteList: {}, // No tags allowed - strip everything
    stripIgnoreTag: true, // Strip all tags
    stripIgnoreTagBody: ['script'], // Remove script tags and their content
  });
};

/**
 * Validates pricing response data structure
 * @param data The pricing data to validate
 * @returns True if the data is valid, false otherwise
 */
export const validatePricingData = (data: any): data is PricingResponse => {
  // Check if data exists and has the right structure
  if (!data || typeof data !== 'object') {
    console.error('Invalid pricing data: not an object');
    return false;
  }
  
  // Check for prices array
  if (!data.prices || !Array.isArray(data.prices) || data.prices.length === 0) {
    console.error('Invalid pricing data: missing or empty prices array');
    return false;
  }
  
  // Validate each price object
  for (const price of data.prices) {
    if (!price || typeof price !== 'object') {
      console.error('Invalid price object in array');
      return false;
    }
    
    if (typeof price.category !== 'string' || price.category.trim() === '') {
      console.error('Invalid price object: missing or invalid category');
      return false;
    }
    
    if (typeof price.price !== 'number' || isNaN(price.price)) {
      console.error('Invalid price object: missing or invalid price');
      return false;
    }
    
    if (typeof price.currency !== 'string' || price.currency.trim() === '') {
      console.error('Invalid price object: missing or invalid currency');
      return false;
    }
  }
  
  // Check if details object exists
  if (!data.details || typeof data.details !== 'object') {
    console.error('Invalid pricing data: missing details object');
    return false;
  }
  
  // Validate details object
  const { details } = data;
  
  // Validate pickup_time
  if (typeof details.pickup_time !== 'string' || !isValidISODate(details.pickup_time)) {
    console.error('Invalid details: missing or invalid pickup_time');
    return false;
  }
  
  // Validate locations
  if (!isValidLocation(details.pickup_location)) {
    console.error('Invalid details: missing or invalid pickup_location');
    return false;
  }
  
  if (!isValidLocation(details.dropoff_location)) {
    console.error('Invalid details: missing or invalid dropoff_location');
    return false;
  }
  
  // Validate API version if present
  if (data.version && typeof data.version !== 'string') {
    console.error('Invalid version: must be a string');
    return false;
  }
  
  // If checksum is present, ensure it's a string
  if (data.checksum !== undefined && typeof data.checksum !== 'string') {
    console.error('Invalid checksum: must be a string');
    return false;
  }
  
  return true;
};

// Helper function to check if a value is a valid ISO date string
const isValidISODate = (dateString: any): boolean => {
  if (typeof dateString !== 'string') return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
};

// Helper function to validate location coordinates
const isValidLocation = (location: any): boolean => {
  if (!location || typeof location !== 'object') return false;
  
  const { lat, lng } = location;
  
  if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
    return false;
  }
  
  // Check if coordinates are within valid range
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  
  return true;
};

/**
 * Calculates a simple checksum for a data object
 * @param data The data to generate a checksum for
 * @returns A string checksum
 */
export const generateChecksum = (data: any): string => {
  try {
    // Create a stable representation of the data
    // Skip fields that could change but aren't important for data integrity
    const dataToHash = { ...data };
    
    // Remove fields that are not relevant for checksum
    delete dataToHash.timestamp;
    delete dataToHash.__v;
    delete dataToHash.meta;
    delete dataToHash.checksum;
    
    // Create a JSON string sorted by keys for deterministic output
    const jsonStr = JSON.stringify(dataToHash, Object.keys(dataToHash).sort());
    
    // Implement a more robust hashing algorithm
    let hash = 5381; // DJB2 hash initial value
    
    for (let i = 0; i < jsonStr.length; i++) {
      // DJB2 hash algorithm
      const char = jsonStr.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; // hash * 33 + char
    }
    
    // Convert to a positive hexadecimal string
    return Math.abs(hash).toString(16).padStart(8, '0');
  } catch (error) {
    console.error('Error generating checksum:', error);
    return '';
  }
};

/**
 * Verifies a checksum against data
 * @param data The data to verify
 * @param checksum The checksum to compare against
 * @returns True if the checksum matches
 */
export const verifyChecksum = (data: any, checksum: string): boolean => {
  if (!data || !checksum) return false;
  
  const calculatedChecksum = generateChecksum(data);
  return calculatedChecksum === checksum;
};

/**
 * Validates that URL params match the current booking context
 */
export const validateUrlParamsWithContext = (
  params: { 
    from?: string; 
    to?: string; 
    type?: string; 
    date?: string; 
    returnDate?: string; 
    passengers?: string 
  },
  context: any
): boolean => {
  // Check for missing params
  if (!params.from || !params.to || !params.type || !params.date) {
    console.error('Missing required URL parameters');
    return false;
  }
  
  // Check if context values match URL params
  const fromDecoded = decodeURIComponent(params.from).replace(/-/g, ' ');
  const toDecoded = decodeURIComponent(params.to).replace(/-/g, ' ');
  
  const fromMatches = 
    context.from === fromDecoded || 
    context.fromDisplay === fromDecoded;
    
  const toMatches = 
    context.to === toDecoded || 
    context.toDisplay === toDecoded;
    
  const dateMatches = context.departureDate === params.date;
  
  const returnDateMatches = 
    (context.returnDate === params.returnDate) || 
    (!context.returnDate && (params.returnDate === '0' || !params.returnDate));
    
  const typeMatches = 
    (params.type === '2' && context.isReturn === true) || 
    (params.type === '1' && context.isReturn === false);
    
  const passengersMatch = context.passengers === parseInt(params.passengers || '1', 10);
  
  return fromMatches && toMatches && dateMatches && returnDateMatches && typeMatches && passengersMatch;
};

/**
 * Sanitize all string fields in an object recursively
 * @param obj The object to sanitize
 * @returns Sanitized object
 */
export const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Sanitize string values
        result[key] = sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        result[key] = Array.isArray(value)
          ? value.map(item => typeof item === 'object' ? sanitizeObject(item) : item)
          : sanitizeObject(value);
      } else {
        // Keep non-string values as is
        result[key] = value;
      }
    }
  }
  
  return result;
};

/**
 * Validate and sanitize URL parameters for security
 */
export const validateAndSanitizeUrlParams = (
  params: Record<string, string>
): Record<string, string> => {
  const result: Record<string, string> = {};
  
  // List of allowed params
  const allowedParams = ['from', 'to', 'type', 'date', 'returnDate', 'passengers'];
  
  for (const key in params) {
    // Only allow whitelisted params
    if (allowedParams.includes(key)) {
      // Sanitize the value
      result[key] = sanitizeInput(params[key]);
    }
  }
  
  return result;
};