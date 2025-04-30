import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    text: "Outstanding service, polite drivers, and perfect timing! Our transfers were smooth and stress-free. Highly recommend Royal Transfer!",
    author: "Sarah P.",
    location: "UK"
  },
  {
    text: "Excellent experience from start to finish. The driver was professional and the vehicle was immaculate. Will definitely use again!",
    author: "Marco R.",
    location: "Italy"
  },
  {
    text: "Reliable and punctual service. The booking process was simple and the driver was very helpful with our luggage.",
    author: "John D.",
    location: "USA"
  }
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

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
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Hear from our Happy Travelers</h2>
        <div className="relative max-w-3xl mx-auto px-8">
          <button 
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-lg text-gray-600 mb-6">"{testimonials[currentIndex].text}"</p>
            <p className="font-semibold">
              {testimonials[currentIndex].author}
              <span className="text-gray-500"> • {testimonials[currentIndex].location}</span>
            </p>
          </div>

          <button 
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;