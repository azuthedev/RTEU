import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
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
    
    // Check if we're in a development environment
    const isDev = isDevEnvironment(req);
    
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
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
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
          hasBookingId: !!requestData.booking_id
        });
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(
          JSON.stringify({ error: 'Invalid request body - could not parse JSON' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const { 
        name, 
        email, 
        reset_link, 
        email_type, 
        booking_id, 
        pickup_location, 
        dropoff_location,
        // Handle separate date/time fields
        pickup_date,
        pickup_time,
        dropoff_date,
        dropoff_time, 
        vehicle_type, 
        passengers, 
        total_price,
        flight_number,
        extra_stops,
        luggage_count,
        // Partner invite specific
        invite_link
      } = requestData;
      
      // Validate required fields
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Process email sending based on type
      if (email_type === 'PWReset') {
        // Send password reset email
        console.log("Processing password reset email request");
        
        // Ensure email is properly formatted and not URL-encoded
        const normalizedEmail = normalizeEmail(email);
        console.log("Normalized email:", normalizedEmail);
        console.log("Raw email from request:", email);
        
        // First, try to find the user's full name from the users table
        const { data: userData, error: userLookupError } = await supabase
          .from('users')
          .select('id, name, email')
          .ilike('email', normalizedEmail)
          .maybeSingle();
        
        console.log("User lookup result:", userData || "Not found");
        console.log("User lookup query parameters:", { email: normalizedEmail });
        
        if (userLookupError) {
          console.error("User lookup error:", userLookupError);
        }
        
        // If user doesn't exist or is already verified
        if (!userData) {
          console.log(`No user found with email ${normalizedEmail} - skipping password reset`);
          console.log("Database query used: users.select('id, name, email').ilike('email', '", normalizedEmail, "')");
          
          // We don't want to reveal if a user exists or not for security reasons
          // So we return a success response even though no email will be sent
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'If an account exists with this email, a password reset link has been sent.'
            }),
            {
              status: 200,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Use the user's real name from the database, or fall back to email prefix
        const userRealName = userData.name || normalizedEmail.split('@')[0];
        console.log(`Using name "${userRealName}" for reset email`);
        
        try {
          console.log("=== PASSWORD RESET EMAIL SENDING ATTEMPT ===");
          console.log('To:', normalizedEmail);
          console.log('Using name:', userRealName);
          console.log('Reset Link:', reset_link);
          
          // For development/testing in WebContainer, just return success
          if (isDev) {
            console.log('DEVELOPMENT MODE: Simulating email sending success');
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Password reset email sent successfully (DEV MODE)'
              }),
              {
                status: 200,
                headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
              }
            );
          }
          
          // Forward the request to our n8n webhook
          const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || '';
          const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify({
              name: userRealName, // Use the user's real name from the database
              email: normalizedEmail,
              reset_link: reset_link, // Use the FULL reset URL with token
              email_type: 'PWReset'
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from n8n webhook:', errorText);
            throw new Error('Failed to send password reset email');
          }
          
          console.log('Password reset email sent successfully');
          
          // Return success response
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Password reset email sent successfully'
            }),
            {
              status: 200,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
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
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
      } 
      else if (email_type === 'PARTNER_INVITE') {
        // Handle partner invite emails
        console.log("Processing partner invite email");
        
        // Validate required fields
        if (!email || !name || !invite_link) {
          return new Response(
            JSON.stringify({ 
              error: 'Email, name, and invite_link are required for partner invite emails' 
            }),
            {
              status: 400,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        try {
          console.log("=== PARTNER INVITE EMAIL SENDING ATTEMPT ===");
          console.log('To:', email);
          console.log('Name:', name);
          // Make sure the invite link uses the production domain
          let finalInviteLink = invite_link;
          if (isDev) {
            // If in dev but the link contains localhost, replace with production URL
            if (invite_link.includes('localhost')) {
              finalInviteLink = invite_link.replace(
                /(https?:\/\/)([^\/]+)(\/.*)/,
                'https://royaltransfereu.com$3'
              );
              console.log('Updated invite link for production:', finalInviteLink);
            }
          }
          console.log('Final Invite Link:', finalInviteLink);
          
          // For development/testing in WebContainer, just return success
          if (isDev) {
            console.log('DEVELOPMENT MODE: Simulating email sending success');
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Partner invite email sent successfully (DEV MODE)'
              }),
              {
                status: 200,
                headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
              }
            );
          }
          
          // Forward the request to our n8n webhook
          const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || '';
          const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify({
              name: name,
              email: email,
              invite_link: finalInviteLink,
              email_type: 'PARTNER_INVITE'
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from n8n webhook:', errorText);
            throw new Error('Failed to send partner invite email');
          }
          
          console.log('Partner invite email sent successfully');
          
          // Return success response
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Partner invite email sent successfully'
            }),
            {
              status: 200,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        } catch (emailError) {
          console.error('Error sending partner invite email:', emailError);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: emailError.message || 'Failed to send partner invite email'
            }),
            {
              status: 500,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
      }
      else if (email_type === 'BookingReference') {
        // Handle booking confirmation emails with separate date/time fields
        console.log("Processing booking confirmation email for reference:", booking_id);
        console.log("Date/time components received:", {
          pickup_date,
          pickup_time,
          dropoff_date,
          dropoff_time
        });
        
        // Validate required booking fields
        if (!booking_id || !pickup_location || !dropoff_location) {
          return new Response(
            JSON.stringify({ 
              error: 'Booking ID, pickup location, and dropoff location are required for confirmation emails'
            }),
            {
              status: 400,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        try {
          console.log("=== BOOKING CONFIRMATION EMAIL SENDING ATTEMPT ===");
          console.log('To:', email);
          console.log('Booking ID:', booking_id);
          console.log('Pickup Location:', pickup_location);
          console.log('Dropoff Location:', dropoff_location);
          console.log('Pickup Date:', pickup_date);
          console.log('Pickup Time:', pickup_time);
          console.log('Dropoff Date:', dropoff_date);
          console.log('Dropoff Time:', dropoff_time);
          console.log('Vehicle Type:', vehicle_type);
          console.log('Passengers:', passengers);
          console.log('Total Price:', total_price);
          console.log('Flight Number:', flight_number);
          console.log('Extra Stops:', extra_stops);
          console.log('Luggage Count:', luggage_count);
          
          // For development/testing in WebContainer, just return success
          if (isDev) {
            console.log('DEVELOPMENT MODE: Simulating email sending success');
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Booking confirmation email sent successfully (DEV MODE)'
              }),
              {
                status: 200,
                headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
              }
            );
          }
          
          // Forward the request to our n8n webhook with separate date/time fields
          const webhookSecret = Deno.env.get('WEBHOOK_SECRET') || '';
          const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify({
              name: name || email.split('@')[0],
              email: email,
              booking_id: booking_id,
              pickup_location: pickup_location,
              dropoff_location: dropoff_location,
              // Pass separate date/time components
              pickup_date: pickup_date,
              pickup_time: pickup_time,
              dropoff_date: dropoff_date || 'N/A',
              dropoff_time: dropoff_time || 'N/A',
              vehicle_type: vehicle_type,
              passengers: passengers,
              total_price: total_price,
              flight_number: flight_number || 'Not provided',
              extra_stops: extra_stops || 'None',
              luggage_count: luggage_count || '0',
              email_type: 'BookingReference'
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from n8n webhook:', errorText);
            throw new Error('Failed to send booking confirmation email');
          }
          
          console.log('Booking confirmation email sent successfully');
          
          // Return success response
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Booking confirmation email sent successfully'
            }),
            {
              status: 200,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        } catch (emailError) {
          console.error('Error sending booking confirmation email:', emailError);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: emailError.message || 'Failed to send booking confirmation email'
            }),
            {
              status: 500,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
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
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    // Invalid method
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' }
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
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin
        }
      }
    );
  }
});

// Helper function to check if we're in a development environment
function isDevEnvironment(req: Request): boolean {
  const url = new URL(req.url);
  const host = url.hostname;
  return host === 'localhost' || 
         host.includes('local-credentialless') || 
         host.includes('webcontainer') ||
         host.endsWith('.supabase.co');
}

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