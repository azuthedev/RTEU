import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  
  // Set CORS headers
  const headersWithOrigin = {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: headersWithOrigin
    });
  }

  try {
    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { booking_reference } = await req.json();
    
    if (!booking_reference) {
      return new Response(
        JSON.stringify({ error: 'Booking reference is required' }),
        {
          status: 400,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch booking details
    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('trips')
        .select('*')
        .eq('booking_reference', booking_reference)
        .single();
    });

    if (error) {
      // Try a more permissive query as fallback
      try {
        const { data: fallbackData, error: fallbackError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('trips')
            .select('*')
            .ilike('booking_reference', `%${booking_reference}%`)
            .limit(1);
        });
        
        if (fallbackError || !fallbackData || fallbackData.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Booking not found' }),
            {
              status: 404,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        return new Response(
          JSON.stringify(fallbackData[0]),
          {
            status: 200,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      } catch (fallbackSearchError) {
        return new Response(
          JSON.stringify({ error: 'Booking not found' }),
          {
            status: 404,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
      }
    );
  }
});