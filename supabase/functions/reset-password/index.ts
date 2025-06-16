import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
};

// Helper function to normalize email addresses
function normalizeEmail(email: string): string {
  if (!email) return '';
  
  // First decode any URL encoding
  let decoded = email;
  try {
    // Try to decode if it looks URL-encoded
    if (email.includes('%')) {
      decoded = decodeURIComponent(email);
    }
  } catch (e) {
    // If decoding fails, continue with original string
    console.warn('Failed to decode email:', e);
  }
  
  // Then replace any remaining %40 with @, trim whitespace, and convert to lowercase
  return decoded.replace(/%40/g, '@').trim().toLowerCase();
}

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

// Reset password using a verified token
async function resetPassword(
  email: string, 
  newPassword: string, 
  token: string,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize email
    const normalizedEmail = normalizeEmail(email);
    console.log(`[resetPassword] Using normalized email: "${normalizedEmail}"`);
    
    // First verify the token is valid
    const { data: tokenData, error: tokenError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('password_reset_tokens')
        .select('id, token, user_email, expires_at, used_at')
        .eq('token', token)
        .single();
    });
    
    if (tokenError || !tokenData) {
      console.error('[resetPassword] Token verification error:', tokenError);
      return { 
        success: false, 
        error: 'Invalid or expired token' 
      };
    }
    
    // Normalize the token's email for comparison
    const tokenEmail = normalizeEmail(tokenData.user_email);
    console.log(`[resetPassword] Token email: "${tokenEmail}", Request email: "${normalizedEmail}"`);
    
    // Check if token is for this email (case-insensitive comparison)
    if (tokenEmail !== normalizedEmail) {
      console.error(`[resetPassword] Token email mismatch: "${tokenEmail}" vs "${normalizedEmail}"`);
      return { 
        success: false, 
        error: 'Token does not match email' 
      };
    }
    
    // Check if token has already been used
    if (tokenData.used_at) {
      console.error('[resetPassword] Token already used at:', tokenData.used_at);
      return { 
        success: false, 
        error: 'This reset link has already been used' 
      };
    }
    
    // Check if token has expired
    const now = new Date();
    const expiry = new Date(tokenData.expires_at);
    
    if (expiry < now) {
      console.error('[resetPassword] Token expired at:', expiry, 'Current time:', now);
      return { 
        success: false, 
        error: 'This reset link has expired' 
      };
    }
    
    // Mark token as used immediately to prevent race conditions
    const { error: updateError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('password_reset_tokens')
        .update({ used_at: now.toISOString() })
        .eq('token', token);
    });
    
    if (updateError) {
      console.error('[resetPassword] Error marking token as used:', updateError);
      return { 
        success: false, 
        error: 'Error processing password reset' 
      };
    }
    
    // Find the user by email (case-insensitive)
    const { data: userData, error: userError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('users')
        .select('id')
        .ilike('email', normalizedEmail)
        .single();
    });
    
    if (userError || !userData) {
      console.error('[resetPassword] Error finding user:', userError);
      console.log(`[resetPassword] Query parameters: email="${normalizedEmail}"`);
      return { 
        success: false, 
        error: 'User not found' 
      };
    }
    
    console.log(`[resetPassword] Found user with ID: ${userData.id}`);
    
    // Reset the user's password using admin API
    const { error: passwordError } = await retryDatabaseOperation(async () => {
      return await supabase.auth.admin.updateUserById(
        userData.id,
        { password: newPassword }
      );
    });
    
    if (passwordError) {
      console.error('[resetPassword] Error resetting password:', passwordError);
      return { 
        success: false, 
        error: 'Failed to reset password: ' + passwordError.message 
      };
    }
    
    console.log(`[resetPassword] Password reset successful for user: ${userData.id}`);
    
    // Record successful password reset
    try {
      await retryDatabaseOperation(async () => {
        return await supabase.from('password_reset_attempts')
          .insert([{
            email: normalizedEmail,
            success: true,
            user_agent: 'Supabase Edge Function'
          }]);
      });
    } catch (recordError) {
      // Non-critical error, just log it
      console.error('[resetPassword] Error recording successful reset:', recordError);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('[resetPassword] Error in resetPassword function:', error);
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
      if (!emailRegex.test(normalizeEmail(email))) {
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