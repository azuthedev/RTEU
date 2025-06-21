import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Benefits from '../components/Benefits';
import AboutPreview from '../components/AboutPreview';
import Services from '../components/Services';
import FAQPreview from '../components/FAQPreview';
import BookingProcess from '../components/BookingProcess';
import FeaturedDestinations from '../components/FeaturedDestinations';
import Testimonials from '../components/Testimonials';
import CallToAction from '../components/CallToAction';
import TrustBadges from '../components/TrustBadges';
import { updateMetaTags, addStructuredData } from '../utils/seo';
import LazyComponent from '../components/LazyComponent';
import DeferredComponent from '../components/DeferredComponent';
import { initGoogleMaps } from '../utils/optimizeThirdParty'; 
import { BookingProvider, useBooking } from '../contexts/BookingContext';
import { useLanguage } from '../contexts/LanguageContext';

function HomeContent() {
  const location = useLocation();
  const { clearBookingState } = useBooking();
  const { t } = useLanguage(); // Added useLanguage hook
  
  // Update SEO metadata when component mounts
  useEffect(() => {
    // Set basic SEO metadata
    updateMetaTags(
      t('home.seo.title', 'Royal Transfer EU | Premium Airport Transfers in Italy'),
      t('home.seo.description', 'Professional airport transfers and private transfer services across Italy with 15+ years of experience. Safe, reliable, and comfortable travel with English-speaking drivers.'),
      location.pathname
    );
    
    // Add structured data for the service
    addStructuredData('Service', {
      name: t('home.structuredData.name', 'Royal Transfer EU'),
      description: t('home.structuredData.description', 'Premium airport transfers and private transfer services across Italy'),
      provider: {
        '@type': 'Organization',
        name: t('home.structuredData.provider', 'Royal Transfer EU'),
        logo: 'https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp'
      },
      serviceType: t('home.structuredData.serviceType', 'Airport Transfer'),
      areaServed: {
        '@type': 'Country',
        name: t('home.structuredData.areaServed', 'Italy')
      },
      offers: {
        '@type': 'Offer',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          priceCurrency: 'EUR',
          unitText: 'trip'
        }
      }
    });
  }, [location.pathname, t]);
  
  // Initialize Google Maps early for search form
  useEffect(() => {
    // Clear booking state when Home component mounts
    // This ensures fresh booking state for new searches
    clearBookingState();
    
    // Pre-load Google Maps API as it's critical for the search functionality
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          console.log('Home: Google Maps API initialization:', success ? 'successful' : 'failed');
        });
    }
  }, [clearBookingState]);
  
  return (
    <>
      <Helmet>
        {/* Additional dynamic meta tags specific to Home */}
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": t('home.schema.name', 'Royal Transfer EU'),
            "url": "https://royaltransfereu.com",
            "logo": "https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+393517482244",
              "contactType": "customer service",
              "availableLanguage": [t('home.schema.languages', 'English, Italian')]
            },
            "sameAs": [
              "https://www.instagram.com/royaltransfer1991/"
            ]
          })}
        </script>
      </Helmet>
      <Header />
      <Hero />
       
      <LazyComponent height={400}>
        <Services />
      </LazyComponent>

      <LazyComponent>
        <BookingProcess />
      </LazyComponent>

      <LazyComponent height={400}>
        <Benefits />
      </LazyComponent>

      <TrustBadges />
      
      
      <LazyComponent>
        <FAQPreview />
      </LazyComponent>
      
      <LazyComponent>
        <Testimonials />
      </LazyComponent>
      
    </>
  );
}

// Wrap the Home component with BookingProvider to fix the "useBooking must be used within a BookingProvider" error
function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BookingProvider>
        <HomeContent />
      </BookingProvider>
    </div>
  );
}

export default Home;