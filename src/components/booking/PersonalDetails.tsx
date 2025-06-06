import React, { useState, useEffect, useRef } from 'react';
import { Info, AlertCircle, Plane, Plus, Minus, X } from 'lucide-react';
import { useBooking } from '../../contexts/BookingContext';
import BookingLayout from './BookingLayout';
import { extras } from '../../data/extras';
import { useToast } from '../ui/use-toast';
import FormField from '../ui/form-field';
import FormSelect from '../ui/form-select';
import { isAirport, extractAirportName } from '../../utils/airportDetection';
import { GooglePlacesAutocomplete } from '../ui/GooglePlacesAutocomplete';

const PersonalDetails = () => {
  const { bookingState, setBookingState, validateStep, scrollToError } = useBooking();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: 'mr',
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    phone: '',
    flightNumber: '',
    selectedExtras: new Set<string>(),
    extraStops: [] as {address: string, lat?: number, lng?: number}[],
    childSeats: {} as Record<string, number>,
    luggageCount: 2 // Default to 2 luggage items
  });
  
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  
  // Determine if pickup or dropoff is an airport
  const [pickupIsAirport, setPickupIsAirport] = useState(false);
  const [dropoffIsAirport, setDropoffIsAirport] = useState(false);
  const [detectedAirportName, setDetectedAirportName] = useState<string | null>(null);
  
  // Get max luggage based on selected vehicle
  const maxLuggage = bookingState.selectedVehicle?.suitcases || 8;
  
  // Initialize form with existing data from context if available
  useEffect(() => {
    if (bookingState.personalDetails) {
      // Preserve existing data, including extraStops, childSeats, and luggageCount
      setFormData({
        ...bookingState.personalDetails,
        extraStops: bookingState.personalDetails.extraStops || [],
        childSeats: bookingState.personalDetails.childSeats || {},
        luggageCount: bookingState.personalDetails.luggageCount !== undefined 
          ? bookingState.personalDetails.luggageCount 
          : 2 // Default to 2 luggage items
      });
    }
    
    // Check if pickup or dropoff is an airport
    if (bookingState.fromDisplay || bookingState.from) {
      const pickupLocation = bookingState.fromDisplay || bookingState.from || '';
      const isPickupAirport = isAirport(pickupLocation);
      setPickupIsAirport(isPickupAirport);
      
      if (isPickupAirport) {
        setDetectedAirportName(extractAirportName(pickupLocation));
      }
    }
    
    if (bookingState.toDisplay || bookingState.to) {
      const dropoffLocation = bookingState.toDisplay || bookingState.to || '';
      const isDropoffAirport = isAirport(dropoffLocation);
      setDropoffIsAirport(isDropoffAirport);
      
      if (isDropoffAirport && !pickupIsAirport) {
        setDetectedAirportName(extractAirportName(dropoffLocation));
      }
    }
    
    // Check for existing validation errors in the booking state
    if (bookingState.validationErrors?.length > 0) {
      const errors: Record<string, string> = {};
      bookingState.validationErrors.forEach(error => {
        errors[error.field] = error.message;
      });
      setFieldErrors(errors);
      
      // If there are errors, scroll to the first one
      if (bookingState.validationErrors.length > 0) {
        const firstErrorField = bookingState.validationErrors[0].field;
        setTimeout(() => {
          scrollToError(firstErrorField);
        }, 100);
      }
    }
  }, [bookingState.personalDetails, bookingState.validationErrors, scrollToError, bookingState.fromDisplay, bookingState.from, bookingState.toDisplay, bookingState.to]);

  // Handle adding an extra stop
  const handleAddExtraStop = () => {
    if (formData.extraStops.length >= 3) {
      toast({
        title: "Maximum Stops Reached",
        description: "You can add up to 3 extra stops",
        variant: "destructive"
      });
      return;
    }
    
    setFormData({
      ...formData,
      extraStops: [...formData.extraStops, {address: ''}],
      selectedExtras: new Set([...formData.selectedExtras, 'extra-stop'])
    });
    
    setFormTouched({...formTouched, extraStops: true});
  };

  // Function to handle removing an extra stop
  const handleRemoveExtraStop = (index: number) => {
    const newStops = [...formData.extraStops];
    newStops.splice(index, 1);
    
    // If removing the last stop, also remove the extra-stop selection
    const newExtras = new Set(formData.selectedExtras);
    if (newStops.length === 0) {
      newExtras.delete('extra-stop');
    }
    
    setFormData({
      ...formData,
      extraStops: newStops,
      selectedExtras: newExtras
    });
  };

  // Function to update an extra stop address
  const handleExtraStopChange = (index: number, address: string) => {
    const newStops = [...formData.extraStops];
    newStops[index] = {...newStops[index], address};
    setFormData({
      ...formData,
      extraStops: newStops
    });
  };

  // Handle coordinates for extra stops
  const handleExtraStopSelect = (index: number, displayName: string, placeData?: google.maps.places.PlaceResult) => {
    const newStops = [...formData.extraStops];
    
    // Update with coordinates if available
    if (placeData?.geometry?.location) {
      newStops[index] = {
        address: displayName,
        lat: placeData.geometry.location.lat(),
        lng: placeData.geometry.location.lng()
      };
    } else {
      newStops[index] = {
        address: displayName
      };
    }
    
    setFormData({
      ...formData,
      extraStops: newStops
    });
  };

  // Handle extra toggle (including child seats)
  const handleExtraToggle = (extraId: string) => {
    const isChildSeat = ['child-seat', 'infant-seat', 'booster-seat'].includes(extraId);
    const newExtras = new Set(formData.selectedExtras);
    
    if (newExtras.has(extraId)) {
      // Removing the extra
      newExtras.delete(extraId);
      
      // If it's a child seat, also remove it from childSeats
      if (isChildSeat) {
        const newSeats = {...formData.childSeats};
        delete newSeats[extraId];
        setFormData({ 
          ...formData, 
          selectedExtras: newExtras,
          childSeats: newSeats
        });
        return;
      }
    } else {
      // Adding the extra
      newExtras.add(extraId);
      
      // If it's a child seat, set default count to 1
      if (isChildSeat) {
        const newSeats = {...formData.childSeats, [extraId]: 1};
        setFormData({ 
          ...formData, 
          selectedExtras: newExtras,
          childSeats: newSeats 
        });
        return;
      }
    }
    
    setFormData({ ...formData, selectedExtras: newExtras });
    setFormTouched({ ...formTouched, extras: true });
  };

  // Function to handle child seat quantity changes
  const handleChildSeatQuantity = (extraId: string, increment: boolean) => {
    if (!['child-seat', 'infant-seat', 'booster-seat'].includes(extraId)) return;
    
    const newSeats = {...formData.childSeats};
    const currentCount = newSeats[extraId] || 1;
    
    if (increment) {
      // Maximum 4 seats per type
      if (currentCount < 4) {
        newSeats[extraId] = currentCount + 1;
      }
    } else {
      // Minimum 1 seat
      if (currentCount <= 1) {
        return; // Don't decrease below 1
      } else {
        newSeats[extraId] = currentCount - 1;
      }
    }
    
    setFormData({
      ...formData,
      childSeats: newSeats
    });
  };

  // Function to handle luggage count changes
  const handleLuggageCountChange = (increment: boolean) => {
    let newCount = formData.luggageCount;
    if (increment && newCount < maxLuggage) {
      newCount++;
    } else if (!increment && newCount > 0) {
      newCount--;
    }
    
    setFormData({
      ...formData,
      luggageCount: newCount
    });
    
    setFormTouched({ ...formTouched, luggageCount: true });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormTouched({ ...formTouched, [name]: true });
    
    // Clear the error for this field when it's changed
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: '' });
    }
  };

  const calculateTotal = () => {
    // Get the API price for the selected vehicle if available
    let basePrice = bookingState.selectedVehicle?.price || 0;
    
    // If we have pricing data from the API, use that
    if (bookingState.pricingResponse) {
      const apiCategoryMap: Record<string, string> = {
        'economy-sedan': 'standard_sedan',
        'premium-sedan': 'premium_sedan',
        'vip-sedan': 'vip_sedan',
        'standard-minivan': 'standard_minivan',
        'xl-minivan': 'xl_minivan',
        'vip-minivan': 'vip_minivan',
        'sprinter-8': 'sprinter_8_pax',
        'sprinter-16': 'sprinter_16_pax',
        'sprinter-21': 'sprinter_21_pax',
        'bus-51': 'coach_51_pax'
      };
      
      const apiCategory = apiCategoryMap[bookingState.selectedVehicle?.id || ''];
      if (apiCategory) {
        const priceInfo = bookingState.pricingResponse.prices.find(p => p.category === apiCategory);
        if (priceInfo) {
          basePrice = priceInfo.price;
        }
      }
    }
    
    const extrasTotal = Array.from(formData.selectedExtras).reduce((total, extraId) => {
      const extra = extras.find(e => e.id === extraId);
      if (!extra) return total;
      
      // If it's a child seat, multiply by quantity
      if (['child-seat', 'infant-seat', 'booster-seat'].includes(extraId)) {
        const quantity = formData.childSeats[extraId] || 1;
        return total + (extra.price * quantity);
      }
      
      // If it's an extra stop, multiply by the number of stops
      if (extraId === 'extra-stop') {
        const stopCount = formData.extraStops?.length || 0;
        return total + (extra.price * stopCount);
      }
      
      return total + (extra.price || 0);
    }, 0);
    
    return basePrice + extrasTotal;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
      isValid = false;
    }
    
    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
      isValid = false;
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    // Country validation
    if (!formData.country) {
      errors.country = 'Please select your country';
      isValid = false;
    }
    
    // Phone validation - optional but must be valid if provided
    if (formData.phone && formData.phone.trim().length < 5) {
      errors.phone = 'Please enter a valid phone number';
      isValid = false;
    }
    
    // Flight number validation - required if pickup or dropoff is an airport
    if ((pickupIsAirport || dropoffIsAirport) && !formData.flightNumber.trim()) {
      errors.flightNumber = 'Flight number is required for airport transfers';
      isValid = false;
    }
    
    // Extra stops validation
    for (let i = 0; i < formData.extraStops.length; i++) {
      if (!formData.extraStops[i].address.trim()) {
        errors[`extraStop${i}`] = `Address for stop ${i + 1} is required`;
        isValid = false;
      }
    }
    
    setFieldErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    // Validate the form
    if (!validateForm()) {
      // Find the first error field and scroll to it
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField) {
        scrollToError(firstErrorField);
      }
      
      // Show toast notification
      toast({
        title: "Please complete all required fields",
        description: "Some required information is missing or invalid.",
        variant: "destructive"
      });
      
      return;
    }
    
    // All validation passed - update context with personal details
    setBookingState(prev => ({
      ...prev,
      step: 3,
      personalDetails: {
        ...formData,
        // Make sure we have the right types for storage
        extraStops: formData.extraStops.length > 0 ? formData.extraStops : undefined,
        childSeats: Object.keys(formData.childSeats).length > 0 ? formData.childSeats : undefined,
        luggageCount: formData.luggageCount
      },
      validationErrors: [] // Clear any validation errors
    }));
    
    // Scroll to top
    window.scrollTo(0, 0);
  };

  // Determine if we need to show the flight number field
  const showFlightNumberField = pickupIsAirport || dropoffIsAirport;

  return (
    <BookingLayout
      currentStep={2}
      totalPrice={calculateTotal()}
      onNext={handleNext}
      nextButtonText="Next: Payment Details"
      validateBeforeNext={false} // We'll handle validation ourselves
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl mb-8">Transfer & Personal Details</h1>

        {/* Flight Number Field - Only shown if pickup or dropoff is an airport */}
        {showFlightNumberField && (
          <section className="bg-blue-50 rounded-lg shadow-md p-6 mb-8" id="flight-info-section">
            <div className="flex items-start mb-4">
              <Plane className="w-5 h-5 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-800">Flight Information Required</h3>
                <p className="text-sm text-blue-600 mt-1">
                  We detected an airport in your {pickupIsAirport ? 'pickup' : 'dropoff'} location:
                  <strong className="font-semibold ml-1">{detectedAirportName || (pickupIsAirport ? bookingState.fromDisplay : bookingState.toDisplay)}</strong>
                </p>
              </div>
            </div>
            
            <FormField
              id="flightNumber"
              name="flightNumber"
              label="Flight Number"
              value={formData.flightNumber}
              onChange={handleInputChange}
              error={fieldErrors.flightNumber}
              required={true}
              helpText="Example: BA1326, FR8756, AZ1234 or IB3456"
              icon={<Plane className="h-5 w-5" />}
            />
            
            <div className="mt-4 bg-blue-100 rounded p-3 text-sm text-blue-800">
              <p>
                <strong>Why we need this:</strong> Your flight number helps us track your flight status and adjust pickup times 
                automatically in case of delays. This ensures you'll always have a driver waiting when you arrive.
              </p>
            </div>
          </section>
        )}

        {/* Equipment & Extras */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8" id="equipment-section">
          <h2 className="text-xl mb-4">Equipment & Extras</h2>
          
          {/* Luggage count control */}
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Luggage</h3>
                <p className="text-sm text-gray-600 mt-1">How many suitcases do you have?</p>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  type="button"
                  onClick={() => handleLuggageCountChange(false)}
                  className={`w-8 h-8 flex items-center justify-center border rounded-full ${
                    formData.luggageCount > 0 
                      ? 'border-gray-300 hover:bg-gray-100' 
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                  disabled={formData.luggageCount <= 0}
                  aria-label="Decrease luggage count"
                  id="luggage-decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-medium" id="luggage-count">{formData.luggageCount}</span>
                <button 
                  type="button"
                  onClick={() => handleLuggageCountChange(true)}
                  className={`w-8 h-8 flex items-center justify-center border rounded-full ${
                    formData.luggageCount < maxLuggage 
                      ? 'border-gray-300 hover:bg-gray-100' 
                      : 'border-gray-200 text-gray-300 cursor-not-allowed'
                  }`}
                  disabled={formData.luggageCount >= maxLuggage}
                  aria-label="Increase luggage count"
                  id="luggage-increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Maximum {maxLuggage} luggage items for {bookingState.selectedVehicle?.name}
            </p>
          </div>
          
          {/* Regular extras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extras.map((extra) => {
              const isChildSeat = ['child-seat', 'infant-seat', 'booster-seat'].includes(extra.id);
              const showQuantityControls = isChildSeat && formData.selectedExtras.has(extra.id);
              const quantity = formData.childSeats[extra.id] || 1;
              
              return (
                <div key={extra.id} className="flex flex-col">
                  <label
                    className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                    htmlFor={`extra-${extra.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedExtras.has(extra.id)}
                      onChange={() => {
                        // If it's a child seat, also update counts
                        if (isChildSeat) {
                          if (formData.selectedExtras.has(extra.id)) {
                            // Removing the extra - clear count
                            const newSeats = {...formData.childSeats};
                            delete newSeats[extra.id];
                            setFormData({
                              ...formData,
                              selectedExtras: new Set(
                                Array.from(formData.selectedExtras).filter(id => id !== extra.id)
                              ),
                              childSeats: newSeats
                            });
                          } else {
                            // Adding the extra - set count to 1
                            const newSeats = {...formData.childSeats, [extra.id]: 1};
                            const newExtras = new Set(formData.selectedExtras);
                            newExtras.add(extra.id);
                            setFormData({
                              ...formData,
                              selectedExtras: newExtras,
                              childSeats: newSeats
                            });
                          }
                        } else {
                          // Regular toggle for non-child seat extras
                          handleExtraToggle(extra.id);
                        }
                      }}
                      className="h-5 w-5 text-black rounded"
                      id={`extra-${extra.id}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{extra.name}</div>
                      <div className="text-sm text-gray-500">
                        {extra.price > 0 ? `€${extra.price.toFixed(2)}` : 'Free'}
                        {showQuantityControls && ` × ${quantity}`}
                      </div>
                    </div>
                  </label>
                  
                  {/* Show quantity controls for child seats */}
                  {showQuantityControls && (
                    <div className="flex justify-end items-center space-x-2 mt-2 px-3">
                      <button 
                        type="button"
                        onClick={() => handleChildSeatQuantity(extra.id, false)}
                        className={`w-7 h-7 flex items-center justify-center ${
                          quantity <= 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        disabled={quantity <= 1}
                        aria-label={`Decrease ${extra.name} count`}
                        id={`${extra.id}-decrease`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {quantity}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleChildSeatQuantity(extra.id, true)}
                        className={`w-7 h-7 flex items-center justify-center ${
                          quantity < 4 
                            ? 'bg-gray-100 hover:bg-gray-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={quantity >= 4}
                        aria-label={`Increase ${extra.name} count`}
                        id={`${extra.id}-increase`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        
        {/* Extra Stops Section */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8" id="extra-stops-section">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">Extra Stops</h2>
            <button
              type="button"
              onClick={handleAddExtraStop}
              className={`px-3 py-1 rounded ${
                formData.extraStops.length >= 3
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              disabled={formData.extraStops.length >= 3}
              id="add-stop-button"
            >
              Add Stop
            </button>
          </div>
          
          {formData.extraStops.length === 0 ? (
            <p className="text-gray-500 text-sm">No extra stops added. Your transfer will go directly from pickup to dropoff.</p>
          ) : (
            <div className="space-y-4">
              {formData.extraStops.map((stop, index) => (
                <div key={index} className="border rounded-md p-4 relative" id={`extra-stop-${index}`}>
                  <h3 className="font-medium mb-2">Stop {index + 1}</h3>
                  <GooglePlacesAutocomplete
                    value={stop.address}
                    onChange={(value) => handleExtraStopChange(index, value)}
                    onPlaceSelect={(displayName, placeData) => handleExtraStopSelect(index, displayName, placeData)}
                    placeholder={`Address for stop ${index + 1}`}
                    className="w-full"
                    required={true}
                    onValidation={(isValid) => {
                      // Handle validation
                      if (!isValid && formTouched.extraStops) {
                        setFieldErrors({
                          ...fieldErrors,
                          [`extraStop${index}`]: `Please enter a valid address for stop ${index + 1}`
                        });
                      } else {
                        const newErrors = {...fieldErrors};
                        delete newErrors[`extraStop${index}`];
                        setFieldErrors(newErrors);
                      }
                    }}
                    id={`extra-stop-input-${index}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExtraStop(index)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
                    aria-label={`Remove stop ${index + 1}`}
                    id={`remove-stop-${index}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  {fieldErrors[`extraStop${index}`] && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors[`extraStop${index}`]}</p>
                  )}
                </div>
              ))}
              
              {formData.extraStops.length > 0 && formData.extraStops.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddExtraStop}
                  className="mt-2 text-blue-600 hover:text-blue-800 flex items-center"
                  id="add-another-stop-button"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Another Stop
                </button>
              )}
              
              <div className="text-sm text-gray-500 mt-2">
                <p>Each extra stop adds €10.00 to your total fare.</p>
              </div>
            </div>
          )}
        </section>

        {/* Personal Details Form */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl mb-6">Personal Details</h2>
          
          <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* Title Selection */}
            <div className="flex space-x-4 mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="title"
                  value="mr"
                  checked={formData.title === 'mr'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-black"
                  id="title-mr"
                />
                <span>Mr.</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="title"
                  value="ms"
                  checked={formData.title === 'ms'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-black"
                  id="title-ms"
                />
                <span>Ms.</span>
              </label>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="firstName"
                name="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                error={fieldErrors.firstName}
                required={true}
                autoComplete="given-name"
              />
              <FormField
                id="lastName"
                name="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                error={fieldErrors.lastName}
                required={true}
                autoComplete="family-name"
              />
            </div>

            {/* Email */}
            <FormField
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              error={fieldErrors.email}
              required={true}
              autoComplete="email"
            />

            {/* Country & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                id="country"
                name="country"
                label="Country"
                options={[
                  { value: "", label: "Select a country" },
                  { value: "IT", label: "Italy" },
                  { value: "FR", label: "France" },
                  { value: "ES", label: "Spain" },
                  { value: "DE", label: "Germany" },
                  { value: "UK", label: "United Kingdom" },
                  { value: "US", label: "United States" },
                  { value: "CA", label: "Canada" },
                  { value: "AU", label: "Australia" },
                  { value: "CH", label: "Switzerland" },
                  { value: "AT", label: "Austria" },
                  { value: "NL", label: "Netherlands" },
                  { value: "BE", label: "Belgium" },
                  { value: "PT", label: "Portugal" },
                  { value: "GR", label: "Greece" },
                  { value: "SE", label: "Sweden" },
                  { value: "NO", label: "Norway" },
                  { value: "DK", label: "Denmark" },
                  { value: "FI", label: "Finland" },
                  { value: "IE", label: "Ireland" },
                  { value: "RU", label: "Russia" },
                  { value: "PL", label: "Poland" }
                ]}
                value={formData.country}
                onChange={handleInputChange}
                error={fieldErrors.country}
                required={true}
              />
              <div className="relative">
                <FormField
                  id="phone"
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  error={fieldErrors.phone}
                  autoComplete="tel"
                  helpText="Recommended for booking notifications"
                />
                <div className="absolute right-3 top-[38px]">
                  <Info className="w-5 h-5 text-gray-400" title="We'll only contact you about your transfer" />
                </div>
              </div>
            </div>

            {/* Form-wide error display */}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 flex items-start">
                <AlertCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Please complete all required fields</p>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {Object.entries(fieldErrors).map(([field, message]) => (
                      <li key={field} className="ml-2">
                        <button 
                          className="underline hover:text-red-800"
                          onClick={() => scrollToError(field)}
                          type="button"
                        >
                          {message}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </form>
        </section>
      </div>
    </BookingLayout>
  );
};

export default PersonalDetails;