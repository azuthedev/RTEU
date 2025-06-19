import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import FormField from '../components/ui/form-field';
import FormSelect from '../components/ui/form-select';
import { useToast } from '../components/ui/use-toast';
import useFormValidation from '../hooks/useFormValidation';
import { useAnalytics } from '../hooks/useAnalytics';

const Partners = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { toast } = useToast();
  const partnerFormRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    message: '',
    interests: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Define validation rules for the form
  const validationRules = {
    name: [
      { required: true, message: 'Please enter your name' }
    ],
    email: [
      { required: true, message: 'Email is required' },
      { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' }
    ],
    phone: [
      { pattern: /^\+?[0-9\s\-()]{6,20}$/, message: 'Please enter a valid phone number' }
    ]
  };

  const {
    errors,
    isValid,
    validateField,
    validateAllFields,
    handleBlur,
    resetForm,
    resetField
  } = useFormValidation(formData, validationRules);

  // Scroll to a specific element
  const scrollToElement = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Check if hash is present in URL and scroll to that section
  useEffect(() => {
    if (location.hash) {
      // Remove the # symbol
      const id = location.hash.substring(1);
      setTimeout(() => {
        scrollToElement(id);
      }, 500);
    }
  }, [location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when field value changes
    resetField(name);
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields before submission
    if (!validateAllFields()) {
      // Find first field with error and scroll to it
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField && partnerFormRef.current) {
        const errorElement = partnerFormRef.current.elements[firstErrorField];
        if (errorElement) {
          errorElement.focus();
        }
      }
      
      // Show error toast
      toast({
        title: "Form Validation Error",
        description: "Please check the form and fix the errors.",
        variant: "destructive"
      });
      
      return;
    }

    // Set loading state
    setIsSubmitting(true);
    
    // Track form submission attempt
    trackEvent('Partner Form', 'Submit Attempt');

    try {
      // Call the Supabase Edge Function instead of direct submission
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/partner-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company_name: formData.company_name,
          message: formData.message
        })
      });

      // Parse the response
      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        throw new Error(data.error || "Something went wrong. Please try again later.");
      }

      // Handle successful submission
      setSubmitSuccess(true);
      
      // Show success toast
      toast({
        title: "Application Submitted",
        description: "Your partner application has been received. We will contact you soon!",
        variant: "default"
      });
      
      // Track successful submission
      trackEvent('Partner Form', 'Submit Success');
      
      // Reset form
      resetForm();
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        message: '',
        interests: []
      });

      // Auto-scroll to top after submission
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error("Form submission error:", error);
      
      // Show error toast
      toast({
        title: "Form Submission Failed",
        description: error.message || "Something went wrong. Please try again later.",
        variant: "destructive"
      });
      
      // Track form error
      trackEvent('Partner Form', 'Submit Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Become a Partner | Royal Transfer EU</title>
        <meta name="description" content="Join the Royal Transfer EU partner network and grow your business. Apply now to become an official partner." />
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-blue-600 text-white py-20 md:py-32">
          <div className="absolute inset-0 overflow-hidden bg-black/20">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-800/90 to-blue-600/80"></div>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Partner with Royal Transfer EU
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl max-w-3xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Join our network of professional drivers and grow your business
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <button
                onClick={() => scrollToElement('partner-form')}
                className="bg-white text-blue-600 px-6 py-3 rounded-md hover:bg-gray-100 transition-colors shadow-md font-bold"
              >
                Apply Now
              </button>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Partner With Us</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Join a growing network of professional drivers and companies to expand your business opportunities and provide premium services to travelers across Europe.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Consistent Bookings",
                  description: "Receive a steady stream of pre-paid bookings through our platform, reducing empty returns and idle time."
                },
                {
                  title: "Premium Clientele",
                  description: "Serve high-quality clients who value professional service and are willing to pay for superior experiences."
                },
                {
                  title: "Flexible Schedule",
                  description: "Choose when you work and which bookings you accept, maintaining full control of your schedule."
                },
                {
                  title: "Professional Support",
                  description: "Access our dedicated partner support team for assistance with bookings, client communication, and technical issues."
                },
                {
                  title: "Technology Platform",
                  description: "Use our driver app to manage bookings, navigation, and client communication all in one place."
                },
                {
                  title: "Growth Opportunities",
                  description: "Expand your business with access to international travelers and corporate clients."
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  className="bg-gray-50 p-6 rounded-xl shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Partner Requirements</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                We maintain high standards to ensure exceptional service for all our customers.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-md">
                <ul className="space-y-6">
                  {[
                    "Valid professional driver's license and all required permits",
                    "Clean, well-maintained vehicle less than 5 years old",
                    "Commercial insurance with appropriate coverage",
                    "Excellent knowledge of local roads and attractions",
                    "Professional appearance and strong customer service skills",
                    "Fluent English communication skills",
                    "Smartphone with reliable internet connection",
                    "Flexible availability including weekends and holidays",
                    "Background check and clean driving record"
                  ].map((requirement, index) => (
                    <motion.li 
                      key={index}
                      className="flex items-start"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true, margin: "-100px" }}
                    >
                      <span className="bg-blue-100 text-blue-600 p-1 rounded-full flex-shrink-0 mt-0.5 mr-3">
                        <CheckCircle className="w-5 h-5" />
                      </span>
                      <span className="text-gray-700">{requirement}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form Section */}
        <section id="partner-form" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Apply to Become a Partner</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Fill out the form below to start your application process. Our team will review your application and contact you within 2-3 business days.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {submitSuccess ? (
                <motion.div 
                  className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-lg text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-bold mb-3">Application Submitted!</h3>
                  <p className="mb-6">
                    Thank you for your interest in partnering with Royal Transfer EU. We've received your application and our team will review it shortly. We'll contact you within 2-3 business days with next steps.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => {
                        setSubmitSuccess(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-6 py-2 border border-green-600 text-green-700 rounded-md hover:bg-green-50 transition-colors"
                    >
                      Submit Another Application
                    </button>
                    <Link
                      to="/"
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      Return to Home <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.form 
                  ref={partnerFormRef}
                  onSubmit={handleSubmit}
                  className="bg-gray-50 p-6 sm:p-8 rounded-lg shadow-md"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="space-y-6">
                    <FormField
                      id="name"
                      name="name"
                      label="Full Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('name')}
                      error={errors.name}
                      required
                      autoComplete="name"
                    />

                    <FormField
                      id="email"
                      name="email"
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('email')}
                      error={errors.email}
                      required
                      autoComplete="email"
                    />

                    <FormField
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('phone')}
                      error={errors.phone}
                      autoComplete="tel"
                      helpText="Include country code, e.g., +39"
                    />

                    <FormField
                      id="company_name"
                      name="company_name"
                      label="Company Name (if applicable)"
                      value={formData.company_name}
                      onChange={handleInputChange}
                    />

                    <FormSelect
                      id="vehicle_type"
                      name="vehicle_type"
                      label="Vehicle Type"
                      options={[
                        { value: "", label: "Select a vehicle type" },
                        { value: "sedan", label: "Sedan" },
                        { value: "minivan", label: "Minivan" },
                        { value: "sprinter", label: "Sprinter" },
                        { value: "bus", label: "Bus" }
                      ]}
                      value={formData.vehicle_type}
                      onChange={handleInputChange}
                    />

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Information
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Tell us about your experience, vehicle details, and availability"
                      ></textarea>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center
                          ${isSubmitting
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Application'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Frequently Asked Questions</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Everything you need to know about becoming a partner with Royal Transfer EU
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="space-y-6">
                {[
                  {
                    question: "How soon can I start after applying?",
                    answer: "After your application is approved, we'll guide you through onboarding which typically takes 3-7 days depending on document verification and training completion."
                  },
                  {
                    question: "How do I get paid for completed trips?",
                    answer: "Payments are processed on a weekly basis. You'll receive direct deposits to your registered bank account for all completed trips, minus the platform fee."
                  },
                  {
                    question: "What areas can I provide service in?",
                    answer: "You can choose your preferred service areas during registration. You can serve any areas where you're legally permitted to operate as a driver."
                  },
                  {
                    question: "Do I need to provide my own vehicle?",
                    answer: "Yes, partners are required to have their own vehicles that meet our quality standards. Your vehicle must be clean, well-maintained, and less than 5 years old."
                  },
                  {
                    question: "What is the commission structure?",
                    answer: "Our commission varies based on service type and location, typically ranging from 15-25%. Full details will be provided during the onboarding process."
                  },
                  {
                    question: "Can I work for other transfer companies simultaneously?",
                    answer: "Yes, our partnership is non-exclusive. You're welcome to work with other companies or maintain your independent business alongside partnering with us."
                  }
                ].map((faq, index) => (
                  <motion.div
                    key={index}
                    className="bg-white p-6 rounded-lg shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true, margin: "-100px" }}
                  >
                    <h3 className="text-xl font-bold mb-3">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Sitemap />
    </div>
  );
};

export default Partners;