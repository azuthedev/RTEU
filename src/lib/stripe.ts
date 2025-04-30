import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    // Get publishable key from environment variables
    const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    // Validate publishable key exists
    if (!STRIPE_PUBLISHABLE_KEY) {
      throw new Error('Stripe publishable key is missing from environment variables.');
    }
    
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  
  return stripePromise;
};