import { createClient } from 'npm:@supabase/supabase-js@2.41.0';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log("Edge Function Called: email-verification/verify");
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
    
    // Check if we're in a development environment
    const isDev = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('local-credentialless') ||
      window.location.hostname.includes('webcontainer')
    ) || (new URL(req.url).hostname.endsWith('.supabase.co'));
    
    console.log("Is dev environment:", isDev);
    
    // More permissive in development, strict in production
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
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get verification token from query string for magic links
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    console.log("Token from URL params:", token ? `${token.substring(0, 3)}...` : 'none');
    
    // If token is provided in URL, it's a magic link verification
    if (token && req.method === 'GET') {
      console.log("Processing magic link verification");
      const redirectUrl = url.searchParams.get('redirect') || '/';
      
      // Find verification record with this token
      const { data: verification, error: verificationError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('magic_token', token)
        .single();
      
      if (verificationError || !verification) {
        console.error('Invalid verification token:', verificationError);
        // Redirect with error
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/verification-failed?reason=invalid`
          }
        });
      }
      
      // Check if token is expired
      if (new Date(verification.expires_at) < new Date()) {
        console.error('Verification token expired');
        // Redirect with expiration error
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/verification-failed?reason=expired`
          }
        });
      }
      
      // Mark verification as complete
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verification.id);
      
      // Update user's email_verified status if we have a user_id
      if (verification.user_id) {
        await supabase
          .from('users')
          .update({ email_verified: true })
          .eq('id', verification.user_id);
          
        // Also try to update auth.users metadata
        try {
          // This requires admin access and might not work depending on permissions
          await supabase.auth.admin.updateUserById(
            verification.user_id,
            { user_metadata: { email_verified: true } }
          );
        } catch (e) {
          console.warn('Could not update auth metadata (non-critical):', e);
        }
      }
      
      // Get userId and email for response
      const userId = verification.user_id;
      const email = verification.email;
      
      // Redirect to success page
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${url.origin}/verification-success?redirect=${encodeURIComponent(redirectUrl)}`
        }
      });
    }
    
    // For API requests (POST)
    if (req.method === 'POST') {
      let requestBody;
      try {
        requestBody = await req.json();
        console.log("Request body received:", {
          hasToken: !!requestBody.token,
          hasVerificationId: !!requestBody.verificationId
        });
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request body - could not parse JSON'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const { token, verificationId } = requestBody;
      
      if (!token || !verificationId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Verification code and ID are required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Find the verification record
      const { data: verification, error: verificationError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('id', verificationId)
        .eq('token', token)
        .single();
      
      if (verificationError) {
        console.error("Verification query error:", verificationError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid verification code'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Check expiration
      if (new Date(verification.expires_at) < new Date()) {
        console.log("Verification has expired");
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Verification code has expired'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log("Verification is valid, marking as verified");
      
      // Mark as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verificationId);
      
      // If we have a user_id, update the user's email_verified status
      if (verification.user_id) {
        console.log("Updating user email_verified status for user:", verification.user_id);
        await supabase
          .from('users')
          .update({ email_verified: true })
          .eq('id', verification.user_id);
          
        // Also try to update auth.users metadata
        try {
          // This requires admin access and might not work depending on permissions
          await supabase.auth.admin.updateUserById(
            verification.user_id,
            { user_metadata: { email_verified: true } }
          );
        } catch (e) {
          console.warn('Could not update auth metadata (non-critical):', e);
        }
      }
      
      // Return success
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email verified successfully',
          userId: verification.user_id,
          email: verification.email
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Handle unsupported methods
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error handling verification:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});