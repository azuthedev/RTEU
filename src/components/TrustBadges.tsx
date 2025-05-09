import React from 'react';
import { Shield, CreditCard, Star, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';
import OptimizedImage from './OptimizedImage';

const TrustBadges = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl mb-8 text-center">
            Trusted by Travelers Worldwide
          </h2>
          <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
            <motion.div
              className="flex flex-col items-center text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <CreditCard
                className="w-8 h-8 md:w-12 md:h-12 text-blue-600 mb-2"
                aria-hidden="true"
              />
              <p className="text-sm md:text-base text-gray-600">
                Secure Payments
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                All major cards accepted
              </p>
            </motion.div>

            <motion.div
              className="flex flex-col items-center text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-12 md:h-16 mb-2 relative">
                <OptimizedImage
                  src="https://files.royaltransfereu.com/assets/tripadvisor-logo.png"
                  alt="Tripadvisor Rating and Reviews Logo - Royal Transfer EU is highly rated on Tripadvisor"
                  className="h-full w-auto object-contain"
                  width={115}
                  height={65}
                />
              </div>
              <div className="flex items-center mb-2">
                <Star
                  className="w-4 h-4 md:w-6 md:h-6 text-yellow-400 fill-current"
                  aria-hidden="true"
                />
                <span className="text-xl md:text-2xl font-bold ml-2">4.9</span>
              </div>
              <p className="text-sm md:text-base text-gray-600">
                Tripadvisor Rating
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                Based on 1000+ reviews
              </p>
            </motion.div>

            <motion.div
              className="flex flex-col items-center text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Shield
                className="w-8 h-8 md:w-12 md:h-12 text-blue-600 mb-2"
                aria-hidden="true"
              />
              <p className="text-sm md:text-base text-gray-600">
                SSL Encrypted
              </p>
              <p className="text-xs md:text-sm text-gray-500">
                Your data is protected
              </p>
            </motion.div>
          </div>

          <div className="border-t pt-8">
            <p className="text-center text-gray-600 mb-6">
              Accepted Payment Methods
            </p>
            <div className="flex flex-col space-y-6">
              <div className="grid grid-cols-3 md:flex md:justify-center items-center gap-4 md:space-x-6">
                <div className="flex justify-center">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/visa.png"
                    alt="Visa payment logo - Royal Transfer EU accepts Visa cards"
                    className="h-6 md:h-8 w-auto"
                    width={100}
                    height={30}
                  />
                </div>
                <div className="flex justify-center">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/mastercard-logo.svg"
                    alt="MasterCard payment logo - Royal Transfer EU accepts MasterCard"
                    className="h-6 md:h-8 w-auto"
                    width={70}
                    height={67}
                  />
                </div>
                <div className="flex justify-center">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/google_pay_logo.png"
                    alt="Google Pay logo - Royal Transfer EU accepts Google Pay"
                    className="h-6 md:h-8 w-auto"
                    width={100}
                    height={46}
                  />
                </div>
                <div className="flex justify-center">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/applepay.png"
                    alt="Apple Pay logo - Royal Transfer EU accepts Apple Pay"
                    className="h-6 md:h-8 w-auto"
                    width={80}
                    height={78}
                  />
                </div>
                <div className="flex justify-center">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/american_express_logo.png"
                    alt="American Express payment logo - Royal Transfer EU accepts American Express cards"
                    className="h-12 md:h-12 w-auto md:w-12"
                    width={100}
                    height={100}
                    loading="lazy"
                  />
                </div>
                <div className="flex justify-center">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/stripe_logo.png"
                    alt="Stripe secure payment processing logo - Royal Transfer EU uses Stripe for secure payments"
                    className="h-6 md:h-10 w-auto"
                    width={100}
                    height={40}
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="flex justify-center items-center space-x-2">
                <Banknote
                  className="w-6 h-6 text-green-600"
                  aria-hidden="true"
                />
                <span className="text-gray-600">Cash payment available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;