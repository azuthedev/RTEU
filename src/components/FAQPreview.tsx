import React, { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const FAQPreview = () => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: t('faq.how.head'),
      answer: t('faq.how.sub')
    },
    {
      question: t('faq.prices.head'),
      answer: t('faq.prices.sub')
    },
    {
      question: t('faq.where.head'),
      answer: t('faq.where.sub')
    },
    {
      question: t('faq.group.head'),
      answer: t('faq.group.sub')
    }
  ];

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">{t('faq.head')}</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden"
              initial={false}
              animate={{ backgroundColor: activeIndex === index ? '#f8fafc' : '#ffffff' }}
              transition={{ duration: 0.2 }}
            >
              <button
                className="w-full text-left px-6 py-4 flex items-center justify-between focus:outline-none"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-semibold text-gray-700">{faq.question}</span>
                <motion.div
                  animate={{ rotate: activeIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </motion.div>
              </button>
              
              <AnimatePresence initial={false}>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-4">
                      <p className="text-gray-600 mb-2">{faq.answer}</p>
                      <Link
                        to="/faq"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700"
                      >
                        {t('faq.cta')} <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQPreview;