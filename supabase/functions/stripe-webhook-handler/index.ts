import Stripe from "npm:stripe@12.0.0";
import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req: Request) => {
  // Get the client's origin - even though webhooks don't typically need CORS,
  // we'll handle it properly for consistency and potential browser testing
  const origin = req.headers.get('Origin') || 'https://royaltransfereu.com';
  
  // Check if the origin is allowed
  const allowedOrigins = [
    'https://royaltransfereu.com',
    'https://www.royaltransfereu.com', 
    'http://localhost:3000', 
    'http://localhost:5173'
  ];
  
  // Set the correct CORS origin header based on the request's origin
  const headersWithOrigin = {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: headersWithOrigin,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: headersWithOrigin,
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
    
    // Get webhook secret for email sending
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Missing WEBHOOK_SECRET environment variable");
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
          headers: headersWithOrigin
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
          headers: headersWithOrigin
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
        console.log(`Payment for booking ${bookingReference} was successful`);
        
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
        
        // First get the trip ID and details using the booking reference
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('booking_reference', bookingReference)
          .single();
        
        if (tripError) {
          console.error('Error fetching trip details:', tripError);
        } else if (tripData) {
          console.log('Trip data found:', tripData);
          
          // Now create the payment record with the trip ID
          paymentData.trip_id = tripData.id;
          
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([paymentData]);
          
          if (paymentError) {
            console.error('Error creating payment record:', paymentError);
          }
          
          // Send booking confirmation email
          if (webhookSecret && tripData) {
            try {
              // Format datetime for email
              const formatDate = (dateStr: string) => {
                try {
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                } catch (e) {
                  return dateStr || 'Not specified';
                }
              };
              
              // Format price for email
              const formatPrice = (price: number) => {
                return new Intl.NumberFormat('en-US', { 
                  style: 'currency', 
                  currency: 'EUR',
                }).format(price);
              };
              
              console.log('Sending booking confirmation email for Stripe payment');
              
              // Send booking confirmation email with flat structure
              await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Auth': webhookSecret
                },
                body: JSON.stringify({
                  name: tripData.customer_name || 'Valued Customer',
                  email: tripData.customer_email,
                  booking_id: bookingReference,
                  email_type: "BookingReference",
                  pickup_location: tripData.pickup_address,
                  dropoff_location: tripData.dropoff_address,
                  pickup_datetime: formatDate(tripData.datetime),
                  vehicle_type: tripData.vehicle_type,
                  passengers: tripData.passengers,
                  total_price: formatPrice(tripData.estimated_price)
                })
              });
              
              console.log('Booking confirmation email sent successfully for Stripe payment');
            } catch (emailError) {
              console.error('Error sending booking confirmation email:', emailError);
              // Continue even if email sending fails - it's not critical for webhook processing
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        ...headersWithOrigin,
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
          "Access-Control-Allow-Origin": origin
        },
      }
    );
  }
});