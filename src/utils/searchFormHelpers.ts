/**
 * Helper functions for the SearchForm component
 */
import { initGoogleMaps } from './optimizeThirdParty';
import { errorTracker, ErrorContext, ErrorSeverity } from './errorTracker';
import { sanitizeInput } from './dataValidator';

// Formatter for date URL parameters (includes time information - YYMMDDHHMM format)
export const formatDateForUrl = (date: Date): string => {
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}`;
};

// Parse date from URL parameters (extracts both date and time components)
export const parseDateFromUrl = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr === '0') {
    return undefined;
  }
  
  try {
    const year = parseInt(`20${dateStr.slice(0, 2)}`);
    const month = parseInt(dateStr.slice(2, 4)) - 1; // JS months are 0-indexed
    const day = parseInt(dateStr.slice(4, 6));
    
    // Check if time information is included (YYMMDDHHMM format)
    const hasTimeComponent = dateStr.length === 10;
    
    // Extract hours and minutes if available, otherwise default to minimum booking time
    let hours = 0;
    let minutes = 0;
    
    if (hasTimeComponent) {
      hours = parseInt(dateStr.slice(6, 8));
      minutes = parseInt(dateStr.slice(8, 10));
    }
    
    // Create date with extracted time
    const parsedDate = new Date(year, month, day, hours, minutes, 0);
    
    // If date is invalid, return undefined
    if (isNaN(parsedDate.getTime())) {
      return undefined;
    }
    
    // Get current time plus minimum booking time
    const now = new Date();
    const minBookingHoursAhead = 4; // Minimum 4 hours in the future
    const minBookingTime = new Date(now.getTime() + minBookingHoursAhead * 60 * 60 * 1000);
    
    // If no time component was provided or the parsed date is today with default time
    if (!hasTimeComponent) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (new Date(year, month, day).getTime() === today.getTime()) {
        // For today, ensure time is at least min booking hours ahead
        parsedDate.setHours(minBookingTime.getHours(), minBookingTime.getMinutes(), 0, 0);
      }
    }
    
    // Ensure the booking time meets the minimum requirement
    if (parsedDate.getTime() < minBookingTime.getTime()) {
      return minBookingTime;
    }
    
    return parsedDate;
  } catch (error) {
    console.error('Error parsing date:', error);
    return undefined;
  }
};

// Format a date as display string for UI
export const formatDateTimeForDisplay = (date: Date | undefined): string => {
  if (!date) return 'Not specified';
  
  try {
    // Use more compact format dd/MM/yyyy HH:mm
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } catch (e) {
    console.error('Error formatting date for display:', e);
    return date.toString();
  }
};

// Format date and time separately
export const formatDateTimeComponents = (date: Date | undefined): { date: string, time: string } => {
  if (!date) return { date: 'Not specified', time: 'Not specified' };
  
  try {
    return {
      date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`,
      time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
    };
  } catch (e) {
    console.error('Error formatting date/time components:', e);
    return {
      date: date.toLocaleDateString() || 'Not specified',
      time: date.toLocaleTimeString() || 'Not specified'
    };
  }
};

