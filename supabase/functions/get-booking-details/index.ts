import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
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
    // Handle POST request to fetch booking details
    if (req.method === 'POST') {
      // Parse request body
      const { booking_reference } = await req.json();
      
      // Validate required parameters
      if (!booking_reference) {
        return new Response(
          JSON.stringify({ error: 'Booking reference is required' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }

      // Initialize Supabase client with service role key to bypass RLS
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch booking details
      console.log(`Fetching booking details for reference: ${booking_reference}`);
      
      // First try an exact match
      const { data, error } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('trips')
          .select('*')
          .eq('booking_reference', booking_reference)
          .single();
      });
      
      if (error || !data) {
        console.log(`No exact match found for ${booking_reference}, trying fuzzy search`);
        
        // Try a case-insensitive search
        const { data: fuzzyData, error: fuzzyError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('trips')
            .select('*')
            .ilike('booking_reference', `%${booking_reference}%`)
            .limit(1);
        });
        
        if (fuzzyError || !fuzzyData || fuzzyData.length === 0) {
          console.error('No booking found after fuzzy search:', fuzzyError);
          return new Response(
            JSON.stringify({ error: 'Booking not found' }),
            {
              status: 404,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Found a booking with fuzzy search
        console.log('Found booking with fuzzy search:', fuzzyData[0].booking_reference);
        return new Response(
          JSON.stringify(fuzzyData[0]),
          {
            status: 200,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Found an exact match
      console.log('Found booking with exact match:', data.booking_reference);
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
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
      }
    );
    
  } catch (error) {
    console.error('Error in get-booking-details Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin }
      }
    );
  }
});