import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { throttle } from 'lodash-es';
import { initGoogleMaps, isGoogleMapsLoaded } from '../../utils/optimizeThirdParty';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (displayName: string, placeData?: google.maps.places.PlaceResult) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
  onValidation?: (isValid: boolean, message?: string) => void;
  required?: boolean;
  id?: string;
  initialIsValid?: boolean; // Added to support initializing with validation state
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className = '',
  disabled = false,
  onValidation,
  required = false,
  id,
  initialIsValid = false // Default to false unless explicitly provided
}: GooglePlacesAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(isGoogleMapsLoaded());
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(initialIsValid);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [isGeocoded, setIsGeocoded] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  
  // Flag to prevent onChange being called redundantly during place selection
  const isSelectingRef = useRef(false);
  const pendingInitRef = useRef(false);
  const autocompleteInitializedRef = useRef(false);

  // Load Google Maps API on mount, but only if not already loaded
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

    return () => {
      // Clean up on component unmount
      pendingInitRef.current = false;
    };
  }, []);

  // When initialIsValid changes, update the validation state
  useEffect(() => {
    setIsValidAddress(initialIsValid);
    
    // If we're setting to valid, also clear any error messages
    if (initialIsValid) {
      setValidationMessage(null);
      setGeocodingError(null);
    }
  }, [initialIsValid]);

  // Apply custom styles and position the dropdown
  useEffect(() => {
    // Cleanup previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    // Apply CSS to fix the dropdown position relative to the input
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if a pac-container was added
          const pacContainers = document.querySelectorAll('.pac-container');
          
          pacContainers.forEach((container) => {
            // Check if this container is newly added
            if (!(container as HTMLElement).dataset.styled) {
              // Find the corresponding input element
              const inputRect = inputRef.current?.getBoundingClientRect();
              if (inputRect) {
                // Position the dropdown correctly
                (container as HTMLElement).style.width = `${inputRect.width}px`;
                (container as HTMLElement).style.marginLeft = '0';
                (container as HTMLElement).style.marginTop = '5px';
                (container as HTMLElement).style.zIndex = '2000'; // Ensure high z-index
                (container as HTMLElement).dataset.styled = 'true';
              }
            }
          });
        }
      });
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Store the observer reference
    observerRef.current = observer;
    
    // Cleanup when component unmounts
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Initialize autocomplete when component mounts or Maps API loads
  useEffect(() => {
    // Only proceed if API is loaded, input ref exists, and we haven't already initialized
    if (!apiLoaded || !inputRef.current || autocompleteInitializedRef.current) return;
    
    // Set up autocomplete
    try {
      setIsLoading(true);
      
      // Clean up any existing listeners before creating a new instance
      if (placesListenerRef.current && autocompleteRef.current && google?.maps?.event) {
        google.maps.event.removeListener(placesListenerRef.current);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
        placesListenerRef.current = null;
      }
      
      // Fallback to legacy Autocomplete API
      if (google.maps.places.Autocomplete) {
        // Create a new Autocomplete instance - ONCE
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ['formatted_address', 'geometry', 'name', 'address_components', 'place_id', 'types'],
          }
        );

        // Add listener for place selection
        if (google.maps.event) {
          placesListenerRef.current = google.maps.event.addListener(
            autocompleteRef.current,
            'place_changed', 
            () => {
              const place = autocompleteRef.current?.getPlace();
              
              if (place) {
                isSelectingRef.current = true;
                
                // Store the place_id for future geocoding
                if (place.place_id) {
                  setPlaceId(place.place_id);
                  console.log('Stored place_id:', place.place_id);
                }
                
                // Get the best display name for the selected place
                const displayName = getDisplayName(place);
                
                // Validate address completeness
                const isValidPlace = validateAddressCompleteness(place);
                setIsValidAddress(isValidPlace.isValid);
                setValidationMessage(isValidPlace.message);
                
                if (onValidation) {
                  onValidation(isValidPlace.isValid, isValidPlace.message || undefined);
                }
                
                // Reset geocoding state for new selection
                setIsGeocoded(false);
                setGeocodingError(null);
                
                if (displayName) {
                  // Update the parent component state
                  onChange(displayName);
                  
                  // If onPlaceSelect callback is provided, call it with the display name and place data
                  if (onPlaceSelect) {
                    onPlaceSelect(displayName, place);
                  }
                  
                  // Immediately geocode the place if we have geometry
                  if (place.geometry && place.geometry.location) {
                    // Already has coordinates, no need to geocode
                    setIsGeocoded(true);
                  } else if (place.place_id) {
                    // If we have a place_id but no geometry, fetch details to get coordinates
                    geocodePlaceById(place.place_id);
                  }
                }
                
                // Reset the selecting flag after a short delay
                setTimeout(() => {
                  isSelectingRef.current = false;
                }, 100);
              }
            }
          );
        } else {
          console.error("Google Maps event handler not found");
          setError("Maps API not fully loaded");
        }
        
        // Mark as initialized to prevent multiple instances
        autocompleteInitializedRef.current = true;
      } else {
        setError('Google Maps Places API not available');
      }
      
      setError(null);
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setError('Error setting up autocomplete');
    } finally {
      setIsLoading(false);
    }
  }, [apiLoaded, onChange, onPlaceSelect, onValidation]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clean up listeners and instances
      if (placesListenerRef.current && autocompleteRef.current && google?.maps?.event) {
        google.maps.event.removeListener(placesListenerRef.current);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        placesListenerRef.current = null;
        autocompleteRef.current = null;
      }
      
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      // Reset initialization flags
      autocompleteInitializedRef.current = false;
    };
  }, []);

  // Geocode place by ID using Places API
  const geocodePlaceById = async (placeId: string) => {
    if (!window.google?.maps?.places?.PlacesService) {
      console.error('Places service not available');
      setGeocodingError('Places API not available');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a PlacesService instance (requires a DOM element)
      const dummyElement = document.createElement('div');
      const placesService = new google.maps.places.PlacesService(dummyElement);
      
      // Fetch place details with a Promise wrapper
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.getDetails(
          { 
            placeId: placeId,
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
      
      // Check if we got valid coordinates
      if (placeDetails.geometry && placeDetails.geometry.location) {
        console.log('Successfully geocoded place by ID:', {
          placeId,
          lat: placeDetails.geometry.location.lat(),
          lng: placeDetails.geometry.location.lng()
        });
        
        setIsGeocoded(true);
        setGeocodingError(null);
        
        // Update validation state
        setIsValidAddress(true);
        setValidationMessage(null);
        
        if (onValidation) {
          onValidation(true);
        }
        
        // If we have a new formatted_address, update the display value
        if (placeDetails.formatted_address && placeDetails.formatted_address !== value) {
          onChange(placeDetails.formatted_address);
        }
        
        // If onPlaceSelect callback is provided, call it with the updated place data
        if (onPlaceSelect) {
          onPlaceSelect(
            placeDetails.formatted_address || value, 
            placeDetails
          );
        }
      } else {
        throw new Error('Place details returned without valid geometry');
      }
    } catch (error) {
      console.error('Error geocoding place by ID:', error);
      setGeocodingError(`Unable to find coordinates for this address. Please try a different address.`);
      
      // Update validation state
      setIsValidAddress(false);
      setValidationMessage('This address cannot be used for transfers. Please select another address.');
      
      if (onValidation) {
        onValidation(false, 'Unable to find coordinates for this address');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to determine the best display name for a place
  const getDisplayName = (place: google.maps.places.PlaceResult): string => {
    // Check if it's an airport or transport hub
    const isAirport = place.types?.includes('airport') || 
                     place.name?.toLowerCase().includes('airport') ||
                     place.name?.toLowerCase().includes('aeroporto') ||
                     place.name?.toLowerCase().includes('terminal') ||
                     /\b(MXP|LIN|FCO|CIA|NAP)\b/.test(place.name || ''); // Matches airport codes
    
    const isStation = place.types?.includes('transit_station') ||
                     place.types?.includes('train_station') ||
                     place.types?.includes('bus_station') ||
                     place.name?.toLowerCase().includes('station') ||
                     place.name?.toLowerCase().includes('stazione');
                     
    const isPort = place.name?.toLowerCase().includes('port') ||
                   place.name?.toLowerCase().includes('terminal') ||
                   place.name?.toLowerCase().includes('cruise');
    
    // For airports, stations, and ports, prioritize the name
    if (isAirport || isStation || isPort) {
      return place.name || place.formatted_address || '';
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

  // Validate that the address is complete enough
  const validateAddressCompleteness = (place: google.maps.places.PlaceResult): { isValid: boolean, message: string | null } => {
    // Always valid for airports, stations, and specific place types
    if (
      place.types?.includes('airport') ||
      place.types?.includes('transit_station') ||
      place.types?.includes('train_station') ||
      place.types?.includes('bus_station') ||
      place.types?.includes('establishment')
    ) {
      return { isValid: true, message: null };
    }

    // For addresses, we need to validate completeness
    if (place.address_components) {
      // Check if address has a street number component
      const hasStreetNumber = place.address_components.some(
        component => component.types.includes('street_number')
      );
      
      // Check if address has a route (street name) component
      const hasRoute = place.address_components.some(
        component => component.types.includes('route')
      );
      
      // Check if we only have high-level components (like just a city name)
      const onlyHighLevelComponents = place.address_components.every(
        component => 
          component.types.includes('locality') || 
          component.types.includes('administrative_area_level_1') ||
          component.types.includes('administrative_area_level_2') ||
          component.types.includes('country')
      );

      // Check for specific establishment types
      const isEstablishment = place.types?.includes('establishment') || 
                              place.types?.includes('point_of_interest');

      // Address is valid if it has place_id and has coordinates
      if (place.place_id && place.geometry && place.geometry.location) {
        if (hasStreetNumber && hasRoute) {
          return { isValid: true, message: null };
        }
        
        if (isEstablishment) {
          return { isValid: true, message: null };
        }
        
        // If there's a route but no street number
        if (hasRoute && !hasStreetNumber) {
          return { 
            isValid: false, 
            message: 'Please provide a complete address with building number' 
          };
        }
        
        // If we only have high-level components
        if (onlyHighLevelComponents) {
          return { 
            isValid: false, 
            message: 'Please enter a specific street address' 
          };
        }
      }
    }
    
    // If place has valid geometry, consider it valid
    if (place.geometry?.location && place.place_id) {
      return { isValid: true, message: null }; // It has coordinates at least
    }
    
    return { 
      isValid: false, 
      message: 'Please select a complete address from the suggestions' 
    };
  };

  // Validate free text input
  const validateFreeTextInput = (text: string): boolean => {
    // Special case for transportation hubs
    const transportationHubRegex = /\b(airport|aeroporto|terminal|station|stazione|MXP|LIN|FCO|CIA|NAP|arrivals|arrivi)\b/i;
    if (transportationHubRegex.test(text)) {
      return true;
    }
    
    // Either:
    // 1. Contains street name pattern with number (e.g., Via Roma 42)
    // 2. Contains a specific place name with multiple words (e.g., Pizzeria Bella Napoli)
    
    const hasStreetWithNumber = /\b\w+\s+\w+\s+\d+\b/i.test(text); // Matches patterns like "Via Roma 42"
    const isSpecificPlace = text.split(/\s+/).length >= 3; // At least 3 words for specific places
    
    return hasStreetWithNumber || isSpecificPlace;
  };

  // Use memoized throttled handler to prevent re-creation on each render
  const throttledInputChange = React.useMemo(() => 
    throttle((e: React.ChangeEvent<HTMLInputElement>) => {
      // Only propagate changes if not in the middle of a place selection
      if (!isSelectingRef.current) {
        const newValue = e.target.value;
        onChange(newValue);
        
        // Reset place_id when manually editing
        setPlaceId(null);
        
        // Reset geocoding status
        setIsGeocoded(false);
        setGeocodingError(null);
        
        // Validate the free text input
        if (newValue.trim() && required) {
          const isValid = validateFreeTextInput(newValue);
          setIsValidAddress(isValid);
          
          const message = isValid ? null : 'Please enter a complete address with street name and number';
          setValidationMessage(message);
          
          if (onValidation) {
            onValidation(isValid, message || undefined);
          }
        } else {
          setIsValidAddress(null);
          setValidationMessage(null);
          
          if (onValidation && required) {
            onValidation(false, 'Address is required');
          }
        }
      }
    }, 150), 
    [onChange, onValidation, required]
  );

  // Actually handle the input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledInputChange(e);
  };
  
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

  const handleBlur = () => {
    setIsFocused(false);
    
    // If required and no selection has been made, validate on blur
    if (required && value.trim() && isValidAddress === null) {
      const isValid = validateFreeTextInput(value);
      setIsValidAddress(isValid);
      
      const message = isValid ? null : 'Please select a specific address from the suggestions';
      setValidationMessage(message);
      
      if (onValidation) {
        onValidation(isValid, message || undefined);
      }
      
      // If we have a place_id but haven't geocoded yet, do it now
      if (placeId && !isGeocoded) {
        geocodePlaceById(placeId);
      }
    }
  };

  // Handle clearing the input
  const handleClearInput = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear the input value
    onChange('');
    
    // Reset validation state
    setIsValidAddress(null);
    setValidationMessage(null);
    setPlaceId(null);
    setIsGeocoded(false);
    setGeocodingError(null);
    
    // Focus the input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Notify parent about validation change if needed
    if (onValidation && required) {
      onValidation(false, 'Address is required');
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
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full pl-10 pr-${isLoading || error || validationMessage ? '10' : '10'} py-2 
          border ${error || (validationMessage && !isValidAddress) || geocodingError ? 'border-red-300 bg-red-50' : isGeocoded ? 'border-green-300 bg-green-50' : isValidAddress ? 'border-green-300' : 'border-gray-200'} 
          rounded-md 
          focus:outline-none focus:ring-2 focus:${error || (validationMessage && !isValidAddress) || geocodingError ? 'ring-red-300' : isGeocoded ? 'ring-green-300' : isValidAddress ? 'ring-green-300' : 'ring-blue-600'}
          h-[42px] transition-all
          ${isFocused ? (error || (validationMessage && !isValidAddress) || geocodingError) ? 'border-red-300' : isGeocoded ? 'border-green-300' : isValidAddress ? 'border-green-300' : 'border-blue-300' : ''}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          text-black z-20
        `}
        autoComplete="off"
        spellCheck="false"
        aria-invalid={!!error || (validationMessage && !isValidAddress) || !!geocodingError}
        aria-describedby={
          validationMessage ? 'address-validation-message' : 
          geocodingError ? 'address-geocoding-error' : 
          undefined
        }
        required={required}
        id={id}
      />
      
      {/* Clear button - show whenever there's text in the input */}
      {value && !isLoading && (
        <button
          type="button"
          onClick={handleClearInput}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 z-20"
          aria-label="Clear input"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
      )}
      
      {/* Success indicator for geocoded addresses */}
      {isGeocoded && !isLoading && !geocodingError && (
        <div className="absolute right-3 top-3">
          <Check className="h-5 w-5 text-green-500" />
        </div>
      )}
      
      {/* Error indicator */}
      {(error || geocodingError) && !isLoading && (
        <div className="absolute right-3 top-3" title={error || geocodingError || ''}>
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
      )}
      
      {/* Validation message warning */}
      {validationMessage && !isValidAddress && !error && !isLoading && !value && (
        <div className="absolute right-3 top-3" title={validationMessage}>
          <AlertCircle className="h-5 w-5 text-amber-500" />
        </div>
      )}
      
      {/* Geocoding error message */}
      {geocodingError && (
        <div 
          id="address-geocoding-error" 
          className="text-sm mt-1 text-red-600"
        >
          {geocodingError}
        </div>
      )}
      
      {/* Validation message */}
      {validationMessage && !geocodingError && (
        <div 
          id="address-validation-message" 
          className={`text-sm mt-1 ${isValidAddress ? 'text-green-600' : 'text-amber-600'}`}
        >
          {validationMessage}
        </div>
      )}
    </div>
  );
}