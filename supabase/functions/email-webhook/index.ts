import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers to allow cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

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
    
    // Verify the X-Auth header
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
    
    if (!webhookSecret || authHeader !== webhookSecret) {
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          
          // Forward the request to our n8n webhook
          const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify({
              name: name || email.split('@')[0],
              email: email,
              reset_link: reset_link,
              email_type: 'PWReset'
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from n8n webhook:', errorText);
            throw new Error('Failed to send password reset email');
          }
          
          console.log('Password reset email sent successfully');
          
          // Check if user exists (for logging purposes only)
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email')
              .eq('email', email)
              .maybeSingle();
              
            if (userError) {
              console.warn('Error checking user existence:', userError);
            } else if (userData) {
              console.log('User found:', userData.id);
            } else {
              console.log('No user found with email:', email);
            }
          } catch (e) {
            console.warn('Error checking user existence:', e);
          }
          
          // Return success response
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
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: emailError.message || 'Failed to send password reset email'
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
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
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});