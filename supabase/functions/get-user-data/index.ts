import { createClient } from 'npm:@supabase/supabase-js@2.41.0';
import { corsHeaders } from '../_shared/cors.ts';

// Create a single Supabase client for interacting with your database
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Helper function to get the user ID from the JWT token
const getUserIdFromToken = async (token: string) => {
  try {
    // Create a client with anonymous key just for JWT verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) throw error;
    if (!user) throw new Error('Invalid user token');
    
    return user.id;
  } catch (error) {
    console.error('Error getting user from token:', error);
    throw new Error('Invalid or expired session');
  }
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Extract the token from Authorization header
    // The header should be in format: "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Invalid authorization header format' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Get the user ID from the token
    const userId = await getUserIdFromToken(token);
    
    // Create a Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the request type from the query parameters
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    // Get booking filter (upcoming or past) if applicable
    const filter = url.searchParams.get('filter');
    
    // Get specific booking ID if applicable
    const id = url.searchParams.get('id');
    
    // Handle different data types
    let data;
    let error;
    
    switch (type) {
      case 'profile':
        // Get user profile data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
          
        data = userData;
        error = userError;
        break;
        
      case 'bookings':
        // Get user's bookings
        const isUpcoming = !filter || filter === 'upcoming';
        const now = new Date().toISOString();
        
        const { data: bookings, error: bookingsError } = await supabase
          .from('trips')
          .select('*')
          .or(`user_id.eq.${userId},customer_email.eq.(select email from users where id = '${userId}')`)
          .filter(isUpcoming ? 'datetime', 'gte', now : 'datetime', 'lt', now)
          .order('datetime', { ascending: isUpcoming });
          
        data = bookings;
        error = bookingsError;
        break;
        
      case 'booking-details':
        // Get specific booking details
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        
        const { data: bookingData, error: bookingError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();
          
        // Verify that the user has access to this booking
        if (bookingData && bookingData.user_id !== userId) {
          // Check if the booking email matches the user's email
          const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();
            
          if (!userData || userData.email !== bookingData.customer_email) {
            return new Response(JSON.stringify({ error: 'You do not have permission to access this booking' }), {
              status: 403,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
        }
          
        data = bookingData;
        error = bookingError;
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Invalid data type requested' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
    
    // Check for database errors
    if (error) {
      console.error('Database error:', error);
      
      const status = error.code === 'PGRST116' ? 404 : 500;
      
      return new Response(JSON.stringify({ error: error.message }), {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Return the data
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    
    // Determine the appropriate status code
    let status = 500;
    if (error.message === 'Invalid or expired session') {
      status = 401;
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});