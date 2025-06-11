import React from 'react';
import { Shield, Clock, Award, HeadphonesIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Benefits = () => {
  const { t } = useLanguage();
  
  const benefits = [
    {
      icon: Award,
      title: t('benefits.trusted.head'),
      description: t('benefits.trusted.sub')
    },
    {
      icon: Clock,
      title: t('benefits.experience.head'),
      description: t('benefits.experience.sub')
    },
    {
      icon: Shield,
      title: t('benefits.safety.head'),
      description: t('benefits.safety.sub')
    },
    {
      icon: HeadphonesIcon,
      title: t('benefits.support.head'),
      description: t('benefits.support.sub')
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl text-center mb-12">{t('benefits.headline')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <benefit.icon className="w-10 h-10 md:w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-base mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;