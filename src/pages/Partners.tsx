import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Car, ChevronDown, CheckCircle2, Star } from 'lucide-react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import Newsletter from '../components/Newsletter';
import { smoothScrollTo } from '../utils/smoothScroll';
import { useNavigate, useLocation } from 'react-router-dom';
import { GlobeDemo } from '../components/ui/GlobeDemo';
import { GlareCardDemo } from '../components/ui/glare-card-demo';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "Who and Where Are We?",
    answer: "EU-leading taxi & transfers facilitator based centrally—connecting airport/login/reservation transfers across mainland Europe."
  },
  {
    question: "What Do We Offer?",
    answer: "Seamless fleet management, optimized dispatching, admin & driver apps, maximizing efficiency & profits."
  },
  {
    question: "Requirements for Joining?",
    answer: "Valid driver's license, registered vehicles, business documentation, compliance with local regulations."
  },
  {
    question: "How to Start?",
    answer: "Complete the sign-up form, quickly finish onboarding, accept terms digitally, and immediately begin serving transfer requests."
  }
];

const testimonials = [
  {
    text: "Partnering with Royal Transfer EU helped us optimize trips and significantly boost revenue!",
    author: "John D.",
    company: "Alpha Taxi"
  },
  {
    text: "Fantastic app—intuitive and stress-free management—a true partner to rely on.",
    author: "Maria R.",
    company: "TransferLux"
  },
  {
    text: "The support team is incredible, and the platform has helped us grow exponentially.",
    author: "Alex M.",
    company: "EuroTransit"
  }
];

const Partners = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    website: ''
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we should scroll to the form (e.g., coming from login page)
    if (location.hash === '#partner-form') {
      setTimeout(() => {
        const formSection = document.getElementById('partner-form');
        if (formSection) {
          const offset = 80;
          const targetPosition = formSection.getBoundingClientRect().top + window.scrollY - offset;
          smoothScrollTo(targetPosition, 1000);
        }
      }, 100); // Small delay to ensure the page is fully loaded
    }
  }, [location]);

  const scrollToForm = () => {
    const formSection = document.getElementById('partner-form');
    if (formSection) {
      const offset = 80;
      const targetPosition = formSection.getBoundingClientRect().top + window.scrollY - offset;
      smoothScrollTo(targetPosition, 1000);
    }
  };

  const handleSignInClick = () => {
    navigate('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('https://your-webhook-url.com/partner-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      alert('Thank you for your interest! We will contact you shortly.');
      setFormData({
        name: '',
        surname: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        website: ''
      });
    } catch (error) {
      alert('Something went wrong. Please try again later.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 relative">
        <div className="absolute inset-0 bg-[url('https://i.imgur.com/DxQsDc9.jpeg')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            className="text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Become a Partner: Empower Your Business with Royal Transfer EU
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-700 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Say goodbye to empty miles. Come aboard today!
          </motion.p>
          <motion.div 
            className="space-x-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button 
              onClick={scrollToForm}
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300"
            >
              Sign Up
            </button>
            <button 
              onClick={handleSignInClick}
              className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-md hover:bg-blue-50 transition-all duration-300"
            >
              Sign In
            </button>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Partner with Royal Transfer EU?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Streamlined Fleet & Transfer Management",
                description: "Effortless planning and fleet optimization with our cutting-edge management application."
              },
              {
                title: "Enhanced Efficiency",
                description: "Reduce downtime and increase profits—optimal routes, fewer empty trips."
              },
              {
                title: "Dedicated Admin & Driver App",
                description: "Seamless cooperation, real-time updates, reliable driver & admin interface."
              }
            ].map((benefit, index) => (
              <div key={index} className="text-center p-6">
                <Car className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray-700">{benefit.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button 
              onClick={scrollToForm}
              className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300"
            >
              Join Now
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Unlock the Benefits, Maximize Your Earnings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Flexible Scheduling</h3>
                  <p className="text-gray-700">Full control over your availability.</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Increased Earnings</h3>
                  <p className="text-gray-700">Say goodbye to empty miles, hello to maximum returns.</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">User-Friendly App</h3>
                  <p className="text-gray-700">Easy-to-follow app for smooth transfers every time.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Maximize Profits?</h3>
              <button 
                onClick={scrollToForm}
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 flex items-center justify-center mx-auto"
              >
                Start Earning Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How to Start Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Getting Started is Easy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Complete Sign-Up Form",
                description: "Fill out our simple contact and business details form.",
                cta: "Get Started"
              },
              {
                step: "2",
                title: "Finish Onboarding & Accept Contract",
                description: "Review info and digitally accept your agreement.",
                cta: "Complete Now"
              },
              {
                step: "3",
                title: "Start Receiving Transfers",
                description: "Get routes, requests & start earning immediately.",
                cta: "Go to Dashboard"
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-700 mb-4">{step.description}</p>
                <button 
                  onClick={scrollToForm}
                  className="border-2 border-blue-600 text-blue-600 px-6 py-2 rounded-md hover:bg-blue-50 transition-all duration-300"
                >
                  {step.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Partners Say</h2>
          <div className="relative max-w-3xl mx-auto">
            <button 
              onClick={() => setCurrentTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600"
            >
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>
            
            <div className="text-center px-12">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-lg text-gray-700 mb-6">"{testimonials[currentTestimonial].text}"</p>
              <p className="font-semibold">
                {testimonials[currentTestimonial].author}
                <span className="text-gray-600"> • {testimonials[currentTestimonial].company}</span>
              </p>
            </div>

            <button 
              onClick={() => setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600"
            >
              <ChevronDown className="w-6 h-6 -rotate-90" />
            </button>
          </div>
        </div>
      </section>

      {/* Partner Sign-Up Form */}
      <section id="partner-form" className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-center mb-8">Become a Partner Today</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City & Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all duration-300 mt-6"
              >
                Get Started
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Partner Program FAQs</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  className="w-full text-left px-6 py-4 flex items-center justify-between focus:outline-none"
                  onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                >
                  <span className="text-lg font-semibold">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: activeIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  </motion.div>
                </button>
                
                <motion.div
                  initial={false}
                  animate={{ height: activeIndex === index ? 'auto' : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-white">
        <Newsletter webhookUrl="https://your-webhook-url.com/subscribe" />
      </section>

      <Sitemap />
    </div>
  );
};

export default Partners;