import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (displayName: string, placeData?: google.maps.places.PlaceResult) => void;
  placeholder: string;
  className?: string;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className = ''
}: GooglePlacesAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  // Flag to prevent onChange being called redundantly during place selection
  const isSelectingRef = useRef(false);

  // Initialize the autocomplete when the component mounts
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;
      
      // Clear any existing autocomplete
      if (placesListenerRef.current && autocompleteRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      setIsLoading(true);

      try {
        // Create a new Autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            // No types restriction to avoid the error, fields include all we need
            fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'],
          }
        );

        // Add listener for place selection
        placesListenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place) {
            isSelectingRef.current = true;
            
            // Get the best display name for the selected place
            const displayName = getDisplayName(place);
            
            if (displayName) {
              // Update the parent component state
              onChange(displayName);
              
              // If onPlaceSelect callback is provided, call it with the display name and place data
              if (onPlaceSelect) {
                onPlaceSelect(displayName, place);
              }
            }
            
            // Reset the selecting flag after a short delay
            setTimeout(() => {
              isSelectingRef.current = false;
            }, 100);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Determine the best display name for a place
    const getDisplayName = (place: google.maps.places.PlaceResult): string => {
      // Check if it's an airport or transport hub
      const isAirport = place.types?.includes('airport') || 
                        place.name?.toLowerCase().includes('airport') ||
                        place.name?.toLowerCase().includes('terminal') ||
                        /\([A-Z]{3}\)/.test(place.name || ''); // Matches airport codes like (MXP)
      
      const isStation = place.types?.includes('transit_station') ||
                        place.types?.includes('train_station') ||
                        place.types?.includes('bus_station') ||
                        place.name?.toLowerCase().includes('station');
                        
      const isPort = place.name?.toLowerCase().includes('port') ||
                     place.name?.toLowerCase().includes('terminal') ||
                     place.name?.toLowerCase().includes('cruise');
      
      // For airports, stations, and ports, prioritize the name
      if (isAirport || isStation || isPort) {
        return place.name || '';
      }
      
      // Next check if we have a descriptive formatted address
      if (place.formatted_address) {
        // For other places like cities, make the formatted address more readable
        return formatAddress(place.formatted_address);
      }
      
      // Fallback to the name
      return place.name || '';
    };

    // Format address to be more readable and clean
    const formatAddress = (address: string): string => {
      // Remove any hyphens or underscores between words
      address = address.replace(/(\w)-(\w)/g, '$1 $2');
      
      // Capitalize each segment for better readability
      const segments = address.split(',');
      const formattedSegments = segments.map(segment => {
        // Trim and capitalize first letter of each word
        return segment.trim().replace(/\b\w/g, c => c.toUpperCase());
      });
      
      // Join segments with commas and spaces for better readability
      return formattedSegments.join(', ');
    };

    // Initialize when Google Maps API is available
    if (window.google?.maps?.places) {
      initializeAutocomplete();
    } else {
      // Poll for Google Maps API availability
      const checkGoogleMapsLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogleMapsLoaded);
          initializeAutocomplete();
        }
      }, 100);

      // Clean up interval
      return () => clearInterval(checkGoogleMapsLoaded);
    }

    return () => {
      // Clean up listeners when component unmounts
      if (placesListenerRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
      }
      
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []); // Only run on mount

  // Handle input changes from user typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only propagate changes if not in the middle of a place selection
    if (!isSelectingRef.current) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`
          w-full pl-10 pr-${isLoading ? '10' : '4'} py-2 
          border border-gray-200 rounded-md 
          focus:outline-none focus:ring-2 focus:ring-blue-600 
          h-[42px] transition-all
          ${isFocused ? 'border-blue-300' : ''}
        `}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}