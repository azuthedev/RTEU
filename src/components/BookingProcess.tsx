import React from 'react';
import { BookOpen, UserCheck, ThumbsUp } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLanguage } from '../contexts/LanguageContext';

const BookingProcess = () => {
  const { trackEvent } = useAnalytics();
  const { t } = useLanguage();
  
  const steps = [
    {
      icon: BookOpen,
      title: t('booking.book.head'),
      description: t('booking.book.sub')
    },
    {
      icon: UserCheck,
      title: t('booking.driver.head'),
      description: t('booking.driver.sub')
    },
    {
      icon: ThumbsUp,
      title: t('booking.comfort.head'),
      description: t('booking.comfort.sub')
    }
  ];

  const handleStepClick = (stepTitle: string) => {
    trackEvent('Engagement', 'Clicked Booking Process Step', stepTitle);
  };

  return (
    <section className="py-16 bg-bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl text-center mb-12">{t('booking.head')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative cursor-pointer"
              onClick={() => handleStepClick(step.title)}
            >
              <div className="text-center">
                <step.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-xl mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BookingProcess;