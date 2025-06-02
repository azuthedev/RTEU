import { createClient } from "npm:@supabase/supabase-js@2.41.0";
import { v4 as uuidv4 } from "npm:uuid@9.0.0";

// CORS headers - must dynamically set based on request origin
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

// Check rate limiting for password reset requests
async function checkRateLimits(email: string, ip: string, supabase: any): Promise<{ allowed: boolean, remaining: number, nextAllowedTime: string | null }> {
  try {
    // Get recent attempts for this email
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const { count, error } = await supabase
      .from('password_reset_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gt('attempted_at', oneHourAgo.toISOString());
    
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
      const { data: oldestAttempt, error: oldestError } = await supabase
        .from('password_reset_attempts')
        .select('attempted_at')
        .eq('email', email)
        .gt('attempted_at', oneHourAgo.toISOString())
        .order('attempted_at', { ascending: true })
        .limit(1)
        .single();
      
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
    await supabase
      .from('password_reset_attempts')
      .insert([
        {
          email,
          ip_address: ip,
          success,
          user_agent: userAgent || null,
          referrer: referrer || null
        }
      ]);
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
    const { data, error } = await supabase
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
    
    // Get client IP address for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
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
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
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
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Process email sending based on type
      if (email_type === 'PWReset') {
        // Send password reset email
        console.log("Processing password reset email request");
        
        // First, try to find the user's full name from the users table
        const { data: userData, error: userLookupError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('email', email)
          .maybeSingle();
        
        console.log("User lookup result:", userData || "Not found");
        
        // If user doesn't exist, don't reveal this information
        // but also don't proceed with reset token generation
        if (!userData) {
          console.log(`No user found with email ${email} - skipping password reset`);
          
          // Record failed attempt
          await recordResetAttempt(email, clientIp, supabase, false, 
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
        const userRealName = userData.name || email.split('@')[0];
        console.log(`Using name "${userRealName}" for reset email`);
        
        // Check rate limits
        const { allowed, remaining, nextAllowedTime } = await checkRateLimits(
          email, 
          clientIp, 
          supabase
        );
        
        if (!allowed) {
          console.log(`Rate limit exceeded for ${email} from ${clientIp}`);
          
          // Record attempt but mark as failed
          await recordResetAttempt(email, clientIp, supabase, false,
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
        const token = await createPasswordResetToken(email, supabase);
        
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
          console.log('To:', email);
          console.log('Using name:', userRealName);
          console.log('Reset Link:', resetUrl);
          
          // Forward the request to our n8n webhook
          const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify({
              name: userRealName, // Use the user's real name from the database
              email: email,
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
          await recordResetAttempt(email, clientIp, supabase, true,
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
          await recordResetAttempt(email, clientIp, supabase, false,
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