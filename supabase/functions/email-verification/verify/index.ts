import { createClient } from 'npm:@supabase/supabase-js@2.41.0';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get verification token from query string for magic links
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    // If token is provided in URL, it's a magic link verification
    if (token && req.method === 'GET') {
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
      const { token, verificationId } = await req.json();
      
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
      
      // Mark as verified
      await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verificationId);
      
      // If we have a user_id, update the user's email_verified status
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