// Geocode an address with multiple retries and enhanced error handling
export const geocodeAddress = async (
  address: string, 
  field: 'pickup' | 'dropoff',
  placeId?: string | null
): Promise<{lat: number, lng: number} | null> => {
  if (!address) {
    return null;
  }
  
  // Ensure Google Maps is available
  if (!window.google?.maps) {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        await initGoogleMaps(apiKey, ['places']);
      } else {
        throw new Error('Google Maps API key is missing');
      }
    } catch (error) {
      errorTracker.trackError(
        error instanceof Error ? error : new Error('Failed to load Google Maps'),
        ErrorContext.GEOCODING,
        ErrorSeverity.MEDIUM,
        { field, address }
      );
      return null;
    }
  }
  
  // Try geocoding with place_id first if available (most accurate)
  if (placeId && window.google?.maps?.places?.PlacesService) {
    try {
      console.log(`Geocoding ${field} using place_id: ${placeId}`);
      
      // Create a dummy element for the PlacesService
      const dummyElement = document.createElement('div');
      const placesService = new google.maps.places.PlacesService(dummyElement);
      
      // Fetch place details with a Promise wrapper
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          { 
            placeId, 
            fields: ['geometry', 'formatted_address', 'name']
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Failed to get place details: ${status}`));
            }
          }
        );
      });
      
      // Extract coordinates
      if (placeDetails.geometry && placeDetails.geometry.location) {
        const location = {
          lat: placeDetails.geometry.location.lat(),
          lng: placeDetails.geometry.location.lng()
        };
        
        console.log(`Successfully geocoded ${field} using place_id:`, location);
        return location;
      }
    } catch (error) {
      console.warn(`Place details geocoding failed for ${field}, falling back to standard geocoding:`, error);
      // Continue to standard geocoding as fallback
    }
  }
  
  // Standard geocoding as a fallback
  if (!window.google?.maps?.Geocoder) {
    return null;
  }
  
  const sanitizedAddress = sanitizeInput(address);
  const geocoder = new google.maps.Geocoder();
  
  // Try geocoding with retries
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Geocoding attempt ${attempt + 1}/${maxRetries + 1} for ${field}: "${sanitizedAddress}"`);
      
      // Use a Promise to wrap the geocoding request
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: sanitizedAddress }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
      
      // Return the coordinates from the first result
      if (results[0].geometry?.location) {
        const location = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        
        console.log(`Successfully geocoded ${field} on attempt ${attempt + 1}:`, location);
        return location;
      }
      
      throw new Error('No geometry in geocoding results');
    } catch (error) {
      console.error(`Geocoding attempt ${attempt + 1} failed for ${field}:`, error);
      
      // If this was the last attempt, track the error and return null
      if (attempt === maxRetries) {
        errorTracker.trackError(
          error instanceof Error ? error : new Error('Geocoding failed'),
          ErrorContext.GEOCODING,
          ErrorSeverity.MEDIUM,
          { field, address: sanitizedAddress, attempt }
        );
        return null;
      }
      
      // Otherwise, wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  return null;
};

// Validate if an address is suitable for transfers
export const validateTransferAddress = (
  address: string,
  location?: {lat: number, lng: number} | null
): { isValid: boolean, message?: string } => {
  // Always valid if we have coordinates
  if (location) {
    return { isValid: true };
  }
  
  // Check if it's an airport or transportation hub
  const transportationHubRegex = /\b(airport|aeroporto|terminal|station|stazione|MXP|LIN|FCO|CIA|NAP|arrivals|arrivi)\b/i;
  if (transportationHubRegex.test(address)) {
    return { isValid: true };
  }
  
  // Check for specific address patterns
  const hasStreetWithNumber = /\b\w+\s+\w+\s+\d+\b/i.test(address); // e.g., "Via Roma 42"
  if (hasStreetWithNumber) {
    return { isValid: true };
  }
  
  // Check for specific place names (more than 2 words)
  const wordCount = address.split(/\s+/).length;
  if (wordCount >= 3) {
    return { isValid: true };
  }
  
  // If we reach here, the address is not valid for transfers
  return { 
    isValid: false, 
    message: 'Please enter a complete address with street name and number, or select a suggestion from the dropdown.' 
  };
};

// Gets minimum allowed booking time (4 hours from now)
export const getMinimumBookingTime = (): Date => {
  const now = new Date();
  const minBookingHoursAhead = 4; // Minimum 4 hours in the future
  const minBookingTime = new Date(now.getTime() + minBookingHoursAhead * 60 * 60 * 1000);
  
  return minBookingTime;
};

// Check if a date meets the minimum booking time requirement
export const isValidBookingTime = (date: Date | undefined): boolean => {
  if (!date) return false;
  
  const minBookingTime = getMinimumBookingTime();
  return date.getTime() >= minBookingTime.getTime();
};
