import Stripe from "npm:stripe@13.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper function to retry database operations
const retryDatabaseOperation = async (operation, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Database operation failed, retrying... (${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
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
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
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
    // Add detailed logging to diagnose webhook issues
    console.log("🔔 Webhook received at:", new Date().toISOString());
    console.log("🔑 Headers received:", Array.from(req.headers.entries())
      .filter(([key]) => !key.toLowerCase().includes('authorization'))
      .map(([key, value]) => `${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`)
    );
    
    // Get the Stripe webhook secret from environment variables
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    console.log("🔐 Webhook secret available:", !!stripeWebhookSecret);
    
    // Get the Stripe secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("🔑 API key available:", !!stripeSecretKey);
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is missing from environment variables");
    }

    // Initialize Stripe with the latest supported API version
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16", // Use a stable API version
      typescript: true,
    });
    console.log("⚙️ Stripe client initialized");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("⚙️ Supabase client initialized");
    
    // Get webhook secret for email sending
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.warn("⚠️ Missing WEBHOOK_SECRET environment variable");
    }

    // Get the request body as text for signature verification
    let payload;
    try {
      payload = await req.text();
      console.log("📦 Webhook payload size:", payload.length, "bytes");
    } catch (error) {
      console.error("❌ Failed to read request body:", error);
      return new Response("Error reading request body", { 
        status: 400,
        headers: headersWithOrigin
      });
    }
    
    // Get the signature from headers
    const signature = req.headers.get("stripe-signature");
    console.log("🔏 Signature received:", !!signature);

    // Verify the webhook signature if webhook secret is available
    let event;
    if (stripeWebhookSecret && signature) {
      try {
        // Use the async version of constructEvent
        event = await stripe.webhooks.constructEventAsync(payload, signature, stripeWebhookSecret);
        console.log("✅ Webhook signature verified successfully");
        console.log("📣 Event type:", event.type);
      } catch (err) {
        console.error("❌ Webhook signature verification failed:", err.message);
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
        console.warn("⚠️ Webhook signature verification skipped: No webhook secret or signature");
        console.log("📣 Event type:", event.type);
      } catch (err) {
        console.error("❌ Failed to parse webhook payload:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { 
          status: 400,
          headers: headersWithOrigin
        });
      }
    }

    // Handle the event based on its type
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log("💰 Checkout session completed:", session.id);
      
      // Get booking reference from metadata
      const bookingReference = session.metadata?.booking_reference;
      
      if (!bookingReference) {
        console.error("❌ No booking reference found in session metadata");
        throw new Error("No booking reference found in session metadata");
      }
      
      console.log(`📝 Processing payment for booking ${bookingReference}`);
      
      // Check if the payment was successful
      if (session.payment_status === 'paid') {
        console.log("✅ Payment status is 'paid'");
        
        // Find the trip record first
        console.log(`🔍 Looking up trip with booking reference: ${bookingReference}`);
        const { data: tripData, error: tripFindError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('trips')
            .select('id, estimated_price, customer_email, customer_name, pickup_address, dropoff_address, datetime, vehicle_type, passengers')
            .eq('booking_reference', bookingReference)
            .single();
        });
        
        if (tripFindError || !tripData) {
          console.error('❌ Error finding trip:', tripFindError);
          throw new Error(`Failed to find trip with booking reference ${bookingReference}`);
        }
        
        console.log(`✅ Found trip with ID: ${tripData.id}`);
        
        // Update the trip record to show payment is completed
        console.log(`📝 Updating trip status to 'accepted'`);
        const { error: updateError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('trips')
            .update({ 
              status: 'accepted', // Mark as accepted since payment is confirmed
            })
            .eq('id', tripData.id);
        });
        
        if (updateError) {
          console.error('❌ Error updating trip record:', updateError);
          throw new Error(`Failed to update trip: ${updateError.message}`);
        }
        
        console.log(`✅ Trip status updated successfully`);
        
        // Create a payment record
        console.log(`💵 Creating payment record`);
        const paymentData = {
          trip_id: tripData.id,
          user_id: session.metadata?.customer_user_id || null,
          amount: session.amount_total ? session.amount_total / 100 : tripData.estimated_price, // Convert from cents
          payment_method: 'credit_card',
          status: 'completed',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        const { error: paymentError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('payments')
            .insert([paymentData]);
        });
        
        if (paymentError) {
          console.error('❌ Error creating payment record:', paymentError);
          // Don't throw here - we can still proceed with the rest of the process
        } else {
          console.log(`✅ Payment record created successfully`);
        }
        
        // Send booking confirmation email
        if (webhookSecret && tripData) {
          try {
            console.log('📧 Sending booking confirmation email');
            
            // Get pickup and return date/time from metadata
            const pickupDate = session.metadata?.trip_pickup_date || 'Not specified';
            const pickupTime = session.metadata?.trip_pickup_time || 'Not specified';
            const dropoffDate = session.metadata?.trip_dropoff_date || 'N/A';
            const dropoffTime = session.metadata?.trip_dropoff_time || 'N/A';
            
            // Format price for email
            const formatPrice = (price: number) => {
              return new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'EUR',
              }).format(price);
            };
            
            // Send booking confirmation email with date/time components
            const emailResponse = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
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
                // Use formatted date components instead of a single datetime string
                pickup_date: pickupDate,
                pickup_time: pickupTime,
                dropoff_date: dropoffDate,
                dropoff_time: dropoffTime,
                vehicle_type: tripData.vehicle_type,
                passengers: tripData.passengers,
                total_price: formatPrice(tripData.estimated_price),
                // Include additional metadata that may be useful for the email
                flight_number: session.metadata?.flight_number || 'Not provided',
                extra_stops: session.metadata?.extra_stops || '0',
                luggage_count: session.metadata?.luggage_count || '0'
              })
            });
            
            if (!emailResponse.ok) {
              console.warn(`⚠️ Email webhook response: ${emailResponse.status} ${emailResponse.statusText}`);
              const responseText = await emailResponse.text();
              console.warn(`⚠️ Email webhook response body: ${responseText.substring(0, 200)}`);
            } else {
              console.log('✅ Booking confirmation email sent successfully');
            }
          } catch (emailError) {
            console.error('❌ Error sending booking confirmation email:', emailError);
            // Continue even if email sending fails - it's not critical for webhook processing
          }
        }
        
        console.log(`✅ Webhook processing complete for ${bookingReference}`);
      } else {
        console.warn(`⚠️ Payment status is not 'paid': ${session.payment_status}`);
      }
    } else {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always return a 200 response to acknowledge receipt of the event
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        ...headersWithOrigin,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("❌ Error handling webhook:", error);
    
    // Return a 200 response even on error to prevent Stripe from retrying
    // This prevents the webhook queue from filling up with failed attempts
    return new Response(
      JSON.stringify({ 
        received: true,
        error: error.message,
        processedAt: new Date().toISOString()
      }),
      {
        status: 200, // Important: Return 200 to acknowledge receipt
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin
        },
      }
    );
  }
});