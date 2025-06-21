import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Car, Plane, Bus, ChevronDown, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import Testimonials from '../components/Testimonials';
import { smoothScrollTo } from '../utils/smoothScroll';
import { useNavigate } from 'react-router-dom';
import { GlobeDemo } from '../components/ui/GlobeDemo';
import { GlareCardDemo } from '../components/ui/glare-card-demo';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const Services = () => {
  const navigate = useNavigate();
  const { t, isLoading } = useLanguage();

  // If translations are still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleCTAClick = () => {
    navigate('/');
    setTimeout(() => {
      const bookingForm = document.getElementById('booking-form');
      if (bookingForm) {
        const isMobile = window.innerWidth < 768;
        const offset = 70;
        
        if (!isMobile) {
          smoothScrollTo(0, 1050);
          return;
        }

        const heroText = bookingForm.querySelector('h1');
        if (heroText) {
          const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
          smoothScrollTo(scrollPosition, 1050);
        }
      }
    }, 100);
  };

  const scrollToContent = () => {
    const servicesSection = document.getElementById('services-overview');
    if (servicesSection) {
      const offset = 80; // Account for header height
      const targetPosition = servicesSection.getBoundingClientRect().top + window.scrollY - offset;
      smoothScrollTo(targetPosition, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Our Services | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Explore our range of transfer services including airport pickups, private transfers, and minivan rentals for groups and families.')} />
      </Helmet>
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}> {/* 16:9 Aspect Ratio */}
          <div className="absolute inset-0">
            <img 
              src="https://i.imgur.com/DxQsDc9.jpeg" 
              alt={t('hero.imageAlt', 'Royal Transfer EU Services')} 
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-4xl mx-auto">
                <motion.h1 
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {t('hero.title', 'Our Professional Transfer & Rental Solutions')}
                </motion.h1>
                <motion.p 
                  className="text-lg sm:text-xl md:text-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  {t('hero.subtitle', 'Travel made simple, safe, and stress-free.')}
                </motion.p>
              </div>
            </div>
          </div>
          
          {/* Bouncing Arrow */}
          <motion.button
            onClick={scrollToContent}
            className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 text-white cursor-pointer"
            animate={{ y: [0, 10, 0] }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            aria-label={t('hero.scrollButton', 'Scroll to see our services')}
          >
            <ChevronDown className="w-8 h-8" />
          </motion.button>
        </div>
      </section>

      {/* Services Overview */}
      <section id="services-overview" className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-black text-center mb-4">
            {t('overview.title', 'Travel doesn\'t have to be hard.')}
          </h2>
          <p className="text-[18px] text-black text-center mb-16">
            {t('overview.subtitle', 'At Royal Transfer EU, we have carefully planned services to meet your every need.')}
          </p>

          {/* Airport Transfers */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <div className="flex items-center justify-center mb-4">
              <Plane className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl md:text-3xl font-bold">{t('airport.title', 'Airport Transfers')}</h2>
            </div>
            <p className="text-gray-600 mb-6 text-center">
              {t('airport.description', 'Make your travel easy from start to finish. Our friendly and professional drivers meet you on time at the airport and take you directly to your destination. No waiting, no stress, just relaxing rides for business or holiday trips.')}
            </p>
            <ul className="space-y-3 mb-8 max-w-lg mx-auto">
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('airport.feature1', 'Door-to-door easy service')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('airport.feature2', 'Friendly drivers who track your flights')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('airport.feature3', 'Always on time and ready when you land')}</span>
              </li>
            </ul>
            <div className="text-center">
              <button 
                onClick={handleCTAClick}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center mx-auto"
              >
                {t('airport.cta', 'Book an Airport Transfer')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          {/* Private Transfers On-Demand (Updated from Taxi Services) */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <div className="flex items-center justify-center mb-4">
              <Car className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl md:text-3xl font-bold">{t('private.title', 'Private Transfers On-Demand')}</h2>
            </div>
            <p className="text-gray-600 mb-6 text-center">
              {t('private.description', 'Need to get from A to B with comfort and reliability? Our private transfer service is designed for travelers who value punctuality, peace of mind, and quality vehicles. Book your ride in advance and let us handle the rest.')}
            </p>
            <ul className="space-y-3 mb-8 max-w-lg mx-auto">
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('private.feature1', 'Point-to-point private transfers')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('private.feature2', 'Qualified, professional drivers')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('private.feature3', 'Pre-booking required — minimum 4 hours in advance')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('private.feature4', 'Clean, premium vehicles only')}</span>
              </li>
            </ul>
            <div className="text-center">
              <button 
                onClick={handleCTAClick}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center mx-auto"
              >
                {t('private.cta', 'Book Your Private Transfer')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>

          {/* Minivan Rentals */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
            <div className="flex items-center justify-center mb-4">
              <Bus className="w-8 h-8 text-blue-600 mr-3" />
              <h2 className="text-2xl md:text-3xl font-bold">{t('minivan.title', 'Comfortable Minivan Rentals')}</h2>
            </div>
            <p className="text-gray-600 mb-6 text-center">
              {t('minivan.description', 'Going somewhere with family or a larger group? Our spacious and clean minivans can comfortably take your whole group together. Rent for one day, one week, or even longer—always easy and flexible.')}
            </p>
            <ul className="space-y-3 mb-8 max-w-lg mx-auto">
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('minivan.feature1', 'Spacious vans for groups or family adventures')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('minivan.feature2', 'Clean, reliable vehicles')}</span>
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span>{t('minivan.feature3', 'Self-drive or driver options')}</span>
              </li>
            </ul>
            <div className="text-center">
              <button 
                onClick={handleCTAClick}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center mx-auto"
              >
                {t('minivan.cta', 'Rent a Minivan Today')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Travelers Love Royal Transfer EU Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{t('whyLove.title', 'Why Travelers Love Royal Transfer EU')}</h2>
          <div className="flex justify-center">
            <GlareCardDemo />
          </div>
        </div>
      </section>

      {/* Global Coverage Section */}
      <section className="py-16 bg-white">
        <GlobeDemo />
      </section>

      {/* Booking Process */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{t('bookingProcess.title', 'Book Your Ride in 3 Easy Steps')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: "①",
                title: t('bookingProcess.step1.title', 'Choose Your Ride'),
                description: t('bookingProcess.step1.description', 'Select your service—airport transfer, taxi, or minivan rental.')
              },
              {
                number: "②",
                title: t('bookingProcess.step2.title', 'Instant Confirmation'),
                description: t('bookingProcess.step2.description', 'You\'ll quickly receive details and booking confirmation.')
              },
              {
                number: "③",
                title: t('bookingProcess.step3.title', 'Enjoy the Ride'),
                description: t('bookingProcess.step3.description', 'Relax and let our drivers handle the rest.')
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button 
              onClick={handleCTAClick}
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300"
            >
              {t('bookingProcess.cta', 'Start Your Booking')}
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />
      <div className="text-center py-8">
        <button 
          onClick={handleCTAClick}
          className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300"
        >
          {t('testimonials.cta', 'Join Our Happy Travelers')}
        </button>
      </div>

      {/* FAQ Preview */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{t('faq.title', 'Have Questions?')}</h2>
          <div className="space-y-4 mb-8">
            {[
              {
                question: t('faq.q1', 'How to book?'),
                answer: t('faq.a1', 'Book easily online, through our app, or by phone. You\'ll receive instant confirmation.')
              },
              {
                question: t('faq.q2', 'Payment options?'),
                answer: t('faq.a2', 'We accept all major credit cards, online payments, and cash payments.')
              },
              {
                question: t('faq.q3', 'What happens if flights are delayed?'),
                answer: t('faq.a3', 'Don\'t worry! We monitor your flight and adjust pickup time automatically at no extra cost.')
              }
            ].map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a 
              href="/faq"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              {t('faq.cta', 'View All FAQs')}
              <ArrowRight className="w-5 h-5 ml-1" />
            </a>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            {t('bottomCta.title', 'Ready to Travel Safely and Comfortably?')}
          </h2>
          <button 
            onClick={handleCTAClick}
            className="bg-white text-blue-600 px-8 py-3 rounded-md hover:bg-gray-100 transition-all duration-300 font-semibold"
          >
            {t('bottomCta.buttonText', 'Book Your Ride Now')}
          </button>
        </div>
      </section>

    </div>
  );
};

export default Services;