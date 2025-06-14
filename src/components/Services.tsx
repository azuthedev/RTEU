import React from 'react';
import { Plane, Car, Bus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Services = () => {
  const { t } = useLanguage();
  
  const services = [
    {
      icon: Plane,
      title: t('services.airport.head'),
      description: t('services.airport.sub')
    },
    {
      icon: Car,
      title: t('services.private.head'),
      description: t('services.private.sub')
    },
    {
      icon: Bus,
      title: t('services.minivan.head'),
      description: t('services.minivan.sub')
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl text-center mb-12">{t('services.head')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="text-center p-6 rounded-lg shadow-lg bg-white">
              <service.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl mb-2">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;