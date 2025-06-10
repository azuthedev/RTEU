import { createClient } from "npm:@supabase/supabase-js@2.41.0";
import { v4 as uuidv4 } from "npm:uuid@9.0.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
};

// Configuration constants
const RESET_TOKEN_EXPIRY_HOURS = 1;
const RESET_RATE_LIMIT_PER_HOUR = 3;

// Create a secure UUID token for password reset
function generateResetToken(): string {
  return uuidv4();
}

// Check if a host is a development environment
function isDevEnvironment(host: string): boolean {
  return host === 'localhost' || 
         host.includes('local-credentialless') || 
         host.includes('webcontainer') ||
         host.endsWith('.supabase.co');
}

// Get a production domain regardless of request origin
function getProductionDomain(req: Request): string {
  // Always use the production domain for password reset links
  return 'https://royaltransfereu.com';
}

// Normalize email address
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
const retryDatabaseOperation = async (operation, maxRetries = 2) => {
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

// Check rate limiting for password reset requests
async function checkRateLimits(email: string, ip: string, supabase: any): Promise<{ allowed: boolean, remaining: number, nextAllowedTime: string | null }> {
  try {
    // Get recent attempts for this email
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const { count, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('password_reset_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', email)
        .gt('attempted_at', oneHourAgo.toISOString());
    });
    
    if (error) {
      console.error('Error checking password reset rate limits:', error);
      // Fail open - we don't want to block legitimate requests due to technical errors
      return { allowed: true, remaining: RESET_RATE_LIMIT_PER_HOUR, nextAllowedTime: null };
    }
    
    const attemptsUsed = count || 0;
    const remaining = Math.max(0, RESET_RATE_LIMIT_PER_HOUR - attemptsUsed);
    
    // If they've hit the limit, calculate when they can try again
    let nextAllowedTime = null;
    if (remaining === 0) {
      // Find the timestamp of the oldest attempt in the last hour
      const { data: oldestAttempt, error: oldestError } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('password_reset_attempts')
          .select('attempted_at')
          .eq('email', email)
          .gt('attempted_at', oneHourAgo.toISOString())
          .order('attempted_at', { ascending: true })
          .limit(1)
          .single();
      });
      
      if (!oldestError && oldestAttempt) {
        // Calculate when this attempt "expires" from the hour window
        const oldestTimestamp = new Date(oldestAttempt.attempted_at);
        const nextAllowed = new Date(oldestTimestamp);
        nextAllowed.setHours(nextAllowed.getHours() + 1);
        
        // Format as ISO string
        nextAllowedTime = nextAllowed.toISOString();
      }
    }
    
    return {
      allowed: remaining > 0,
      remaining,
      nextAllowedTime
    };
  } catch (error) {
    console.error('Error in rate limit check:', error);
    // Fail open for technical errors
    return { allowed: true, remaining: RESET_RATE_LIMIT_PER_HOUR, nextAllowedTime: null };
  }
}

// Record a password reset attempt
async function recordResetAttempt(email: string, ip: string, supabase: any, success: boolean = false, userAgent?: string, referrer?: string): Promise<void> {
  try {
    await retryDatabaseOperation(async () => {
      return await supabase.from('password_reset_attempts')
        .insert([{
          email,
          ip_address: ip,
          success,
          user_agent: userAgent || null,
          referrer: referrer || null
        }]);
    });
  } catch (error) {
    console.error('Error recording password reset attempt:', error);
    // Non-critical, so we just log the error and continue
  }
}

