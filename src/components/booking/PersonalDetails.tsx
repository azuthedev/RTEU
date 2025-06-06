import React, { useState, useEffect, useRef } from 'react';
import { Info, AlertCircle, Plane } from 'lucide-react';
import { useBooking } from '../../contexts/BookingContext';
import BookingLayout from './BookingLayout';
import { extras } from '../../data/extras';
import { useToast } from '../ui/use-toast';
import FormField from '../ui/form-field';
import FormSelect from '../ui/form-select';
import { isAirport } from '../../utils/airportDetection';

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
    selectedExtras: new Set<string>()
  });
  
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  
  // Determine if pickup or dropoff is an airport
  const [pickupIsAirport, setPickupIsAirport] = useState(false);
  const [dropoffIsAirport, setDropoffIsAirport] = useState(false);
  
  // Initialize form with existing data from context if available
  useEffect(() => {
    if (bookingState.personalDetails) {
      setFormData(bookingState.personalDetails);
    }
    
    // Check if pickup or dropoff is an airport
    if (bookingState.fromDisplay || bookingState.from) {
      const pickupLocation = bookingState.fromDisplay || bookingState.from || '';
      setPickupIsAirport(isAirport(pickupLocation));
    }
    
    if (bookingState.toDisplay || bookingState.to) {
      const dropoffLocation = bookingState.toDisplay || bookingState.to || '';
      setDropoffIsAirport(isAirport(dropoffLocation));
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

  const handleExtraToggle = (extraId: string) => {
    const newExtras = new Set(formData.selectedExtras);
    if (newExtras.has(extraId)) {
      newExtras.delete(extraId);
    } else {
      newExtras.add(extraId);
    }
    setFormData({ ...formData, selectedExtras: newExtras });
    setFormTouched({ ...formTouched, extras: true });
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
      return total + (extra?.price || 0);
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
      personalDetails: formData,
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

        {/* Equipment & Extras */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl mb-4">Equipment & Extras</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extras.map((extra) => (
              <label
                key={extra.id}
                className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.selectedExtras.has(extra.id)}
                  onChange={() => handleExtraToggle(extra.id)}
                  className="h-5 w-5 text-black rounded"
                  id={`extra-${extra.id}`}
                />
                <div className="flex-1">
                  <div className="font-medium">{extra.name}</div>
                  <div className="text-sm text-gray-500">
                    {extra.price > 0 ? `€${extra.price.toFixed(2)}` : 'Free'}
                  </div>
                </div>
              </label>
            ))}
          </div>
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

            {/* Flight Number - Only shown if pickup or dropoff is an airport */}
            {showFlightNumberField && (
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-start mb-4">
                  <Plane className="w-5 h-5 mr-2 mt-0.5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-800">Airport Transfer Details</h3>
                    <p className="text-sm text-blue-600 mt-1">
                      {pickupIsAirport 
                        ? 'We detected an airport in your pickup location.' 
                        : 'We detected an airport in your dropoff location.'} 
                      Please provide your flight number for better service.
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
                  helpText="Example: BA1326 or FR8756"
                  icon={<Plane className="h-5 w-5" />}
                />
              </div>
            )}

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