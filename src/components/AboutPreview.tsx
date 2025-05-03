import React from 'react';

const AboutPreview = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Your journey, redefined.</h2>
          <p className="text-gray-600 mb-6">
            For over 15 years, Royal Transfer EU has provided safe, punctual, and comfortable airport transfers 
            and taxi services throughout Italy. Leveraging years of experience and dedication, we're the 
            preferred travel partner for thousands worldwide.
          </p>
          <a 
            href="/about" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            Read More →
          </a>
        </div>
      </div>
    </section>
  );
};

export default AboutPreview;