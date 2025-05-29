import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers to allow cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

// Check if we're in a development environment
function isDevEnvironment(req: Request): boolean {
  const url = new URL(req.url);
  const host = url.hostname;
  return host === 'localhost' || 
         host.includes('local-credentialless') || 
         host.includes('webcontainer') ||
         host.endsWith('.supabase.co');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log("Edge Function Called: email-webhook");
    console.log("Request method:", req.method);
    console.log("Headers received:", Array.from(req.headers.entries())
      .filter(([key]) => !key.toLowerCase().includes('authorization'))
      .map(([key, value]) => `${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`)
    );
    
    // Verify the X-Auth header if not in development
    const authHeader = req.headers.get('X-Auth');
    console.log("X-Auth header present:", !!authHeader);
    
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    console.log("WEBHOOK_SECRET env var present:", !!webhookSecret);
    
    // Print first few characters of both for comparison (safely)
    if (authHeader && webhookSecret) {
      const authPrefix = authHeader.substring(0, 3);
      const secretPrefix = webhookSecret.substring(0, 3);
      console.log(`Auth header starts with: ${authPrefix}...`);
      console.log(`Secret starts with: ${secretPrefix}...`);
      console.log("Do they match?", authHeader === webhookSecret);
    }
    
    const isDev = isDevEnvironment(req);
    console.log("Is dev environment:", isDev);
    
    // Stricter auth in production
    if (!isDev && webhookSecret && authHeader !== webhookSecret) {
      console.error("Authentication failed: Header doesn't match expected secret");
      
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized - Invalid authentication header',
          debug: {
            headerPresent: !!authHeader,
            secretPresent: !!webhookSecret,
            match: false
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle POST requests for sending emails
    if (req.method === 'POST') {
      let requestData;
      try {
        requestData = await req.json();
        console.log("Request data received:", {
          emailType: requestData.email_type,
          hasName: !!requestData.name,
          hasEmail: !!requestData.email,
        });
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(
          JSON.stringify({ error: 'Invalid request body - could not parse JSON' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const { name, email, reset_link, email_type } = requestData;
      
      // Validate required fields
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (email_type === 'PWReset' && !reset_link) {
        return new Response(
          JSON.stringify({ error: 'Reset link is required for password reset emails' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Process email sending based on type
      if (email_type === 'PWReset') {
        // Send password reset email
        console.log("Processing password reset email request");
        
        try {
          console.log("=== PASSWORD RESET EMAIL SENDING ATTEMPT ===");
          console.log('To:', email);
          console.log('Reset Link:', reset_link);
          
          // Get the webhook secret from environment variables
          const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
          console.log('Webhook Secret available:', !!webhookSecret);
          
          // In a real implementation, this would call an email service
          // For this example, we'll just log the attempt and return success
          console.log('Sending password reset email to:', email);
          console.log('Reset link:', reset_link);
          
          // Simulating successful email send
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Password reset email sent successfully'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } catch (emailError) {
          console.error('Error sending password reset email:', emailError);
          throw emailError;
        }
      } 
      else {
        // Unsupported email type
        return new Response(
          JSON.stringify({ error: `Unsupported email type: ${email_type}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Invalid method
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});