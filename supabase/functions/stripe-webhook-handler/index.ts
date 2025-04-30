import Stripe from "npm:stripe@12.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.41.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Get the Stripe webhook secret from environment variables
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // Get the Stripe secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is missing from environment variables");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body as text
    const payload = await req.text();
    
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature") || "";

    // Verify the webhook signature if webhook secret is available
    let event;
    if (stripeWebhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { 
          status: 400,
          headers: corsHeaders
        });
      }
    } else {
      // If webhook secret is not available, parse the payload directly
      // Note: This is less secure and should only be used for development
      try {
        event = JSON.parse(payload);
      } catch (err) {
        console.error(`Failed to parse webhook payload: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { 
          status: 400,
          headers: corsHeaders
        });
      }
      console.warn('Webhook signature verification skipped: No webhook secret available');
    }

    // Handle the event based on its type
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Get booking reference from metadata
      const bookingReference = session.metadata?.booking_reference;
      
      if (!bookingReference) {
        throw new Error("No booking reference found in session metadata");
      }
      
      // Check if the payment was successful
      if (session.payment_status === 'paid') {
        // Update the trip record to show payment is completed
        const { error } = await supabase
          .from('trips')
          .update({ 
            status: 'accepted', // Mark as accepted since payment is confirmed
            // Add any other fields that need to be updated
          })
          .eq('booking_reference', bookingReference);
        
        if (error) {
          console.error('Error updating trip record:', error);
          throw new Error(`Failed to update trip: ${error.message}`);
        }
        
        // Create a payment record
        const paymentData = {
          trip_id: null, // Will be updated with real ID once fetched
          user_id: session.metadata?.customer_user_id || null,
          amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
          payment_method: 'credit_card',
          status: 'completed',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        // First get the trip ID using the booking reference
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('id')
          .eq('booking_reference', bookingReference)
          .single();
        
        if (tripError) {
          console.error('Error fetching trip ID:', tripError);
        } else if (tripData) {
          // Now create the payment record with the trip ID
          paymentData.trip_id = tripData.id;
          
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([paymentData]);
          
          if (paymentError) {
            console.error('Error creating payment record:', paymentError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error handling webhook:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});