import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import ContactDialog from '../components/ContactDialog';
import Newsletter from '../components/Newsletter';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

interface FAQCategory {
  title: string;
  questions: {
    question: string;
    answer: string;
  }[];
}

const FAQ = () => {
  const { t, isLoading } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

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

  const faqCategories: FAQCategory[] = [
    {
      title: t('faq.categories.booking.title', "Booking & Reservations"),
      questions: [
        {
          question: t('faq.categories.booking.q1', "How do I book an airport transfer or taxi?"),
          answer: t('faq.categories.booking.a1', "It's simple! Book instantly online through our easy-to-use booking system, via our app, or by phone. You'll receive immediate confirmation and all travel details.")
        },
        {
          question: t('faq.categories.booking.q2', "Can I make a special request when booking?"),
          answer: t('faq.categories.booking.a2', "Absolutely! After selecting your journey details, you'll have the opportunity to add notes or request special amenities during the booking process or by contacting our customer support.")
        },
        {
          question: t('faq.categories.booking.q3', "How far in advance should I book my transfer?"),
          answer: t('faq.categories.booking.a3', "While we accept immediate and short-notice bookings, we recommend booking at least 24 hours before your scheduled pick-up for guaranteed availability, especially during peak seasons.")
        },
        {
          question: t('faq.categories.booking.q4', "Can I reserve multiple rides at once?"),
          answer: t('faq.categories.booking.a4', "Of course! Simply select 'Add Another Ride' during your booking or contact our customer service to help you schedule multiple rides effortlessly.")
        }
      ]
    },
    {
      title: t('faq.categories.pricing.title', "Pricing & Payments"),
      questions: [
        {
          question: t('faq.categories.pricing.q1', "Do you offer fixed fares or metered rides?"),
          answer: t('faq.categories.pricing.a1', "We provide both options! Choose a fixed fare upfront for total transparency or a metered ride payable upon arrival — whichever suits your preference and travel needs.")
        },
        {
          question: t('faq.categories.pricing.q2', "How can I pay for my booking?"),
          answer: t('faq.categories.pricing.a2', "We accept all major credit/debit cards (Visa, MasterCard, American Express), online payments, bank transfers, and payments via secure online payment gateways. You can pay in advance or directly to the driver upon completion of the ride.")
        },
        {
          question: t('faq.categories.pricing.q3', "Are payments secure and protected?"),
          answer: t('faq.categories.pricing.a3', "Yes, safety is a top priority. Our online payment portals use encrypted SSL protection, ensuring your personal information and transactions remain fully secure.")
        },
        {
          question: t('faq.categories.pricing.q4', "Are there any other hidden charges or costs?"),
          answer: t('faq.categories.pricing.a4', "Absolutely not! Transparency is key at Royal Transfer EU. The confirmed price you receive includes all taxes, service charges, and fees unless additional optional services are specifically requested.")
        }
      ]
    },
    {
      title: t('faq.categories.airport.title', "Airport Transfers & Pick-Up Procedures"),
      questions: [
        {
          question: t('faq.categories.airport.q1', "What if my flight is delayed?"),
          answer: t('faq.categories.airport.a1', "We actively monitor your flight status and automatically adjust your pick-up time. Rest assured, no additional charge applies for delays.")
        },
        {
          question: t('faq.categories.airport.q2', "Where will my driver meet me at the airport?"),
          answer: t('faq.categories.airport.a2', "Your professional driver will await your arrival in the airport's arrivals area, holding a clearly displayed sign showing your name or your specified company information.")
        },
        {
          question: t('faq.categories.airport.q3', "How soon will I meet my driver after the flight's arrival?"),
          answer: t('faq.categories.airport.a3', "Our driver is scheduled to be there waiting for you before your flight lands and will greet you upon exiting baggage reclaim—no waiting needed.")
        }
      ]
    },
    {
      title: t('faq.categories.taxi.title', "Taxi Services"),
      questions: [
        {
          question: t('faq.categories.taxi.q1', "Can I pre-book my taxi?"),
          answer: t('faq.categories.taxi.a1', "Absolutely! We encourage pre-booking for guaranteed availability but also accept immediate ride requests if cars are available nearby.")
        },
        {
          question: t('faq.categories.taxi.q2', "Are your taxi drivers fully qualified and insured?"),
          answer: t('faq.categories.taxi.a2', "Definitely! All our drivers are fully licensed and professionally insured. Your journey's safety and comfort remain our top priorities.")
        },
        {
          question: t('faq.categories.taxi.q3', "Is there a limitation on the travel distance for taxi bookings?"),
          answer: t('faq.categories.taxi.a3', "None at all. We cater to both short journeys within the city and long-distance transfers to different regions.")
        }
      ]
    },
    {
      title: t('faq.categories.minivan.title', "Minivan Rentals (With or Without Driver)"),
      questions: [
        {
          question: t('faq.categories.minivan.q1', "What's included in my minivan rental service?"),
          answer: t('faq.categories.minivan.a1', "Each rental package includes unlimited mileage, standard insurance coverage (with optional upgrades), GPS navigation (upon request), comfortable modern vehicles, and 24/7 roadside assistance.")
        },
        {
          question: t('faq.categories.minivan.q2', "Can I rent a minivan without a driver?"),
          answer: t('faq.categories.minivan.a2', "Yes, self-driven minivans are available. Alternatively, chauffeur-driven vehicle options are also on offer for a completely relaxed, hands-free travel experience.")
        },
        {
          question: t('faq.categories.minivan.q3', "Is there a minimum rental period?"),
          answer: t('faq.categories.minivan.a3', "Rentals begin at just one day, with discounted rates applied to multi-day and longer-duration rentals.")
        },
        {
          question: t('faq.categories.minivan.q4', "Are there specific documentation requirements for minivan rental?"),
          answer: t('faq.categories.minivan.a4', "Yes, standard documentation includes a valid driver's license, passport or official ID, and proof of payment. Additional details will be clarified during your booking process.")
        }
      ]
    },
    {
      title: t('faq.categories.vehicles.title', "Vehicle Types & Availability"),
      questions: [
        {
          question: t('faq.categories.vehicles.q1', "What types of vehicles does your fleet include?"),
          answer: t('faq.categories.vehicles.a1', "Our diverse fleet includes comfortable sedans, luxury taxis, spacious minivans, and luxurious executive vehicles suitable for different group sizes and travel preferences.")
        },
        {
          question: t('faq.categories.vehicles.q2', "Can you accommodate groups or large families?"),
          answer: t('faq.categories.vehicles.a2', "Definitely! Our modern minivans and larger vehicles comfortably accommodate families and groups with substantial luggage space available.")
        },
        {
          question: t('faq.categories.vehicles.q3', "Do you provide child safety seats?"),
          answer: t('faq.categories.vehicles.a3', "Yes, child safety seats, booster seats, and other amenities can be provided at your request, free of charge.")
        }
      ]
    },
    {
      title: t('faq.categories.luggage.title', "Luggage & Baggage Policies"),
      questions: [
        {
          question: t('faq.categories.luggage.q1', "Is there a luggage limit?"),
          answer: t('faq.categories.luggage.a1', "Standard allowances are typically one suitcase and one carry-on per passenger. But no worries, if you have additional pieces of luggage or larger items, please let us know when booking—special vehicles can always be arranged.")
        },
        {
          question: t('faq.categories.luggage.q2', "Can you transport special items like skis, golf bags, or bicycles?"),
          answer: t('faq.categories.luggage.a2', "Yes, we can accommodate sporting equipment and oversized luggage. Just include your requirements during booking to ensure the appropriate vehicle is designated.")
        }
      ]
    },
    {
      title: t('faq.categories.changes.title', "Changes & Cancellation Policies"),
      questions: [
        {
          question: t('faq.categories.changes.q1', "Can I modify my booking details after confirmation?"),
          answer: t('faq.categories.changes.a1', "Absolutely! Plans change, we understand. Contact our customer support anytime to adjust your booking—with no hassle or hidden fees.")
        },
        {
          question: t('faq.categories.changes.q2', "What if I need to cancel my reservation?"),
          answer: t('faq.categories.changes.a2', "Cancellations made up to 24 hours before your scheduled journey receive a full, hassle-free refund. For cancellations within 24 hours, please contact support for assistance in evaluating options.")
        }
      ]
    },
    {
      title: t('faq.categories.safety.title', "Safety, Security, and Reliability"),
      questions: [
        {
          question: t('faq.categories.safety.q1', "What safety protocols do you follow?"),
          answer: t('faq.categories.safety.a1', "Your safety is paramount. Our vehicles undergo strict regular maintenance, cleanliness protocols, and compliance monitoring. Our professional drivers are rigorously vetted and regularly trained in passenger safety procedures.")
        },
        {
          question: t('faq.categories.safety.q2', "Are your vehicles insured and regularly inspected?"),
          answer: t('faq.categories.safety.a2', "Yes, every vehicle is fully insured, licensed with required local authorities, and undergoes regular in-depth vehicle inspections and servicing.")
        }
      ]
    },
    {
      title: t('faq.categories.support.title', "Customer Support & Assistance"),
      questions: [
        {
          question: t('faq.categories.support.q1', "How can I contact support during my journey?"),
          answer: t('faq.categories.support.a1', "We're available for you 24/7 by telephone, email, or live online chat. Reach out at any stage of your travel for immediate help or for solving any unexpected issues or questions.")
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  useEffect(() => {
    if (searchQuery) {
      const firstMatchIndex = filteredCategories.findIndex(cat => cat.questions.length > 0);
      if (firstMatchIndex !== -1) {
        setExpandedCategory(firstMatchIndex);
        const questionId = `${firstMatchIndex}-0`;
        setExpandedQuestions(new Set([questionId]));
      }
    } else {
      setExpandedCategory(null);
      setExpandedQuestions(new Set());
    }
  }, [searchQuery]);

  const toggleCategory = (index: number) => {
    if (expandedCategory === index) {
      setExpandedCategory(null);
      setExpandedQuestions(new Set());
    } else {
      setExpandedCategory(index);
      const newExpandedQuestions = new Set([...expandedQuestions].filter(id => id.startsWith(`${index}-`)));
      setExpandedQuestions(newExpandedQuestions);
    }
  };

  const toggleQuestion = (categoryIndex: number, questionId: string) => {
    const newExpandedQuestions = new Set(expandedQuestions);
    
    if (expandedCategory !== categoryIndex) {
      setExpandedCategory(categoryIndex);
      newExpandedQuestions.clear();
    }
    
    if (newExpandedQuestions.has(questionId)) {
      newExpandedQuestions.delete(questionId);
    } else {
      newExpandedQuestions.add(questionId);
    }
    
    setExpandedQuestions(newExpandedQuestions);
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
        <title>{t('faq.meta.title', 'Frequently Asked Questions | Royal Transfer EU')}</title>
        <meta name="description" content={t('faq.meta.description', 'Find answers to common questions about our services, booking process, and policies.')} />
      </Helmet>
      <Header />
      
      <main className="pt-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h1 className="text-4xl font-bold mb-6 text-center">{t('faq.title', 'Frequently Asked Questions')}</h1>

          <p className="text-lg text-gray-700 mb-8 text-center">
            {t('faq.intro', 'We know your travel plans are important, and questions may arise. At Royal Transfer EU, our goal is your peace of mind. Below are answers to the most frequently asked questions. Don\'t see your question here? Feel free to contact our 24/7 customer support team anytime!')}
          </p>

          {/* Search Bar */}
          <div className="relative mb-12">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('faq.search', 'Search FAQs...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* FAQ Categories */}
          <div className="space-y-4">
            {filteredCategories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(categoryIndex)}
                  aria-expanded={expandedCategory === categoryIndex}
                >
                  <h2 className="text-xl font-bold">{category.title}</h2>
                  <motion.div
                    animate={{ rotate: expandedCategory === categoryIndex ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-6 h-6 text-gray-500" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {expandedCategory === categoryIndex && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 pb-4 space-y-4">
                        {category.questions.map((item, qIndex) => {
                          const questionId = `${categoryIndex}-${qIndex}`;
                          return (
                            <div key={qIndex} className="border rounded-lg overflow-hidden">
                              <button
                                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                                onClick={() => toggleQuestion(categoryIndex, questionId)}
                                aria-expanded={expandedQuestions.has(questionId)}
                              >
                                <h3 className="text-lg font-semibold">{item.question}</h3>
                                <motion.div
                                  animate={{ 
                                    rotate: expandedQuestions.has(questionId) ? 180 : 0 
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                </motion.div>
                              </button>

                              <AnimatePresence>
                                {expandedQuestions.has(questionId) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <p className="px-4 pb-4 text-gray-700">{item.answer}</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Still Need Help Section */}
        <div className="w-full bg-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h2 className="text-2xl font-bold mb-4">{t('faq.needHelp.title', 'Still Have a Question?')}</h2>
            <p className="text-gray-700 mb-6">{t('faq.needHelp.description', 'Our friendly team is available around the clock.')}</p>
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setIsContactDialogOpen(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-all duration-300 w-64"
              >
                {t('faq.needHelp.contactButton', 'Contact Support Now')}
              </button>
              <button
                onClick={openAIChat}
                className="bg-[#E6AB00] text-white px-8 py-3 rounded-md hover:opacity-90 transition-all duration-300 flex items-center justify-center w-64"
              >
                <MessageCircle className="w-6 h-6 mr-2" />
                {t('faq.needHelp.chatButton', 'Speak to us Instantly!')}
              </button>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-50 py-16 border-t">
          <Newsletter webhookUrl="https://hook.eu1.make.com/newsletter-signup" />
        </div>
      </main>

      <ContactDialog
        isOpen={isContactDialogOpen}
        onClose={() => setIsContactDialogOpen(false)}
      />
    </div>
  );
};

export default FAQ;