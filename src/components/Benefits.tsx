import React from 'react';
import { Shield, Clock, Award, HeadphonesIcon } from 'lucide-react';

const Benefits = () => {
  const benefits = [
    {
      icon: Award,
      title: 'Trusted by Thousands',
      description: 'Happy customers worldwide.'
    },
    {
      icon: Clock,
      title: '15+ Years Experience',
      description: 'Industry veterans.'
    },
    {
      icon: Shield,
      title: 'Safety & Reliability',
      description: 'Your security is our priority.'
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 Support',
      description: 'Always here to help.'
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Royal Transfer EU?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <benefit.icon className="w-10 h-10 md:w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg md:text-base font-semibold mb-2">{benefit.title}</h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;