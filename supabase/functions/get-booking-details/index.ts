import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
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
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: headersWithOrigin
    });
  }

  try {
    // Initialize Supabase client with service role key (server-side only)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only allow POST requests
    if (req.method === 'POST') {
      const { booking_reference, customer_email } = await req.json();
      
      if (!booking_reference) {
        return new Response(
          JSON.stringify({ 
            error: 'Booking reference is required' 
          }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }

      // Fetch booking details
      console.log(`Fetching booking with reference: ${booking_reference}`);
      
      // Build the query based on inputs
      let query = supabase
        .from('trips')
        .select(`
          id,
          booking_reference,
          pickup_address,
          dropoff_address,
          estimated_distance_km,
          estimated_duration_min,
          estimated_price,
          status,
          datetime,
          vehicle_type,
          passengers,
          customer_name,
          customer_email,
          customer_phone,
          is_return,
          return_datetime,
          extra_items,
          payment_method,
          notes,
          customer_title,
          flight_number,
          extra_stops,
          child_seats,
          luggage_count,
          user_id
        `)
        .eq('booking_reference', booking_reference);
        
      // If customer email is provided, use it for additional verification
      if (customer_email) {
        query = query.eq('customer_email', customer_email);
      }

      const { data, error } = await retryDatabaseOperation(async () => {
        return await query.single();
      });

      if (error) {
        console.error('Error fetching booking:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Booking not found or access denied' 
          }),
          {
            status: 404,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }

      // Return sanitized booking data
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed' 
      }),
      {
        status: 405,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
      }
    );
  }
});