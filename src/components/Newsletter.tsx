import React, { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface NewsletterProps {
  webhookUrl: string;
  darkMode?: boolean;
  className?: string;
}

const Newsletter = forwardRef<HTMLDivElement, NewsletterProps>(({ webhookUrl, darkMode = false, className = '' }, ref) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error('Subscription failed');

      setStatus('success');
      setMessage('Thank you for subscribing!');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div ref={ref} className={`${className}`}>
      <div className={`${darkMode ? 'bg-transparent' : 'bg-white'} ${darkMode ? '' : 'p-6 rounded-lg shadow-md'}`}>
        {!darkMode && (
          <h3 className="text-xl text-center mb-2">
            Subscribe to our Newsletter
          </h3>
        )}
        
        {/* Show promotional text on light backgrounds (not footer) */}
        {!darkMode && (
          <p className="text-[12px] text-gray-600 text-center mb-4">
            Get Latest Travel Ideas and Deals in Your Mailbox
          </p>
        )}
        
        {/* Show promotional text ONLY on mobile when in dark mode (footer) */}
        {darkMode && (
          <p className="md:hidden text-[14px] text-gray-300 text-center mb-2">
            Get Latest Travel Ideas and Deals in Your Mailbox
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Email Address"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-black"
              required
            />

            <motion.button
              type="submit"
              className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-4 rounded-md transition-colors`}
              whileTap={{ scale: 0.95 }}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </motion.button>
          </div>

          {message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center ${
                status === 'success' 
                  ? darkMode ? 'text-green-400' : 'text-green-600' 
                  : darkMode ? 'text-red-400' : 'text-red-600'
              }`}
            >
              {message}
            </motion.p>
          )}
        </form>
      </div>
    </div>
  );
});

Newsletter.displayName = 'Newsletter';

export default Newsletter;
