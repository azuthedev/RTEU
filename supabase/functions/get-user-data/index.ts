import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// Helper function to classify error types
const classifyError = (error: any): { type: 'network' | 'auth' | 'permission' | 'server' | 'unknown', message: string } => {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  if (errorMessage.includes('infinite recursion') || errorMessage.includes('42P17')) {
    return { type: 'permission', message: 'Database configuration issue detected. Please contact support.' };
  }
  
  if (errorMessage.includes('Invalid session') || errorMessage.includes('401')) {
    return { type: 'auth', message: 'Authentication session expired or invalid.' };
  }
  
  if (errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
    return { type: 'permission', message: 'Access denied.' };
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return { type: 'server', message: 'Internal server error occurred.' };
  }
  
  return { type: 'unknown', message: errorMessage };
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
    console.log("Edge Function Called: get-user-data");
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        {
          status: 401,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize client with user's JWT to get their ID
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );
    
    // Get the user's session to extract their ID
    const { data: { session }, error: sessionError } = await userClient.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session validation failed:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        {
          status: 401,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    console.log(`Fetching data for user: ${userId} (${userEmail})`);
    
    // Parse request to determine what data to fetch
    const url = new URL(req.url);
    const dataType = url.searchParams.get('type') || 'profile';
    
    if (dataType === 'profile') {
      // Fetch user profile data using service role to bypass RLS
      const { data: userData, error: userError } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
      });
      
      if (userError) {
        const classifiedError = classifyError(userError);
        console.error('Error fetching user data:', userError);
        return new Response(
          JSON.stringify({ error: classifiedError.message }),
          {
            status: classifiedError.type === 'auth' ? 401 : 500,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ data: userData }),
        {
          status: 200,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    } 
    else if (dataType === 'bookings') {
      // Get filter parameters
      const filter = url.searchParams.get('filter') || 'upcoming';
      const now = new Date().toISOString();
      
      if (!userEmail) {
        return new Response(
          JSON.stringify({ error: 'User email not available' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Fetch user's bookings using service role to bypass RLS
      let query = supabase
        .from('trips')
        .select('*');
      
      // Apply filters
      if (filter === 'upcoming') {
        query = query.gte('datetime', now);
      } else if (filter === 'past') {
        query = query.lt('datetime', now);
      }
      
      // Get both user_id-linked AND email-matched bookings
      query = query.or(`user_id.eq.${userId},customer_email.eq.${userEmail}`);
      
      // Order by date
      query = query.order('datetime', { ascending: filter === 'upcoming' });
      
      const { data: bookings, error: bookingsError } = await retryDatabaseOperation(async () => {
        return await query;
      });
      
      if (bookingsError) {
        const classifiedError = classifyError(bookingsError);
        console.error('Error fetching bookings:', bookingsError);
        return new Response(
          JSON.stringify({ error: classifiedError.message }),
          {
            status: classifiedError.type === 'auth' ? 401 : 500,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log(`Found ${bookings?.length || 0} bookings for user ${userId}`);
      
      return new Response(
        JSON.stringify({ data: bookings || [] }),
        {
          status: 200,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
    else if (dataType === 'booking-details') {
      // Get booking ID
      const bookingId = url.searchParams.get('id');
      if (!bookingId) {
        return new Response(
          JSON.stringify({ error: 'Booking ID is required' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Fetch booking details using service role to bypass RLS
      const { data: booking, error: bookingError } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('trips')
          .select('*')
          .eq('id', bookingId)
          .single();
      });
      
      if (bookingError) {
        const classifiedError = classifyError(bookingError);
        console.error('Error fetching booking details:', bookingError);
        return new Response(
          JSON.stringify({ error: classifiedError.message }),
          {
            status: classifiedError.type === 'auth' ? 401 : 500,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Verify the booking belongs to this user
      if (booking.user_id !== userId && booking.customer_email !== userEmail) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to access this booking' }),
          {
            status: 403,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ data: booking }),
        {
          status: 200,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Invalid data type
    return new Response(
      JSON.stringify({ error: 'Invalid data type requested' }),
      {
        status: 400,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const classifiedError = classifyError(error);
    console.error('Error in get-user-data Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: classifiedError.message,
        details: classifiedError.type === 'server' ? 'Please try again later' : undefined
      }),
      {
        status: classifiedError.type === 'auth' ? 401 : 500,
        headers: { 
          ...headersWithOrigin,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});