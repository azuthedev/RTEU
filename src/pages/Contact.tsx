import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import Newsletter from '../components/Newsletter';
import { Phone, Mail, MapPin, ArrowRight, MessageCircle, Building2, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import FormField from '../components/ui/form-field';
import FormSelect from '../components/ui/form-select';
import useFormValidation from '../hooks/useFormValidation';

const WEBHOOK_URL = 'https://hook.eu1.make.com/abc123xyz456';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Define validation rules
  const validationRules = {
    name: [
      { required: true, message: 'Please enter your name' }
    ],
    email: [
      { required: true, message: 'Please enter your email address' },
      { 
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
        message: 'Please enter a valid email address' 
      }
    ],
    subject: [
      { required: true, message: 'Please select a subject' }
    ],
    message: [
      { required: true, message: 'Please enter your message' },
      {
        validate: (value) => value.trim().length >= 10,
        message: 'Your message should be at least 10 characters long'
      }
    ]
  };

  const {
    errors,
    isValid,
    validateAllFields,
    handleBlur,
    resetForm
  } = useFormValidation(formData, validationRules);

  // Reset form after successful submission
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    // Validate all fields before submitting
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      // Reset form on success
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      resetForm();
      setSubmitSuccess(true);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(error.message || 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAIChat = () => {
    // @ts-ignore - voiceflow is added via script
    if (window.voiceflow && window.voiceflow.chat) {
      // @ts-ignore
      window.voiceflow.chat.open();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-4xl font-bold mb-4">We'd Love to Hear from You!</h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Whether you have questions about our services, need assistance with a booking,
              or want to explore partnership opportunities, we're here to help.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Contact Information */}
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Phone</h3>
                      <p className="text-gray-700">+39 351 748 22 44</p>
                      <p className="text-sm text-gray-500">Available 24/7</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Email</h3>
                      <p className="text-gray-700">contact@royaltransfer.eu</p>
                      <p className="text-sm text-gray-500">Quick response guaranteed</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Address</h3>
                      <p className="text-gray-700">123 Transfer Street</p>
                      <p className="text-gray-700">EU 12345</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Business Hours</h3>
                      <p className="text-gray-700">24/7 Support Available</p>
                      <p className="text-sm text-gray-500">Office: Mon-Fri 9:00-18:00</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">Leadership</h3>
                      <p className="text-gray-700">For Business Inquiries:</p>
                      <p className="text-sm text-gray-500">partnerships@royaltransfer.eu</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={openAIChat}
                    className="w-full bg-[#E6AB00] text-white px-8 py-3 rounded-md hover:opacity-90 transition-all duration-300 flex items-center justify-center"
                  >
                    <MessageCircle className="w-6 h-6 mr-2" />
                    Chat with Us Now
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
                <p className="text-gray-700 mb-6">
                  Our 24/7 customer support team is ready to assist you with any urgent matters.
                </p>
                <a 
                  href="tel:+393517482244"
                  className="bg-blue-600 text-white text-[13px] md:text-xl px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Now: +39 351 748 22 44
                </a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div 
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              
              {submitSuccess && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center" role="alert">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <p>Thank you for your message! We will get back to you shortly.</p>
                </div>
              )}

              {submitError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center" role="alert">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <p>{submitError}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <FormField
                  id="name"
                  name="name"
                  label="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('name')}
                  required
                  error={errors.name}
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
                  required
                  error={errors.email}
                  autoComplete="email"
                />

                <FormField
                  id="phone"
                  name="phone"
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  autoComplete="tel"
                  helpText="Optional, but recommended for faster response"
                />

                <FormSelect
                  id="subject"
                  name="subject"
                  label="Subject"
                  options={[
                    { value: 'booking', label: 'Booking Inquiry' },
                    { value: 'support', label: 'Customer Support' },
                    { value: 'partnership', label: 'Business Partnership' },
                    { value: 'feedback', label: 'Feedback' },
                    { value: 'other', label: 'Other' }
                  ]}
                  value={formData.subject}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('subject')}
                  required
                  error={errors.subject}
                  placeholder="Select a subject"
                />

                <FormField
                  id="message"
                  name="message"
                  label="Message"
                  value={formData.message}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('message')}
                  required
                  error={errors.message}
                  isTextarea
                  textareaRows={4}
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  aria-busy={isSubmitting}
                  className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center mt-6
                    ${isSubmitting || !isValid 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>By submitting this form, you agree to our{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                    Privacy Policy
                  </Link>
                </p>
              </div>

              {/* FAQ Link - Moved inside the form div */}
              <div className="mt-8 pt-8 border-t text-center">
                <h3 className="text-xl font-semibold mb-4">Looking for Quick Answers?</h3>
                <Link
                  to="/faq"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700"
                >
                  Check our Frequently Asked Questions
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="bg-gray-50 py-0 mb-16">
          <Newsletter webhookUrl="https://hook.eu1.make.com/newsletter-signup" />
        </div>
      </main>

    </div>
  );
};

export default Contact;