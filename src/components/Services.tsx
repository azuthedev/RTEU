import React from 'react';
import { Plane, Car, Bus } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: Plane,
      title: 'Airport Transfers',
      description: 'Reliable, timely pick-ups and drop-offs at all major airports across Italy.'
    },
    {
      icon: Car,
      title: 'Taxi Services',
      description: 'Professional, courteous drivers ready when and where you need them.'
    },
    {
      icon: Bus,
      title: 'Minivan Rentals',
      description: 'Comfortable minivans for groups, family trips, or business needs.'
    }
  ];

  return (
    <section className="py-16 bg-bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="text-center p-6 rounded-lg shadow-lg bg-white">
              <service.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;