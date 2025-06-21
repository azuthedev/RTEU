import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Users, Award, ShieldCheck, Calendar, Clock, Phone, Mail } from 'lucide-react';

import Header from '../components/Header';
import LazyComponent from '../components/LazyComponent';
import { useLanguage } from '../contexts/LanguageContext';
import { updateMetaTags, addStructuredData } from '../utils/seo';

const About = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  
  // Update SEO metadata when component mounts
  useEffect(() => {
    // Set basic SEO metadata
    updateMetaTags(
      t('meta.title', 'About Us | Royal Transfer EU'),
      t('meta.description', 'Learn about Royal Transfer EU\'s 15+ years of experience providing premium airport transfers and private transportation services across Italy.'),
      location.pathname
    );
    
    // Add structured data for the organization
    addStructuredData('Organization', {
      name: 'Royal Transfer EU',
      url: 'https://royaltransfereu.com',
      logo: 'https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp',
      description: t('meta.description', 'Learn about Royal Transfer EU\'s 15+ years of experience providing premium airport transfers and private transportation services across Italy.'),
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+393517482244',
        contactType: 'customer service',
        availableLanguage: [t('schema.languages', 'English, Italian')]
      },
      foundingDate: '2010'
    });
  }, [location.pathname, t]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'About Us | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Learn about Royal Transfer EU\'s 15+ years of experience providing premium airport transfers and private transportation services across Italy.')} />
      </Helmet>
      
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-blue-600">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <motion.h1 
              className="text-4xl md:text-5xl font-serif font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {t('hero.title', 'About Royal Transfer EU')}
            </motion.h1>
            <motion.p 
              className="text-xl md:text-2xl max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t('hero.subtitle', 'Premium airport transfers with a personal touch')}
            </motion.p>
          </div>
        </div>
      </section>
      
      {/* Company History */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-serif font-bold mb-8 text-center">
              {t('history.title', 'Our Story')}
            </h2>
            
            <div className="space-y-6">
              {(t('history.paragraphs', [], { returnObjects: true }) as string[]).map((paragraph: string, index: number) => (
                <motion.p 
                  key={index} 
                  className="text-lg text-gray-700"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Mission and Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">
              {t('mission.title', 'Our Mission')}
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              {t('mission.text', 'To make travel seamless by providing exceptional airport transfer experiences with professionalism, reliability, and attention to detail.')}
            </p>
          </div>
          
          <div className="text-center mb-12">
            <h3 className="text-2xl font-serif font-bold mb-8">
              {t('mission.values.title', 'Core Values')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('mission.values.punctuality.title', 'Punctuality')}
                </h4>
                <p className="text-gray-600">
                  {t('mission.values.punctuality.description', 'We understand that time is precious, especially when traveling. Our drivers are always on time, tracking flights to adjust for any changes in your schedule.')}
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('mission.values.comfort.title', 'Comfort')}
                </h4>
                <p className="text-gray-600">
                  {t('mission.values.comfort.description', 'Our well-maintained premium vehicles ensure a comfortable journey, allowing you to relax after a long flight or prepare for your next destination.')}
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('mission.values.service.title', 'Personalized Service')}
                </h4>
                <p className="text-gray-600">
                  {t('mission.values.service.description', 'We recognize that each traveler has unique needs. Our service is tailored to meet your specific requirements and preferences.')}
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-2">
                  {t('mission.values.safety.title', 'Safety')}
                </h4>
                <p className="text-gray-600">
                  {t('mission.values.safety.description', 'Your safety is our top priority. Our professional drivers are experienced, licensed, and committed to safe driving practices.')}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">
              {t('services.title', 'Our Services')}
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              {t('services.subtitle', 'Premium transportation solutions for all your travel needs')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <motion.div 
              className="bg-gray-50 p-6 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-bold mb-3">
                {t('services.airport.title', 'Airport Transfers')}
              </h3>
              <p className="text-gray-700">
                {t('services.airport.description', 'Door-to-door service between airports and your destination with flight tracking and free waiting time.')}
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-gray-50 p-6 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3 className="text-xl font-bold mb-3">
                {t('services.intercity.title', 'Intercity Transfers')}
              </h3>
              <p className="text-gray-700">
                {t('services.intercity.description', 'Comfortable transfers between cities with experienced drivers who know the best routes.')}
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-gray-50 p-6 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-xl font-bold mb-3">
                {t('services.events.title', 'Event & Conference Transfers')}
              </h3>
              <p className="text-gray-700">
                {t('services.events.description', 'Reliable transportation for corporate events, conferences, and special occasions.')}
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-gray-50 p-6 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-xl font-bold mb-3">
                {t('services.group.title', 'Group Transfers')}
              </h3>
              <p className="text-gray-700">
                {t('services.group.description', 'Spacious vehicles for groups of all sizes, ensuring everyone travels together comfortably.')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Team */}
      <LazyComponent>
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif font-bold mb-4">
                {t('team.title', 'Our Team')}
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                {t('team.subtitle', 'Meet the professionals behind your smooth travel experience')}
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto mb-12">
              <p className="text-lg text-gray-700 text-center">
                {t('team.description', 'Our team consists of experienced drivers, customer support specialists, and operations managers working together to ensure your journey is perfect from booking to arrival.')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-xl font-bold mb-3">
                  {t('team.drivers.title', 'Professional Drivers')}
                </h3>
                <p className="text-gray-700">
                  {t('team.drivers.description', 'Our carefully selected drivers combine local knowledge with professional training. They speak English fluently and are committed to providing exceptional service.')}
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="text-xl font-bold mb-3">
                  {t('team.support.title', 'Customer Support')}
                </h3>
                <p className="text-gray-700">
                  {t('team.support.description', 'Available 24/7 to assist with bookings, changes, or any questions you may have before, during, or after your journey.')}
                </p>
              </motion.div>
              
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h3 className="text-xl font-bold mb-3">
                  {t('team.operations.title', 'Operations Team')}
                </h3>
                <p className="text-gray-700">
                  {t('team.operations.description', 'Working behind the scenes to coordinate transfers, monitor flights, and ensure every detail is perfectly managed.')}
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </LazyComponent>
      
      {/* Coverage */}
      <LazyComponent>
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-serif font-bold mb-8 text-center">
                {t('coverage.title', 'Where We Operate')}
              </h2>
              
              <p className="text-lg text-gray-700 mb-10">
                {t('coverage.description', 'We provide premium transfer services across major Italian cities and destinations, including Rome, Milan, Florence, Venice, Naples, and many more. Whether you\'re arriving at a major international airport or need transportation between cities, we\'ve got you covered.')}
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {(t('coverage.cities', [], { returnObjects: true }) as string[]).map((city: string, index: number) => (
                  <motion.span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {city}
                  </motion.span>
                ))}
              </div>
              
              <div className="flex justify-center">
                <motion.a
                  href="https://royaltransfereu.com/blogs/destinations" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                  whileHover={{ x: 5 }}
                >
                  Learn more about our destinations →
                </motion.a>
              </div>
            </div>
          </div>
        </section>
      </LazyComponent>
      
      {/* Call to Action */}
      <LazyComponent>
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2 
              className="text-3xl font-serif font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {t('cta.title', 'Experience Premium Transfers')}
            </motion.h2>
            <motion.p 
              className="text-xl mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {t('cta.text', 'Ready to experience hassle-free travel with Royal Transfer EU?')}
            </motion.p>
            <motion.a
              href="/"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-md font-medium hover:bg-gray-100 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -3 }}
            >
              {t('cta.button', 'Book Your Transfer')}
            </motion.a>
          </div>
        </section>
      </LazyComponent>
      
      {/* Contact Information */}
      <LazyComponent>
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif font-bold mb-4">Contact Us</h2>
                <p className="text-gray-600">We're here to answer any questions you may have</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Phone</h3>
                  <p className="text-gray-700">+39 351 748 2244</p>
                  <p className="text-sm text-gray-500">Available 24/7</p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Email</h3>
                  <p className="text-gray-700">contact@royaltransfereu.com</p>
                  <p className="text-sm text-gray-500">We'll respond within 24 hours</p>
                </div>
                
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Business Hours</h3>
                  <p className="text-gray-700">24 hours / 7 days</p>
                  <p className="text-sm text-gray-500">Always at your service</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </LazyComponent>
    </div>
  );
};

export default About;