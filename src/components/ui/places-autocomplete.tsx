import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder,
  className = ''
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const placesListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    // Check if Google Maps API is ready
    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initializeAutocomplete();
      } else {
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };
    
    // Initialize the autocomplete
    const initializeAutocomplete = () => {
      if (!inputRef.current || isInitialized) return;
      
      setIsLoading(true);

      try {
        // Initialize Google Places Autocomplete
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['geocode'], // Only use 'geocode' type to avoid mixing error
            fields: ['formatted_address', 'geometry', 'name', 'address_components']
          }
        );

        // Add listener for place selection
        placesListenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place) {
            // Prefer formatted_address as it's the most complete representation
            if (place.formatted_address) {
              onChange(place.formatted_address);
            } else if (place.name) {
              onChange(place.name);
            }
          }
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkGoogleMapsLoaded();

    // Cleanup function
    return () => {
      if (placesListenerRef.current) {
        google.maps.event.removeListener(placesListenerRef.current);
        placesListenerRef.current = null;
      }
      
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [onChange, isInitialized]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 h-[42px]"
      />
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
    </div>
  );
}