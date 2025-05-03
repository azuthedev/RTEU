import Stripe from "npm:stripe@12.0.0";
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

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

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
      extra_items: extras.join(','),
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

    // Create a Stripe checkout session
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
            unit_amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?reference=${booking_reference}`,
      cancel_url: `${req.headers.get("origin")}/booking-cancelled`,
      customer_email: customer.email,
      metadata: {
        booking_reference: booking_reference,
        trip_from: trip.from,
        trip_to: trip.to,
        trip_type: trip.type,
        trip_date: new Date(trip.date).toISOString(),
        trip_return_date: trip.returnDate ? new Date(trip.returnDate).toISOString() : "",
        trip_passengers: String(trip.passengers),
        vehicle_id: vehicle.id,
        vehicle_name: vehicle.name,
        customer_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        customer_phone: customer.phone || "",
        extras: extras.join(","),
        discount_code: discountCode || "",
      },
    });

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
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
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