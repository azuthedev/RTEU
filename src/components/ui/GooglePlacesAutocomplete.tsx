import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, AlertCircle, X } from 'lucide-react';
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
  id = 'google-places-input'
}: GooglePlacesAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(isGoogleMapsLoaded());
  const [isValidAddress, setIsValidAddress] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  
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
            fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'],
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
                
                // Get the best display name for the selected place
                const displayName = getDisplayName(place);
                
                // Validate address completeness
                const isValidPlace = validateAddressCompleteness(place);
                setIsValidAddress(isValidPlace.isValid);
                setValidationMessage(isValidPlace.message);
                
                if (onValidation) {
                  onValidation(isValidPlace.isValid, isValidPlace.message || undefined);
                }
                
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

      // Address is complete if it has street number and route
      if (hasStreetNumber && hasRoute) {
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
    
    // If we don't have address components or can't validate, default to requiring a selection
    if (place.geometry?.location) {
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

  // Handle the input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    throttledInputChange(e);
  };

  // Handle clear button click
  const handleClearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear the input value
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    
    // Update state
    onChange('');
    
    // Reset validation
    setIsValidAddress(null);
    setValidationMessage(null);
    
    if (onValidation && required) {
      onValidation(false, 'Address is required');
    }
    
    // Focus back on the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
    }
  };

  // Determine if we should show the clear button
  const showClearButton = value.length > 0;

  return (
    <div className={`relative ${className}`}>
      <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full pl-10 pr-${showClearButton || isLoading || error || validationMessage ? '10' : '4'} py-2 
          border ${error || (validationMessage && !isValidAddress) ? 'border-red-300 bg-red-50' : isValidAddress ? 'border-green-300' : 'border-gray-200'} 
          rounded-md 
          focus:outline-none focus:ring-2 focus:${error || (validationMessage && !isValidAddress) ? 'ring-red-300' : isValidAddress ? 'ring-green-300' : 'ring-blue-600'}
          h-[42px] transition-all
          ${isFocused ? (error || (validationMessage && !isValidAddress)) ? 'border-red-300' : isValidAddress ? 'border-green-300' : 'border-blue-300' : ''}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          text-black z-20
        `}
        autoComplete="off"
        spellCheck="false"
        aria-invalid={!!error || (validationMessage && !isValidAddress)}
        aria-describedby={validationMessage ? 'address-validation-message' : undefined}
        required={required}
      />
      <div className="absolute right-3 top-3">
        {isLoading && (
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        )}
        {error && !isLoading && !showClearButton && (
          <div title={error}>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
        {validationMessage && !isValidAddress && !error && !isLoading && !showClearButton && (
          <div title={validationMessage}>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
        )}
        {isValidAddress && !error && !isLoading && !showClearButton && (
          <div title="Valid address" className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 12 12" 
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M10 3L4.5 8.5L2 6" 
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {showClearButton && (
          <button
            type="button"
            onClick={handleClearClick}
            className="h-5 w-5 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Clear input"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {validationMessage && (
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