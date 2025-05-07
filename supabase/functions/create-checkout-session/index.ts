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
    console.log("Starting checkout session creation process");
    
    // Get the Stripe secret key directly from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      throw new Error("Payment service configuration error: Missing API keys. Please contact support.");
    }

    console.log("Initializing Stripe with current API version");

    // Initialize Stripe with a current API version instead of a future date
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16', // Using a current API version that Stripe supports
      timeout: 30000, // Increase timeout to 30 seconds for slower connections
    });

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Database configuration error: Missing credentials. Please contact support.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    const requestData = await req.json();
    const { 
      booking_reference, 
      trip, 
      vehicle, 
      customer, 
      extras, 
      amount, 
      discountCode, 
      payment_method 
    } = requestData;

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

    console.log("Creating booking with reference:", booking_reference);

    // Create the trip record in the database
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
    let tripId = existingBooking?.id;
    
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
        
        console.log('Trip record created successfully with ID:', data[0]?.id);
        tripId = data[0]?.id;
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

    // Ensure amount is a valid number and convert to cents for Stripe
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInCents) || amountInCents <= 0) {
      throw new Error(`Invalid amount: ${amount}. Amount must be a positive number.`);
    }

    console.log(`Creating Stripe checkout session for amount: ${amount} EUR (${amountInCents} cents)`);

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

    // Prepare metadata
    const metadata = {
      booking_reference: booking_reference,
      trip_id: tripId || '',
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

    // Create a Stripe checkout session
    try {
      console.log("Creating Stripe checkout session...");
      
      // Test the Stripe connection with a simple API call first
      try {
        // Try a simple balance retrieval to test connectivity
        await stripe.balance.retrieve();
        console.log("Stripe connection test successful");
      } catch (connError) {
        console.error("Stripe connection test failed:", connError);
        throw new Error("Cannot connect to Stripe API. Please verify network and API key configuration.");
      }
      
      // Create checkout session - direct approach without balance check
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
        JSON.stringify({ 
          sessionUrl: session.url,
          sessionId: session.id,
          bookingReference: booking_reference 
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (stripeError) {
      console.error("Stripe API error:", {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        param: stripeError.param,
        statusCode: stripeError.statusCode,
        requestId: stripeError.requestId,
        raw: JSON.stringify(stripeError)
      });
      
      // Try to extract the most helpful error message
      let errorMessage = "An unexpected error occurred with our payment processor";
      
      // Format error based on type
      if (stripeError.type) {
        switch(stripeError.type) {
          case 'StripeAuthenticationError':
            errorMessage = "Authentication with payment service failed. Please contact support with error code: AUTH_ERR";
            break;
          case 'StripeAPIError':
            errorMessage = "The payment service encountered an error. Please try again later.";
            break;
          case 'StripeConnectionError':
            errorMessage = "Cannot connect to payment service. Please check your internet connection and try again.";
            break;
          case 'StripeRateLimitError':
            errorMessage = "Too many payment attempts. Please try again in a few minutes.";
            break;
          case 'StripeInvalidRequestError':
            errorMessage = `Invalid payment request: ${stripeError.message}`;
            break;
          case 'StripeCardError':
            errorMessage = `Card error: ${stripeError.message}`;
            break;
          default:
            errorMessage = stripeError.message || "Payment processing error. Please try again.";
        }
      } else if (stripeError.message) {
        errorMessage = stripeError.message;
      }
      
      throw new Error(`Payment service error: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error processing request:", error);
    
    // Construct a detailed error response
    const errorResponse = {
      error: error.message || "An unexpected error occurred",
      details: {
        timestamp: new Date().toISOString(),
        errorType: error.type || "Unknown",
        errorCode: error.code || "N/A",
        requestId: error.requestId || "N/A"
      }
    };
    
    return new Response(
      JSON.stringify(errorResponse),
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