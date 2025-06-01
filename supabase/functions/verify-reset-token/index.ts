import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

// Verify and consume a password reset token
async function verifyAndConsumeToken(token: string, supabase: any): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    // Find the token
    const { data: tokenData, error: findError } = await supabase
      .from('password_reset_tokens')
      .select('id, token, user_email, expires_at, used_at')
      .eq('token', token)
      .single();
    
    if (findError) {
      console.error('Token find error:', findError);
      return { valid: false, error: 'Invalid or expired token' };
    }
    
    // Check if token exists
    if (!tokenData) {
      return { valid: false, error: 'Invalid token' };
    }
    
    // Check if token has already been used
    if (tokenData.used_at) {
      return { valid: false, error: 'This reset link has already been used' };
    }
    
    // Check if token has expired
    const now = new Date();
    const expiry = new Date(tokenData.expires_at);
    
    if (expiry < now) {
      return { valid: false, error: 'This reset link has expired' };
    }
    
    // Return success with user email
    return { 
      valid: true,
      email: tokenData.user_email
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false, error: 'Error verifying token' };
  }
}

// Mark a token as used
async function markTokenAsUsed(token: string, supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);
    
    if (error) {
      console.error('Error marking token as used:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
}

// Handle token verification requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Edge Function Called: verify-reset-token");
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const { token, action } = await req.json();
      
      // Validate token parameter
      if (!token) {
        return new Response(
          JSON.stringify({ 
            error: 'Token parameter is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Verify token action
      if (action === 'verify') {
        const result = await verifyAndConsumeToken(token, supabase);
        
        return new Response(
          JSON.stringify(result),
          {
            status: result.valid ? 200 : 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Consume token action - mark token as used
      else if (action === 'consume') {
        // First verify token is valid
        const verifyResult = await verifyAndConsumeToken(token, supabase);
        
        if (!verifyResult.valid) {
          return new Response(
            JSON.stringify(verifyResult),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Now mark the token as used
        const success = await markTokenAsUsed(token, supabase);
        
        return new Response(
          JSON.stringify({ 
            success, 
            email: verifyResult.email
          }),
          {
            status: success ? 200 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Invalid action
      else {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action, must be "verify" or "consume"'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Method not allowed
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
      }
    );
    
  } catch (error) {
    console.error('Error in verify-reset-token Edge Function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});