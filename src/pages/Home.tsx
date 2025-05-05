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

function Home() {
  const location = useLocation();
  
  // Update SEO metadata when component mounts
  useEffect(() => {
    // Set basic SEO metadata
    updateMetaTags(
      'Royal Transfer EU | Premium Airport Transfers & Taxi in Italy',
      'Professional airport transfers and taxi services across Italy with 15+ years of experience. Safe, reliable, and comfortable travel with English-speaking drivers.',
      location.pathname
    );
    
    // Add structured data for the service
    addStructuredData('Service', {
      name: 'Royal Transfer EU',
      description: 'Premium airport transfers and taxi services across Italy',
      provider: {
        '@type': 'Organization',
        name: 'Royal Transfer EU',
        logo: 'https://i.imghippo.com/files/cDgm3025PmI.webp'
      },
      serviceType: 'Airport Transfer',
      areaServed: {
        '@type': 'Country',
        name: 'Italy'
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
  }, [location.pathname]);
  
  // Initialize Google Maps early for search form
  useEffect(() => {
    // Pre-load Google Maps API as it's critical for the search functionality
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          console.log('Home: Google Maps API initialization:', success ? 'successful' : 'failed');
        });
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        {/* Additional dynamic meta tags specific to Home */}
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Royal Transfer EU",
            "url": "https://royaltransfer.eu",
            "logo": "https://i.imghippo.com/files/cDgm3025PmI.webp",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+393517482244",
              "contactType": "customer service",
              "availableLanguage": ["English", "Italian"]
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
        <Benefits />
      </LazyComponent>
      
      <LazyComponent height={500}>
        <FeaturedDestinations />
      </LazyComponent>
      
      <LazyComponent height={450}>
        <TrustBadges />
      </LazyComponent>
      
      <LazyComponent height={400}>
        <Services />
      </LazyComponent>
      
      <LazyComponent>
        <AboutPreview />
      </LazyComponent>
      
      <LazyComponent>
        <FAQPreview />
      </LazyComponent>
      
      <LazyComponent>
        <BookingProcess />
      </LazyComponent>
      
      <LazyComponent>
        <Testimonials />
      </LazyComponent>
      
      <DeferredComponent delay={300}>
        <CallToAction />
      </DeferredComponent>
    </div>
  );
}

export default Home;