import React, { useEffect } from 'react';
import Header from '../components/Header';
import TrustBadges from '../components/TrustBadges';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { updateMetaTags, addStructuredData, addBreadcrumbData } from '../utils/seo';

const About = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Update meta tags and add structured data
    updateMetaTags(
      'About Us | Royal Transfer EU',
      'Learn about Royal Transfer EU\'s 15+ years of experience providing premium airport transfers and taxi services across Italy.',
      location.pathname
    );
    
    // Add breadcrumb data
    addBreadcrumbData(location.pathname);
    
    // Add structured data for the company
    addStructuredData('Organization', {
      name: 'Royal Transfer EU',
      url: 'https://royaltransfer.eu',
      logo: 'https://i.imghippo.com/files/cDgm3025PmI.webp',
      description: 'Premium airport transfers and taxi services across Italy with 15+ years of experience.',
      founder: {
        '@type': 'Person',
        name: 'Royal Transfer Founder'
      },
      foundingDate: '2010',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IT',
        addressLocality: 'Rome'
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+393517482244',
        contactType: 'customer service',
        availableLanguage: ['English', 'Italian']
      }
    });
  }, [location.pathname]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>About Us | Royal Transfer EU</title>
        <meta name="description" content="Learn about Royal Transfer EU's 15+ years of experience providing premium airport transfers and taxi services across Italy." />
      </Helmet>
      <Header isAboutPage />
      
      <main className="pt-32 pb-16">
        <motion.div 
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold mb-8">About Royal Transfer EU</h1>
          
          <motion.div 
            className="prose prose-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <p className="text-xl text-gray-700 mb-8">
              At Royal Transfer EU, we believe every journey has meaning, and every travel experience deserves to be exceptional. Founded more than 15 years ago, our company was built upon a passion for reliable, comfortable, and safe transportation, transforming ordinary travel into memorable experiences across Spain and Italy.
            </p>

            <p className="text-gray-600 mb-8">
              Over the years, Royal Transfer EU has proudly earned the trust of thousands of satisfied travellers through our meticulous attention to detail, unwavering customer focus, and commitment to excellence. Whether you're traveling for business, leisure, or family adventures, we understand that punctuality, reliability, and comfort are essential ingredients for creating unforgettable journeys.
            </p>

            <p className="text-gray-600 mb-12">
              Our dedicated team is our greatest asset, composed exclusively of fully licensed, knowledgeable, and courteous professionals, each handpicked for their experience, careful driving record, and customer-oriented attitude. Every aspect of your journey—from initial booking and pick-up to your final destination—is carefully planned, streamlined, and tailored around your unique needs.
            </p>

            <h2 className="text-2xl font-bold mb-6">Why Choose Us? The Royal Transfer EU Difference:</h2>

            <div className="grid gap-8 mb-12">
              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-xl font-semibold mb-2">Proven Track Record</h3>
                <p className="text-gray-600">With over 15 years of specialized service, we have safely transported thousands of satisfied clients and earned a reputation as one of Europe's most dependable transfer providers.</p>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-xl font-semibold mb-2">Expert, Licensed Drivers</h3>
                <p className="text-gray-600">Our professional taxi drivers undergo thorough screenings, rigorous training, and continuous assessments to ensure the highest standard of service, compliance, and professionalism.</p>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-xl font-semibold mb-2">Commitment to Safety & Efficiency</h3>
                <p className="text-gray-600">We place your safety and comfort above all else. Our modern fleet is regularly serviced, meticulously cleaned, and fully compliant with all safety measures. We monitor flights in real-time, adjusting pick-up schedules accordingly to ensure convenience.</p>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-lg shadow-md"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-xl font-semibold mb-2">Exceptional Customer Service</h3>
                <p className="text-gray-600">Available around the clock, our customer support team is committed to providing prompt responses, helpful solutions, and hassle-free support at every stage of your journey. At Royal Transfer EU, your peace of mind is our priority, and we're here for you—any time, every time.</p>
              </motion.div>
            </div>

            <TrustBadges />

            <p className="text-xl text-gray-700 italic mb-4">
              Experience travel the way it was always meant to be: effortless, enjoyable, and worry-free.
            </p>
            
            <p className="text-xl font-semibold text-gray-700">
              Welcome to Royal Transfer EU, where the road truly is part of your adventure.
            </p>
          </motion.div>
        </motion.div>
      </main>

    </div>
  );
};

export default About;