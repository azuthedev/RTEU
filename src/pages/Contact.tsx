import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, ArrowRight, MessageCircle, Building2, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Newsletter from '../components/Newsletter';
import FormField from '../components/ui/form-field';
import FormSelect from '../components/ui/form-select';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const WEBHOOK_URL = 'https://hook.eu1.make.com/contact-form';

const Contact = () => {
  const { t, isLoading } = useLanguage();
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

  // If translations are still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading contact information...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when field value changes
    setSubmitError(null);
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject || !formData.message.trim()) {
      setSubmitError(t('form.error', 'Please fill in all required fields'));
      return;
    }

    // Set loading state
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

      // Show success message
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitError(t('form.error', 'There was a problem sending your message. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
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
      <Helmet>
        <title>{t('meta.title', 'Contact Us | Royal Transfer EU')}</title>
        <meta 
          name="description" 
          content={t('meta.description', 'Get in touch with Royal Transfer EU for booking assistance, support, or partnership inquiries. We\'re available 24/7 to help with your travel needs.')} 
        />
      </Helmet>
      <Header />
      
      <main className="pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl md:text-4xl font-bold mb-4">{t('hero.title', "We'd Love to Hear from You!")}</h1>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              {t('hero.description', "Whether you have questions about our services, need assistance with a booking, or want to explore partnership opportunities, we're here to help.")}
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
                <h2 className="text-2xl font-bold mb-6">{t('contactInfo.title', 'Get in Touch')}</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">{t('contactInfo.phone.label', 'Phone')}</h3>
                      <p className="text-gray-700">{t('contactInfo.phone.number', '+39 351 748 22 44')}</p>
                      <p className="text-sm text-gray-500">{t('contactInfo.phone.availability', 'Available 24/7')}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">{t('contactInfo.email.label', 'Email')}</h3>
                      <p className="text-gray-700">{t('contactInfo.email.address', 'contact@royaltransfereu.com')}</p>
                      <p className="text-sm text-gray-500">{t('contactInfo.email.response', 'Quick response guaranteed')}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">{t('contactInfo.address.label', 'Address')}</h3>
                      <p className="text-gray-700">{t('contactInfo.address.line1', '123 Transfer Street')}</p>
                      <p className="text-gray-700">{t('contactInfo.address.line2', 'EU 12345')}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">{t('contactInfo.business.label', 'Business Hours')}</h3>
                      <p className="text-gray-700">{t('contactInfo.business.hours', '24/7 Support Available')}</p>
                      <p className="text-sm text-gray-500">{t('contactInfo.business.office', 'Office: Mon-Fri 9:00-18:00')}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">{t('contactInfo.leadership.label', 'Leadership')}</h3>
                      <p className="text-gray-700">{t('contactInfo.leadership.business', 'For Business Inquiries:')}</p>
                      <p className="text-sm text-gray-500">{t('contactInfo.leadership.email', 'partnerships@royaltransfereu.com')}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={openAIChat}
                    className="w-full bg-[#E6AB00] text-white px-8 py-3 rounded-md hover:opacity-90 transition-all duration-300 flex items-center justify-center"
                  >
                    <MessageCircle className="w-6 h-6 mr-2" />
                    {t('chatButton', 'Chat with Us Now')}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold mb-4">{t('immediateHelp.title', 'Need Immediate Help?')}</h2>
                <p className="text-gray-700 mb-6">
                  {t('immediateHelp.description', 'Our 24/7 customer support team is ready to assist you with any urgent matters.')}
                </p>
                <a 
                  href="tel:+393517482244"
                  className="bg-blue-600 text-white text-[13px] md:text-xl px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {t('immediateHelp.callButton', 'Call Now: +39 351 748 22 44')}
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
              <h2 className="text-2xl font-bold mb-6">{t('form.title', 'Send Us a Message')}</h2>
              
              {submitSuccess && (
                <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center" role="alert">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <p>{t('form.success', 'Thank you for your message! We will get back to you shortly.')}</p>
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
                  label={t('form.fields.name.label', 'Full Name')}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  autoComplete="name"
                  placeholder={t('form.fields.name.placeholder', 'Enter your name')}
                />

                <FormField
                  id="email"
                  name="email"
                  label={t('form.fields.email.label', 'Email Address')}
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  placeholder={t('form.fields.email.placeholder', 'Enter your email')}
                />

                <FormField
                  id="phone"
                  name="phone"
                  label={t('form.fields.phone.label', 'Phone Number')}
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  autoComplete="tel"
                  helpText={t('form.fields.phone.help', 'Optional, but recommended for faster response')}
                  placeholder={t('form.fields.phone.placeholder', 'Enter your phone number')}
                />

                <FormSelect
                  id="subject"
                  name="subject"
                  label={t('form.fields.subject.label', 'Subject')}
                  options={[
                    { value: '', label: t('form.fields.subject.placeholder', 'Select a subject') },
                    { value: 'booking', label: t('form.fields.subject.options.booking', 'Booking Inquiry') },
                    { value: 'support', label: t('form.fields.subject.options.support', 'Customer Support') },
                    { value: 'partnership', label: t('form.fields.subject.options.partnership', 'Business Partnership') },
                    { value: 'feedback', label: t('form.fields.subject.options.feedback', 'Feedback') },
                    { value: 'other', label: t('form.fields.subject.options.other', 'Other') }
                  ]}
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  placeholder={t('form.fields.subject.placeholder', 'Select a subject')}
                />

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('form.fields.message.label', 'Message')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder={t('form.fields.message.placeholder', 'Enter your message')}
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className={`w-full py-3 rounded-md transition-all duration-300 flex items-center justify-center mt-6
                    ${isSubmitting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('form.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      {t('form.fields.submit', 'Send Message')}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>
                  {t('form.privacy', 'By submitting this form, you agree to our')} {' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                    {t('sitemap.gethelp.privacy', 'Privacy Policy')}
                  </Link>
                </p>
              </div>

              {/* FAQ Link - Moved inside the form div */}
              <div className="mt-8 pt-8 border-t text-center">
                <h3 className="text-xl font-semibold mb-4">{t('faq.title', 'Looking for Quick Answers?')}</h3>
                <Link
                  to="/faq"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700"
                >
                  {t('faq.link', 'Check our Frequently Asked Questions')}
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