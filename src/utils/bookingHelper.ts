/**
 * Generates a booking reference in the format 0000a0
 * Format explanation:
 * - First 4 characters: Numeric digits (0-9)
 * - 5th character: Lowercase letter (a-z)
 * - 6th character: Numeric digit (0-9)
 * 
 * @returns {string} A formatted booking reference
 */
export const generateBookingReference = (): string => {
  // Generate 4 random digits
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  
  // Generate a random lowercase letter (ASCII 97-122 are lowercase a-z)
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  
  // Generate the last digit
  const lastDigit = Math.floor(Math.random() * 10);
  
  // Combine all parts
  return `${digits}${letter}${lastDigit}`;
};

/**
 * Estimate distance between two locations (very rough approximation)
 * This is only used for initial estimates before admin sets proper values
 * 
 * @param {string} from - From location (city name)
 * @param {string} to - To location (city name)
 * @returns {number} - Estimated distance in kilometers
 */
export const estimateDistance = (from: string, to: string): number => {
  // This is a very rough placeholder implementation
  // In a real app, this would use Google Maps Distance Matrix API or similar
  
  // If locations are the same or we don't have data, return a default value
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
    return 10; // Default distance in km
  }
  
  // A very basic distance map between common cities
  const distanceMap: Record<string, Record<string, number>> = {
    'rome': {
      'fiumicino': 30,
      'naples': 220,
      'florence': 280,
      'milan': 570
    },
    'milan': {
      'malpensa': 50,
      'rome': 570,
      'venice': 270,
      'florence': 300
    },
    'florence': {
      'pisa': 85,
      'rome': 280,
      'milan': 300
    }
  };
  
  // Try to find the distance in our map
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();
  
  if (distanceMap[fromLower]?.[toLower]) {
    return distanceMap[fromLower][toLower];
  }
  
  if (distanceMap[toLower]?.[fromLower]) {
    return distanceMap[toLower][fromLower];
  }
  
  // If we can't find it in our map, return a default based on string length
  // This is just a dummy placeholder for demonstration
  return 50 + (from.length + to.length);
};

/**
 * Estimate duration of a trip based on distance
 * 
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} - Estimated duration in minutes
 */
export const estimateDuration = (distanceKm: number): number => {
  // Assume average speed of 60km/h = 1km/min
  // Add 20 minutes as buffer for traffic, stops, etc.
  return Math.ceil(distanceKm) + 20;
};