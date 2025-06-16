import Stripe from "npm:stripe@13.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to retry database operations
const retryDatabaseOperation = async (operation, maxRetries = 5) => {
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

// Helper function to format dates for emails
const formatDateForEmail = (dateStr: string | null | undefined): { date: string, time: string } => {
  if (!dateStr) return { date: 'Not specified', time: 'Not specified' };
  
  try {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  } catch (e) {
    console.error('Error formatting date:', e);
    return { date: 'Invalid date', time: 'Invalid time' };
  }
};

Deno.serve(async (req) => {
  // Get the client's origin
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
      status: 200,
      headers: headersWithOrigin,
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
      extraStops,
      childSeats,
      luggageCount,
      amount, 
      discountCode, 
      payment_method,
      flight_number
    } = requestData;

    console.log("Request data received:", { 
      booking_reference, 
      trip: { 
        from: trip?.from, 
        to: trip?.to, 
        type: trip?.type, 
        date: trip?.date,
        pickup_date: trip?.pickup_date,
        pickup_time: trip?.pickup_time,
        dropoff_date: trip?.dropoff_date,
        dropoff_time: trip?.dropoff_time,
        passengers: trip?.passengers 
      }, 
      vehicle: { 
        id: vehicle?.id, 
        name: vehicle?.name 
      }, 
      customer: { 
        email: customer?.email 
      },
      extras: extras?.length,
      extraStops: extraStops?.length,
      childSeats: childSeats ? 'Present' : 'None',
      luggageCount,
      amount, 
      payment_method,
      flight_number
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

    // Format date components for the database
    // Use client-provided ISO date strings directly if available
    const pickupDate = trip.date;
    const returnDate = trip.returnDate || null;
    
    // Format dates for email if not provided by the client
    let pickupDateFormatted = trip.pickup_date;
    let pickupTimeFormatted = trip.pickup_time;
    let dropoffDateFormatted = trip.dropoff_date;
    let dropoffTimeFormatted = trip.dropoff_time;
    
    // If date components aren't provided, format them from ISO strings
    if (!pickupDateFormatted || !pickupTimeFormatted) {
      const formattedPickup = formatDateForEmail(pickupDate);
      pickupDateFormatted = formattedPickup.date;
      pickupTimeFormatted = formattedPickup.time;
    }
    
    if ((!dropoffDateFormatted || !dropoffTimeFormatted) && returnDate) {
      const formattedDropoff = formatDateForEmail(returnDate);
      dropoffDateFormatted = formattedDropoff.date;
      dropoffTimeFormatted = formattedDropoff.time;
    }

    // Create the trip record in the database
    const tripData = {
      user_id: customer.user_id || null,
      booking_reference: booking_reference,
      pickup_address: trip.from,
      dropoff_address: trip.to,
      estimated_distance_km: 0, // Will be calculated by admin
      estimated_duration_min: 0, // Will be calculated by admin
      estimated_price: amount,
      datetime: pickupDate,
      is_scheduled: true,
      status: 'pending', // Initially pending until assigned
      vehicle_type: vehicle.name || '',
      passengers: trip.passengers || 1,
      customer_name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      customer_email: customer.email,
      customer_phone: customer.phone || '',
      is_return: trip.type === 'round-trip',
      return_datetime: returnDate,
      extra_items: extras ? extras.join(',') : '',
      payment_method: payment_method || 'card',
      notes: '',
      customer_title: customer.title || null,
      flight_number: flight_number || null, // Store flight number
      extra_stops: extraStops && extraStops.length > 0 ? JSON.stringify(extraStops) : null,
      child_seats: childSeats && Object.keys(childSeats).length > 0 ? JSON.stringify(childSeats) : null,
      luggage_count: luggageCount || 0
    };

    // If there's no user_id provided but we have an email, try to find a matching user
    if (!tripData.user_id && tripData.customer_email) {
      try {
        const { data: existingUsers, error: userError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('users')
            .select('id')
            .eq('email', tripData.customer_email)
            .limit(1);
        });
        
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
      const { data, error } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('trips')
          .select('id')
          .eq('booking_reference', booking_reference)
          .maybeSingle();
      });
      
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
        const { data, error } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('trips')
            .insert([tripData])
            .select();
        });

        if (error) {
          console.error('Error creating trip record:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Trip record created successfully with ID:', data[0]?.id);
        tripId = data[0]?.id;
        
        // Send a booking confirmation email for cash payments
        if (payment_method === 'cash') {
          try {
            console.log("Sending booking confirmation email for cash payment");
            
            // Format price for email
            const formatPrice = (price: number) => {
              return new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'EUR',
              }).format(price);
            };

            // Get webhook secret
            const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
            
            if (webhookSecret) {
              // Send booking confirmation email with formatted date components
              await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Auth': webhookSecret
                },
                body: JSON.stringify({
                  name: tripData.customer_name || 'Valued Customer',
                  email: tripData.customer_email,
                  booking_id: booking_reference,
                  email_type: "BookingReference",
                  pickup_location: tripData.pickup_address,
                  dropoff_location: tripData.dropoff_address,
                  // Use formatted date and time components for improved email display
                  pickup_date: pickupDateFormatted,
                  pickup_time: pickupTimeFormatted,
                  dropoff_date: dropoffDateFormatted || 'N/A',
                  dropoff_time: dropoffTimeFormatted || 'N/A',
                  vehicle_type: tripData.vehicle_type,
                  passengers: tripData.passengers,
                  total_price: formatPrice(tripData.estimated_price),
                  // Include additional metadata that may be useful for the email
                  flight_number: flight_number || 'Not provided',
                  extra_stops: extraStops ? extraStops.length.toString() : '0',
                  luggage_count: luggageCount || '0'
                })
              });
              
              console.log("Booking confirmation email sent successfully");
            }
          } catch (emailError) {
            console.error('Error sending booking confirmation email:', emailError);
            // Continue even if email sending fails - it's not critical for booking creation
          }
        }
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
            ...headersWithOrigin,
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
    
    // Format date components for display
    if (trip.type === "round-trip" && returnDate) {
      tripDescription += ` (${pickupDateFormatted} ${pickupTimeFormatted} → ${dropoffDateFormatted} ${dropoffTimeFormatted})`;
    } else {
      tripDescription += ` (${pickupDateFormatted} ${pickupTimeFormatted})`;
    }
    
    // Add flight number to description if available
    if (flight_number) {
      tripDescription += ` | Flight: ${flight_number}`;
    }
    
    // Add extra stops info if present
    if (extraStops && extraStops.length > 0) {
      tripDescription += ` | ${extraStops.length} extra stop${extraStops.length > 1 ? 's' : ''}`;
    }

    // Prepare metadata
    const metadata = {
      booking_reference: booking_reference,
      trip_id: tripId || '',
      trip_from: trip.from,
      trip_to: trip.to,
      trip_type: trip.type,
      trip_date: pickupDate,
      trip_pickup_date: pickupDateFormatted,
      trip_pickup_time: pickupTimeFormatted,
      vehicle_name: vehicle.name,
      customer_email: customer.email,
      flight_number: flight_number || '',
      extra_stops: extraStops ? extraStops.length.toString() : '0',
      luggage_count: luggageCount?.toString() || '0'
    };

    // Add optional metadata if available
    if (returnDate) {
      metadata.trip_return_date = returnDate;
      metadata.trip_dropoff_date = dropoffDateFormatted;
      metadata.trip_dropoff_time = dropoffTimeFormatted;
    }
    if (trip.passengers) metadata.trip_passengers = String(trip.passengers);
    if (vehicle.id) metadata.vehicle_id = vehicle.id;
    if (customer.firstName || customer.lastName) 
      metadata.customer_name = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    if (customer.phone) metadata.customer_phone = customer.phone;
    if (extras && extras.length) metadata.extras = extras.join(",");
    if (discountCode) metadata.discount_code = discountCode;
    
    // Add child seats info if present
    if (childSeats && Object.keys(childSeats).length > 0) {
      metadata.child_seats = JSON.stringify(childSeats);
    }

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
      
      // Create checkout session
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
        success_url: `${origin}/booking-success?reference=${booking_reference}`,
        cancel_url: `${origin}/booking-cancelled`,
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
            ...headersWithOrigin,
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
          "Access-Control-Allow-Origin": origin
        },
      }
    );
  }
});