import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { motion } from 'framer-motion';

const BookingConfirmation = () => {
  const navigate = useNavigate();
  
  // Confetti effect
  useEffect(() => {
    const startConfetti = () => {
      const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5'];
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '100';
      document.body.appendChild(canvas);
      
      const context = canvas.getContext('2d');
      const particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
        size: number;
        alpha: number;
      }> = [];
      
      // Create particles
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          vx: (Math.random() - 0.5) * 10,
          vy: Math.random() * 3 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 5,
          alpha: 1
        });
      }
      
      const animate = () => {
        if (!context) return;
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((particle, i) => {
          particle.y += particle.vy;
          particle.x += particle.vx;
          particle.alpha -= 0.005;
          
          if (particle.y > canvas.height || particle.alpha <= 0) {
            particles.splice(i, 1);
          } else {
            context.globalAlpha = particle.alpha;
            context.fillStyle = particle.color;
            context.fillRect(particle.x, particle.y, particle.size, particle.size);
          }
        });
        
        if (particles.length > 0) {
          requestAnimationFrame(animate);
        } else {
          document.body.removeChild(canvas);
        }
      };
      
      animate();
    };
    
    startConfetti();
    
    // Clean up
    return () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        document.body.removeChild(canvas);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
              <p className="text-lg text-gray-600 mb-8">
                Thank you for booking with Royal Transfer EU. Your transfer has been successfully confirmed.
              </p>
              
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                <h2 className="text-lg font-semibold mb-3">Booking Details</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking Reference:</span>
                    <span className="font-medium">RT-123456</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transfer Date:</span>
                    <span className="font-medium">April 28, 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium">Economy Sedan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Confirmed</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <p className="text-gray-700">
                  A confirmation email has been sent to your email address with all the details of your booking.
                </p>
                <p className="text-gray-700">
                  If you have any questions or need to modify your booking, please contact our customer support team.
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button 
                  onClick={() => navigate('/bookings')}
                  className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-all duration-300"
                >
                  View My Bookings
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="border border-gray-300 px-6 py-3 rounded-md hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          </div>

          <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-center mb-6">What's Next?</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Confirmation Email</h3>
                  <p className="text-sm text-gray-600">
                    Check your inbox for detailed booking information
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Driver Assignment</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive driver details 24 hours before pickup
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Ready to Go</h3>
                  <p className="text-sm text-gray-600">
                    Your driver will meet you at the specified location
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <a 
                href="/contact" 
                className="inline-flex items-center text-black hover:text-gray-700"
              >
                Need help? Contact support
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default BookingConfirmation;