import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { throttle } from 'lodash-es';
import { initGoogleMaps } from '../../utils/optimizeThirdParty';

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
  const [mapsInitialized, setMapsInitialized] = useState(!!window.google?.maps?.places);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  // Flag to prevent onChange being called redundantly during place selection
  const isSelectingRef = useRef(false);

  // Initialize the autocomplete when the component mounts or maps loads
  useEffect(() => {
    if (!mapsInitialized) {
      setIsLoading(true);
      
      // Try to initialize Google Maps
      if (!window.google?.maps?.places && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        console.log('GooglePlacesAutocomplete: Loading Google Maps API...');
        initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
          .then(success => {
            console.log('GooglePlacesAutocomplete: Google Maps loaded:', success);
            setMapsInitialized(success);
            setIsLoading(false);
          })
          .catch(error => {
            console.error('GooglePlacesAutocomplete: Error loading Google Maps', error);
            setIsLoading(false);
          });
      }
      
      return;
    }

    // Initialize autocomplete when Maps API is ready
    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) {
        console.log('Cannot initialize autocomplete: Input ref or Google Maps missing');
        setIsLoading(false);
        return;
      }
      
      // Clean up any existing listeners
      if (placesListenerRef.current && autocompleteRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      try {
        console.log('Initializing Places Autocomplete');
        setIsLoading(true);
        
        // Create a new Autocomplete instance
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'],
            types: ['geocode', 'establishment', 'address', '(regions)'],
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
        
        console.log('Places Autocomplete initialized successfully');
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initialize autocomplete
    initializeAutocomplete();
    
    // Cleanup when component unmounts
    return () => {
      if (placesListenerRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
      }
      
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapsInitialized, onChange, onPlaceSelect]);

  // Function to determine the best display name for a place
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

  // Handle input changes from user typing, throttled to improve performance
  const handleInputChange = throttle((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only propagate changes if not in the middle of a place selection
    if (!isSelectingRef.current) {
      onChange(e.target.value);
    }
  }, 300);
  
  const handleFocus = () => {
    setIsFocused(true);
    
    // Ensure maps is initialized when field is focused
    if (!mapsInitialized && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setIsLoading(true);
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          setMapsInitialized(success);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading Google Maps on focus:', error);
          setIsLoading(false);
        });
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
        onFocus={handleFocus}
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