import { createClient } from 'npm:@supabase/supabase-js@2.41.0';
import Stripe from 'npm:stripe@latest';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface BookingData {
  amount: number;
  currency: string;
  email: string;
  metadata: {
    userId: string;
    tripId?: string;
    vehicleId: string;
    pickupLocation: string;
    dropoffLocation: string;
    date: string;
    returnDate?: string;
    passengers: number;
    extras?: string[];
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  try {
    // Get environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is missing from environment variables");
    }
    
    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31',
    });

    // Parse request body
    const { amount, currency, email, metadata } = await req.json() as BookingData;
    
    if (!amount || !email || !metadata) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: email,
      metadata: {
        userId: metadata.userId,
        tripId: metadata.tripId || '',
        vehicleId: metadata.vehicleId,
        pickupLocation: metadata.pickupLocation,
        dropoffLocation: metadata.dropoffLocation,
        date: metadata.date,
        returnDate: metadata.returnDate || '',
        passengers: metadata.passengers.toString(),
        extras: JSON.stringify(metadata.extras || []),
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment intent' }), 
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});