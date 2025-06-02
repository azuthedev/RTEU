import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
};

// Reset password using a verified token
async function resetPassword(
  email: string, 
  newPassword: string, 
  token: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // First verify the token is valid
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, token, user_email, expires_at, used_at')
      .eq('token', token)
      .single();
    
    if (tokenError || !tokenData) {
      return { 
        success: false, 
        error: 'Invalid or expired token' 
      };
    }
    
    // Check if token is for this email
    if (tokenData.user_email !== email) {
      return { 
        success: false, 
        error: 'Token does not match email' 
      };
    }
    
    // Check if token has already been used
    if (tokenData.used_at) {
      return { 
        success: false, 
        error: 'This reset link has already been used' 
      };
    }
    
    // Check if token has expired
    const now = new Date();
    const expiry = new Date(tokenData.expires_at);
    
    if (expiry < now) {
      return { 
        success: false, 
        error: 'This reset link has expired' 
      };
    }
    
    // Mark token as used immediately to prevent race conditions
    const { error: updateError } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: now.toISOString() })
      .eq('token', token);
    
    if (updateError) {
      console.error('Error marking token as used:', updateError);
      return { 
        success: false, 
        error: 'Error processing password reset' 
      };
    }
    
    // Find the user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError || !userData) {
      return { 
        success: false, 
        error: 'User not found' 
      };
    }
    
    // Reset the user's password using admin API
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    );
    
    if (passwordError) {
      console.error('Error resetting password:', passwordError);
      return { 
        success: false, 
        error: 'Failed to reset password: ' + passwordError.message 
      };
    }
    
    // Record successful password reset
    try {
      await supabase.from('password_reset_attempts')
        .insert([{
          email,
          success: true,
          user_agent: 'Supabase Edge Function'
        }]);
    } catch (recordError) {
      // Non-critical error, just log it
      console.error('Error recording successful reset:', recordError);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error in resetPassword function:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred' 
    };
  }
}

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
    console.log("Edge Function Called: reset-password");
    console.log("Request method:", req.method);
    
    // Verify the X-Auth header
    const authHeader = req.headers.get('X-Auth');
    console.log("X-Auth header present:", !!authHeader);
    
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    console.log("WEBHOOK_SECRET env var present:", !!webhookSecret);
    
    if (!webhookSecret || authHeader !== webhookSecret) {
      console.error("Authentication failed: Header doesn't match expected secret");
      
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized - Invalid authentication header'
        }),
        {
          status: 401,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const { email, password, token } = await req.json();
      
      // Validate required parameters
      if (!email || !password || !token) {
        return new Response(
          JSON.stringify({ 
            error: 'Email, password, and token are required'
          }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid email format'
          }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Validate password strength
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ 
            error: 'Password must be at least 6 characters long'
          }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Reset the password
      const result = await resetPassword(email, password, token, supabase);
      
      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
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
    console.error('Error in reset-password Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin }
      }
    );
  }
});