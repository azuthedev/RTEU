import Stripe from "npm:stripe@13.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.41.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the Stripe secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key is missing from environment variables.");
    }

    console.log("Initializing Stripe with latest API version");

    // Initialize Stripe without specifying API version to use the latest
    const stripe = new Stripe(stripeSecretKey);

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Make sure we have the service role key to bypass RLS
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const { booking_reference, trip, vehicle, customer, extras, amount, discountCode, payment_method } = await req.json();

    console.log("Request data received:", { 
      booking_reference, 
      trip: { 
        from: trip?.from, 
        to: trip?.to, 
        type: trip?.type, 
        date: trip?.date,
        passengers: trip?.passengers 
      }, 
      vehicle: { 
        id: vehicle?.id, 
        name: vehicle?.name 
      }, 
      customer: { 
        email: customer?.email 
      }, 
      amount, 
      payment_method 
    });

    // Validate required fields
    if (!trip || !vehicle || !customer || !customer.email || !booking_reference) {
      throw new Error("Missing required booking information");
    }

    // Validate email format - this is critical for Stripe
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      throw new Error("Invalid email address format");
    }

    console.log("Creating booking with data:", { 
      booking_reference,
      trip, 
      vehicle: vehicle.name, 
      customerEmail: customer.email,
      amount,
      is_round_trip: trip.type === 'round-trip',
      payment_method: payment_method || 'card'
    });

    // First, create/update the trip record in the database
    const tripData = {
      user_id: customer.user_id || null,
      booking_reference: booking_reference,
      pickup_address: trip.from,
      dropoff_address: trip.to,
      estimated_distance_km: 0, // Will be calculated by admin
      estimated_duration_min: 0, // Will be calculated by admin
      estimated_price: amount,
      datetime: trip.date || new Date().toISOString(),
      is_scheduled: true,
      status: 'pending', // Initially pending until assigned
      vehicle_type: vehicle.name || '',
      passengers: trip.passengers || 1,
      customer_name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customer_email: customer.email,
      customer_phone: customer.phone || '',
      is_return: trip.type === 'round-trip',
      return_datetime: trip.returnDate || null,
      extra_items: extras ? extras.join(',') : '',
      payment_method: payment_method || 'card',
      notes: '',
      customer_title: customer.title || null
    };

    // If there's no user_id provided but we have an email, try to find a matching user
    if (!tripData.user_id && tripData.customer_email) {
      try {
        const { data: existingUsers, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', tripData.customer_email)
          .limit(1);
        
        if (userError) {
          console.error('Error finding user by email:', userError);
        } else if (existingUsers && existingUsers.length > 0) {
          console.log('Found existing user with matching email:', existingUsers[0].id);
          tripData.user_id = existingUsers[0].id;
        }
      } catch (error) {
        console.error('Error when querying users:', error);
        // Continue without user_id, not critical
      }
    }

    // Check if this booking reference already exists in the database
    let existingBooking;
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id')
        .eq('booking_reference', booking_reference)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking for existing booking:', error);
      } else {
        existingBooking = data;
      }
    } catch (error) {
      console.error('Error when checking for existing booking:', error);
    }

    // Only create a new record if it doesn't already exist
    if (!existingBooking) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .insert([tripData])
          .select();

        if (error) {
          console.error('Error creating trip record:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Trip record created successfully');
      } catch (error) {
        console.error('Failed to create trip record:', error);
        throw new Error(`Failed to create booking: ${error.message}`);
      }
    } else {
      console.log('Booking already exists with reference:', booking_reference);
    }

    // For cash payments, we just return success
    if (payment_method === 'cash') {
      return new Response(
        JSON.stringify({ success: true, bookingReference: booking_reference }), 
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // For card payments, create a Stripe checkout session
    // Prepare trip description
    let tripDescription = `${trip.from} to ${trip.to}`;
    let tripTypeDesc = trip.type === "round-trip" ? "Round trip" : "One way";
    
    if (trip.type === "round-trip" && trip.returnDate) {
      const departDate = new Date(trip.date).toLocaleDateString();
      const returnDate = new Date(trip.returnDate).toLocaleDateString();
      tripDescription += ` (${departDate} → ${returnDate})`;
    } else {
      tripDescription += ` (${new Date(trip.date).toLocaleDateString()})`;
    }

    // Ensure amount is a valid number and convert to cents for Stripe
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      throw new Error(`Invalid amount: ${amount}. Amount must be a positive number.`);
    }

    console.log(`Creating Stripe checkout session for amount: ${amount} EUR (${amountInCents} cents)`);

    // Prepare metadata
    const metadata = {
      booking_reference: booking_reference,
      trip_from: trip.from,
      trip_to: trip.to,
      trip_type: trip.type,
      trip_date: new Date(trip.date).toISOString(),
      vehicle_name: vehicle.name,
      customer_email: customer.email,
    };

    // Add optional metadata if available
    if (trip.returnDate) metadata.trip_return_date = new Date(trip.returnDate).toISOString();
    if (trip.passengers) metadata.trip_passengers = String(trip.passengers);
    if (vehicle.id) metadata.vehicle_id = vehicle.id;
    if (customer.firstName || customer.lastName) 
      metadata.customer_name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    if (customer.phone) metadata.customer_phone = customer.phone;
    if (extras && extras.length) metadata.extras = extras.join(",");
    if (discountCode) metadata.discount_code = discountCode;

    // Create a Stripe checkout session with better error handling
    try {
      console.log("Calling stripe.checkout.sessions.create...");
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `${vehicle.name} - ${tripTypeDesc}`,
                description: tripDescription,
                images: vehicle.image ? [vehicle.image] : undefined
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.headers.get("origin")}/booking-success?reference=${booking_reference}`,
        cancel_url: `${req.headers.get("origin")}/booking-cancelled`,
        customer_email: customer.email,
        metadata: metadata,
      });

      console.log("Stripe checkout session created successfully", { sessionId: session.id });

      // Return the session URL
      return new Response(
        JSON.stringify({ sessionUrl: session.url }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (stripeError: any) {
      console.error("Stripe API error:", {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        param: stripeError.param,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId
      });
      
      let errorMessage = "An error occurred with our payment processor";
      
      // Provide more specific error messages for common Stripe errors
      if (stripeError.type === 'StripeAuthenticationError') {
        errorMessage = "Authentication with payment processor failed. Please contact support.";
      } else if (stripeError.type === 'StripeConnectionError') {
        errorMessage = "Connection to payment processor failed. Please try again later.";
      } else if (stripeError.type === 'StripeRateLimitError') {
        errorMessage = "Too many payment requests. Please try again in a few minutes.";
      } else if (stripeError.message) {
        errorMessage = stripeError.message;
      }
      
      throw new Error(`Stripe error: ${errorMessage}`);
    }
  } catch (error: any) {
    console.error("Error processing request:", error);
    
    // Provide a more detailed error message to help diagnose the issue
    let errorMessage = error.message;
    if (error.message && error.message.includes("Stripe")) {
      errorMessage = `Stripe API error: ${error.message}`;
    } else if (error.message && error.message.includes("Supabase")) {
      errorMessage = `Database error: ${error.message}`;
    } else if (error.message && error.message.includes("environment")) {
      errorMessage = `Configuration error: ${error.message}`;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
