import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { throttle } from 'lodash-es';
import { initGoogleMaps, isGoogleMapsLoaded } from '../../utils/optimizeThirdParty';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (displayName: string, placeData?: google.maps.places.PlaceResult) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className = '',
  disabled = false
}: GooglePlacesAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(isGoogleMapsLoaded());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  
  // Flag to prevent onChange being called redundantly during place selection
  const isSelectingRef = useRef(false);
  const pendingInitRef = useRef(false);

  // Load Google Maps API when needed (on focus or mount if we already need it)
  useEffect(() => {
    // If API is already loaded, we're good
    if (isGoogleMapsLoaded()) {
      setApiLoaded(true);
      return;
    }
    
    const loadMapsApi = async () => {
      if (!pendingInitRef.current && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        pendingInitRef.current = true;
        setIsLoading(true);
        setError(null);
        
        try {
          const success = await initGoogleMaps(
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY, 
            ['places']
          );
          
          setApiLoaded(success);
          if (!success) {
            setError('Could not load Google Maps');
          }
        } catch (err) {
          console.error('Error loading Google Maps:', err);
          setError('Failed to load Maps API');
        } finally {
          setIsLoading(false);
          pendingInitRef.current = false;
        }
      }
    };
    
    // Load Maps API on mount to ensure it's ready when needed
    loadMapsApi();
  }, []);

  // Initialize autocomplete when component mounts or Maps API loads
  useEffect(() => {
    if (!apiLoaded || !inputRef.current) return;
    
    // Set up autocomplete
    try {
      setIsLoading(true);
      
      // Clean up any existing listeners
      if (placesListenerRef.current && autocompleteRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      
      // Create a new Autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'],
          // Fixed: Using 'geocode' type which is a broader category that allows mixing of address types
          types: ['geocode']
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
      
      setError(null);
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setError('Error setting up autocomplete');
    } finally {
      setIsLoading(false);
    }

    // Cleanup when component unmounts
    return () => {
      if (placesListenerRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
      }
      
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiLoaded, onChange, onPlaceSelect]);

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

  // Handle input changes from user typing, throttled to prevent API spam
  const handleInputChange = throttle((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only propagate changes if not in the middle of a place selection
    if (!isSelectingRef.current) {
      onChange(e.target.value);
    }
  }, 300);
  
  const handleFocus = async () => {
    if (disabled) return;
    
    setIsFocused(true);
    
    // Load Maps API if not already loaded
    if (!apiLoaded && !pendingInitRef.current) {
      pendingInitRef.current = true;
      setIsLoading(true);
      setError(null);
      
      try {
        const success = await initGoogleMaps(
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY, 
          ['places']
        );
        
        setApiLoaded(success);
        if (!success) {
          setError('Could not load Maps API');
        }
      } catch (err) {
        console.error('Error loading Google Maps on focus:', err);
        setError('Failed to load Maps API');
      } finally {
        setIsLoading(false);
        pendingInitRef.current = false;
      }
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
        disabled={disabled}
        className={`
          w-full pl-10 pr-${isLoading || error ? '10' : '4'} py-2 
          border ${error ? 'border-red-300' : 'border-gray-200'} 
          rounded-md 
          focus:outline-none focus:ring-2 focus:${error ? 'ring-red-300' : 'ring-blue-600'}
          h-[42px] transition-all
          ${isFocused ? error ? 'border-red-300' : 'border-blue-300' : ''}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
      {error && !isLoading && (
        <div className="absolute right-3 top-3" title={error}>
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
      )}
    </div>
  );
}