// Create a new password reset token
async function createPasswordResetToken(email: string, supabase: any): Promise<string | null> {
  try {
    // Generate token and expiry time
    const token = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);
    
    // Store in the database
    const { data, error } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('password_reset_tokens')
        .insert([
          {
            token,
            user_email: email,
            expires_at: expiresAt.toISOString(),
            used_at: null
          }
        ])
        .select();
    });
    
    if (error) {
      console.error('Error creating password reset token:', error);
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('Error generating password reset token:', error);
    return null;
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
    'http://localhost:5173',
    'https://local-credentialless.webcontainer.io'
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
    
    // Get client IP address for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    console.log("Authorization header present:", !!authHeader);
    
    // Check for JWT token authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // We'll continue with JWT auth (from anon key)
      console.log("Using JWT authentication");
    } else {
      // Check for webhook secret in X-Auth header as fallback
      const xAuthHeader = req.headers.get('X-Auth');
      const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
      
      if (!webhookSecret || xAuthHeader !== webhookSecret) {
        console.error("Authentication failed: Invalid or missing auth credentials");
        
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized - Invalid authentication'
          }),
          {
            status: 401,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log("Using X-Auth webhook secret authentication");
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
        pickup_datetime, 
        vehicle_type, 
        passengers, 
        total_price 
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
        const { data: userData, error: userLookupError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('users')
            .select('id, name, email')
            .ilike('email', normalizedEmail)
            .maybeSingle();
        });
        
        console.log("User lookup result:", userData || "Not found");
        console.log("User lookup query parameters:", { email: normalizedEmail });
        
        if (userLookupError) {
          console.error("User lookup error:", userLookupError);
        }
        
        // If user doesn't exist or is already verified
        if (!userData) {
          console.log(`No user found with email ${normalizedEmail} - skipping password reset`);
          console.log("Database query used: users.select('id, name, email').ilike('email', '", normalizedEmail, "')");
          
          // Record failed attempt
          await recordResetAttempt(normalizedEmail, clientIp, supabase, false, 
            req.headers.get('user-agent'),
            req.headers.get('referer')
          );
          
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
        
        // Check rate limits
        const { allowed, remaining, nextAllowedTime } = await checkRateLimits(
          normalizedEmail, 
          clientIp, 
          supabase
        );
        
        if (!allowed) {
          console.log(`Rate limit exceeded for ${normalizedEmail} from ${clientIp}`);
          
          // Record attempt but mark as failed
          await recordResetAttempt(normalizedEmail, clientIp, supabase, false,
            req.headers.get('user-agent'),
            req.headers.get('referer')
          );
          
          return new Response(
            JSON.stringify({
              error: 'Too many password reset attempts. Please try again later.',
              rateLimitExceeded: true,
              nextAllowedAttempt: nextAllowedTime,
              retryAfter: '1 hour'
            }),
            {
              status: 429,
              headers: {
                ...headersWithOrigin,
                'Content-Type': 'application/json',
                'Retry-After': '3600'
              }
            }
          );
        }
        
        // Create a secure reset token
        const token = await createPasswordResetToken(normalizedEmail, supabase);
        
        if (!token) {
          console.error('Failed to create password reset token');
          
          return new Response(
            JSON.stringify({
              error: 'Failed to process password reset request. Please try again later.'
            }),
            {
              status: 500,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Get the production domain for the reset link
        const productionDomain = getProductionDomain(req);
        
        // Create the reset link with token as query parameter
        const resetUrl = `${productionDomain}/reset-password?token=${token}`;
        console.log('Generated secure reset link:', resetUrl);
        
        try {
          console.log("=== PASSWORD RESET EMAIL SENDING ATTEMPT ===");
          console.log('To:', normalizedEmail);
          console.log('Using name:', userRealName);
          console.log('Reset Link:', resetUrl);
          
          // For development/testing in WebContainer, just return success
          if (isDevEnvironment(req.headers.get('host') || '')) {
            console.log('DEVELOPMENT MODE: Simulating email sending success');
            
            // Record successful attempt
            await recordResetAttempt(normalizedEmail, clientIp, supabase, true,
              req.headers.get('user-agent'),
              req.headers.get('referer')
            );
            
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
              reset_link: resetUrl, // Use the FULL reset URL with token
              email_type: 'PWReset'
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from n8n webhook:', errorText);
            throw new Error('Failed to send password reset email');
          }
          
          console.log('Password reset email sent successfully');
          
          // Record successful attempt
          await recordResetAttempt(normalizedEmail, clientIp, supabase, true,
            req.headers.get('user-agent'),
            req.headers.get('referer')
          );
          
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
          
          // Record failed attempt
          await recordResetAttempt(normalizedEmail, clientIp, supabase, false,
            req.headers.get('user-agent'),
            req.headers.get('referer')
          );
          
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
      else if (email_type === 'BookingReference') {
        // Handle booking confirmation emails with flat structure
        console.log("Processing booking confirmation email for reference:", booking_id);
        
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
          console.log('Pickup Datetime:', pickup_datetime);
          console.log('Vehicle Type:', vehicle_type);
          console.log('Passengers:', passengers);
          console.log('Total Price:', total_price);
          
          // For development/testing in WebContainer, just return success
          if (isDevEnvironment(req.headers.get('host') || '')) {
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
          
          // Forward the request to our n8n webhook with flat structure
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
              pickup_datetime: pickup_datetime,
              vehicle_type: vehicle_type,
              passengers: passengers,
              total_price: total_price,
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