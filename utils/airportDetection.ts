/**
 * Utility for detecting airports in location strings
 */

// Common airport codes (IATA) for Italian airports
const AIRPORT_CODES = [
  'MXP', 'LIN', 'FCO', 'CIA', 'NAP', 'BLQ', 'VRN', 'TRN', 'PSA', 'CTA', 
  'PMO', 'CAG', 'BRI', 'REG', 'VCE', 'TSF', 'FLR', 'SUF', 'GOA', 'AHO'
];

// Airport keywords in multiple languages
const AIRPORT_KEYWORDS = [
  // English
  'airport', 'terminal', 'arrivals', 'departures',
  // Italian
  'aeroporto', 'aeroporti', 'terminale', 'arrivi', 'partenze',
  // German
  'flughafen',
  // French
  'aéroport',
  // Spanish
  'aeropuerto'
];

// Named airports patterns for specific cases
// Format: [city/name patterns, matching words] - for partial fuzzy matching
const NAMED_AIRPORTS = [
  // Milan airports
  [['milan', 'milano'], ['malpensa', 'linate']],
  // Rome airports
  [['rome', 'roma'], ['fiumicino', 'ciampino', 'leonardo da vinci']],
  // Venice
  [['venice', 'venezia'], ['marco polo']],
  // Florence
  [['florence', 'firenze'], ['peretola', 'amerigo vespucci']],
  // Naples
  [['naples', 'napoli'], ['capodichino']]
];

/**
 * Determines if a location string refers to an airport
 * 
 * @param location The location string to check
 * @returns true if the location is likely an airport
 */
export const isAirport = (location: string): boolean => {
  if (!location) return false;
  
  // Convert to lowercase for case-insensitive matching
  const locationLower = location.toLowerCase();
  
  // 1. Check for airport keywords
  for (const keyword of AIRPORT_KEYWORDS) {
    if (locationLower.includes(keyword)) {
      console.log(`Airport detected via keyword "${keyword}" in "${location}"`);
      return true;
    }
  }
  
  // 2. Check for airport codes
  for (const code of AIRPORT_CODES) {
    // Match full code or code with boundaries (spaces, commas, etc.)
    const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
    if (codeRegex.test(location)) {
      console.log(`Airport detected via code "${code}" in "${location}"`);
      return true;
    }
  }
  
  // 3. Check for specific named airports with city context
  for (const [cityPatterns, airportPatterns] of NAMED_AIRPORTS) {
    // Check if location contains any city pattern
    const hasCityPattern = (cityPatterns as string[]).some(city => 
      locationLower.includes(city)
    );
    
    // Check if location contains any airport pattern
    const hasAirportPattern = (airportPatterns as string[]).some(airport => 
      locationLower.includes(airport)
    );
    
    // If both city and airport patterns match, it's likely an airport
    if (hasCityPattern && hasAirportPattern) {
      console.log(`Airport detected via city/airport name pattern in "${location}"`);
      return true;
    }
  }
  
  // 4. Check for common terminal references
  const terminalRegex = /\bt\d+\b|\bterminal\s*\d+\b|\bterminal\s*[a-z]\b/i;
  if (terminalRegex.test(locationLower)) {
    console.log(`Airport detected via terminal reference in "${location}"`);
    return true;
  }
  
  // 5. Check for "airport" in location description (already covered in keywords)
  
  // 6. No airport detected
  return false;
};

/**
 * Extract the airport name from a location string
 * @param location Location string that contains an airport
 * @returns The extracted airport name or null if not found
 */
export const extractAirportName = (location: string): string | null => {
  if (!location) return null;
  
  const locationLower = location.toLowerCase();
  
  // Try to extract airport code
  for (const code of AIRPORT_CODES) {
    const codeRegex = new RegExp(`\\b${code}\\b`, 'i');
    if (codeRegex.test(location)) {
      // Check common airport naming patterns to extract full name
      const beforeCode = location.split(new RegExp(`\\b${code}\\b`, 'i'))[0].trim();
      const afterCode = location.split(new RegExp(`\\b${code}\\b`, 'i'))[1]?.trim() || '';
      
      // If there's text before the code, it might be the airport name
      if (beforeCode && beforeCode.length > 3) {
        return beforeCode;
      }
      
      // Return the code itself if we can't extract a better name
      return code;
    }
  }
  
  // Try to extract by keywords
  for (const keyword of AIRPORT_KEYWORDS) {
    if (locationLower.includes(keyword)) {
      // Try to find the full name - naive approach but good enough
      const keywordIndex = locationLower.indexOf(keyword);
      const beforeKeyword = location.substring(0, keywordIndex).trim();
      
      if (beforeKeyword && beforeKeyword.length > 3) {
        return beforeKeyword;
      }
      
      // Return what we have
      return location;
    }
  }
  
  // Check for named airports
  for (const [cityPatterns, airportPatterns] of NAMED_AIRPORTS) {
    // If it matches both city and airport patterns, return the best match
    const matchingCity = (cityPatterns as string[]).find(city => 
      locationLower.includes(city)
    );
    
    const matchingAirport = (airportPatterns as string[]).find(airport => 
      locationLower.includes(airport)
    );
    
    if (matchingCity && matchingAirport) {
      return `${matchingCity.charAt(0).toUpperCase() + matchingCity.slice(1)} ${matchingAirport.charAt(0).toUpperCase() + matchingAirport.slice(1)} Airport`;
    }
  }
  
  // Fallback - return the original location
  return location;
};