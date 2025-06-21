import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useLanguage();

  const testimonials = [
    {
      text: t('testimonials.quote1'),
      author: t('testimonials.author1'),
      location: t('testimonials.location1')
    },
    {
      text: t('testimonials.quote2'),
      author: t('testimonials.author2'),
      location: t('testimonials.location2')
    },
    {
      text: t('testimonials.quote3'),
      author: t('testimonials.author3'),
      location: t('testimonials.location3')
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };

  return (
    <section className="py-16 bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl text-center text-white mb-12">{t('testimonials.title')}</h2>
        <div className="relative max-w-3xl mx-auto px-8">
          <button 
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 p-2 text-white hover:text-gray-400"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-lg text-white mb-6">"{testimonials[currentIndex].text}"</p>
            <p className="font-semibold text-white">
              {testimonials[currentIndex].author}
              <span className="text-white"> • {testimonials[currentIndex].location}</span>
            </p>
          </div>

          <button 
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-white hover:text-gray-400"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;