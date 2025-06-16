import { createClient } from "npm:@supabase/supabase-js@2.41.0";
import { v4 as uuidv4 } from "npm:uuid@9.0.0";

// Updated CORS headers that dynamically handle origin
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
};

// Configuration constants
const OTP_EXPIRY_MINUTES = 15;
const OTP_FORMAT = '00a000'; // 2 digits, 1 letter, 3 digits
const RESEND_LIMIT_PER_HOUR = 5;

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

// OTP generation function with configurable format
function generateOTP() {
  // Generate 2 random digits (00)
  const firstPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  // Generate a random lowercase letter (a-z)
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  
  // Generate 3 random digits (000)
  const secondPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${firstPart}${letter}${secondPart}`;
}

// Generate a secure token for magic link
function generateMagicLinkToken() {
  return uuidv4().replace(/-/g, '');
}

// Check for common email typos
function checkEmailTypos(email: string): string | null {
  // Map of common domain typos
  const commonDomainTypos: Record<string, string[]> = {
    'gmail.com': [
      'gamil.com', 'gmial.com', 'gmaill.com', 'gmail.co', 'gmail.con',
      'gmail.cm', 'gmail.cmo', 'gmail.comm', 'gmail.om', 'gmal.com',
      'gmaik.com', 'gmil.com', 'gmaio.com', 'gmil.co', 'gma.com'
    ],
    'hotmail.com': [
      'hotmal.com', 'hotmil.com', 'hotmial.com', 'hotmaill.com', 'hotmail.co',
      'hotmail.con', 'hotmail.cm', 'hotmail.cmo', 'hotmail.comm', 'hotmai.com'
    ],
    'yahoo.com': [
      'yaho.com', 'yhoo.com', 'yaho.co', 'yahoo.co', 'yahoo.cm',
      'yahoo.cmo', 'yahoo.con', 'yahoo.comm', 'yahho.com', 'yahhoo.com'
    ],
    'outlook.com': [
      'outlok.com', 'outllok.com', 'otulook.com', 'outloo.com', 'outllook.com',
      'outloook.com', 'outlok.co', 'outlook.co', 'outlook.cm', 'outlook.cmo'
    ]
  };

  const [localPart, domain] = email.toLowerCase().split('@');
  if (!domain) return null;

  // Check for typos in known domains
  for (const [correctDomain, typos] of Object.entries(commonDomainTypos)) {
    if (typos.includes(domain)) {
      return `${localPart}@${correctDomain}`;
    }
  }

  return null;
}

// Create a base URL for verification links based on the request origin
function getBaseUrl(req: Request): string {
  // Extract the Origin header which contains the source domain
  const origin = req.headers.get('origin');
  
  // Use referrer as a fallback
  const referrer = req.headers.get('referer');
  let refOrigin = null;
  
  if (referrer) {
    try {
      const refUrl = new URL(referrer);
      refOrigin = `${refUrl.protocol}//${refUrl.host}`;
    } catch (e) {
      console.error("Failed to parse referrer:", e);
    }
  }
  
  // Use either the Origin header, referer, or fall back to production URL
  const baseUrl = origin || refOrigin || 'https://royaltransfereu.com';
  console.log("Using base URL for redirects:", baseUrl);
  
  return baseUrl;
}

// Check if we're in a development environment
function isDevEnvironment(req: Request): boolean {
  const url = new URL(req.url);
  const host = url.hostname;
  return host === 'localhost' || 
         host.includes('local-credentialless') || 
         host.includes('webcontainer') ||
         host.endsWith('.supabase.co'); // Local Supabase development
}

// Check if a user has exceeded rate limits for OTP/verification requests
async function checkRateLimits(email: string, supabase: any): Promise<{ allowed: boolean, remainingAttempts: number }> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  // Count verification attempts in the last hour
  const { count, error } = await retryDatabaseOperation(async () => {
    return await supabase
      .from('email_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gt('created_at', oneHourAgo.toISOString());
  });
  
  if (error) {
    console.error('Error checking rate limits:', error);
    // Fail open - assume user hasn't exceeded limits
    return { allowed: true, remainingAttempts: RESEND_LIMIT_PER_HOUR };
  }
  
  const attemptsUsed = count || 0;
  const remainingAttempts = Math.max(0, RESEND_LIMIT_PER_HOUR - attemptsUsed);
  
  return { 
    allowed: remainingAttempts > 0,
    remainingAttempts
  };
}

// Send verification email with both OTP and magic link
async function sendVerificationEmail(name: string, email: string, otpCode: string, magicLink: string, req: Request) {
  try {
    console.log('=== EMAIL VERIFICATION SENDING ATTEMPT ===');
    console.log('To:', email);
    console.log('OTP Code:', otpCode);
    console.log('Magic Link:', magicLink);

    // Get the webhook secret from environment variables
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    console.log('Webhook Secret available:', !!webhookSecret);
    if (webhookSecret) {
      console.log('First 3 chars of webhook secret:', webhookSecret.substring(0, 3));
      console.log('Length of webhook secret:', webhookSecret.length);
    }
    
    if (!webhookSecret) {
      console.error('Missing WEBHOOK_SECRET environment variable');
      console.log('Available environment variables:', Object.keys(Deno.env.toObject()).filter(key => !key.includes('SECRET')).join(', '));
      
      // Always throw error if webhook secret is missing
      throw new Error('Server configuration error: Missing webhook authentication');
    }
    
    try {
      console.log('=== PREPARING WEBHOOK REQUEST ===');
      const requestBody = {
        name: name || email.split('@')[0], // Use part before @ if no name provided
        email: email,
        otp_code: otpCode,
        verify_link: magicLink,
        email_type: 'OTP'
      };

      console.log('Request URL: https://n8n.capohq.com/webhook/rteu-tx-email');
      console.log('Request Method: POST');
      console.log('Request Body:', JSON.stringify(requestBody));
      console.log('Request Headers: Content-Type: application/json, X-Auth: [REDACTED]');

      // Actual webhook call
      console.log('Sending webhook request...');
      const startTime = Date.now();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth': webhookSecret
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeout);

        const duration = Date.now() - startTime;
        console.log('Webhook response time:', duration, 'ms');
        console.log('Webhook response status:', response.status);
        console.log('Webhook response status text:', response.statusText);
        
        // Log response headers
        console.log('Webhook response headers:');
        for (const [key, value] of response.headers.entries()) {
          console.log(`  ${key}: ${value}`);
        }

        // Get the response text
        let responseText;
        try {
          responseText = await response.text();
          console.log('Webhook response body:', responseText);
        } catch (textError) {
          console.error('Error reading response text:', textError);
          responseText = '[Failed to read response body]';
        }

        if (!response.ok) {
          throw new Error(`Failed to send verification email: ${response.status} ${responseText}`);
        }

        console.log('Webhook request successful!');
        return true;
      } catch (fetchError) {
        clearTimeout(timeout);
        console.error('=== WEBHOOK REQUEST FAILED ===');
        console.error('Error type:', fetchError.constructor.name);
        console.error('Error message:', fetchError.message);
        console.error('Error stack:', fetchError.stack);
        
        if (fetchError.name === 'AbortError') {
          console.log('Request was aborted due to timeout');
          throw new Error('Verification email request timed out after 10 seconds');
        }
        
        if (fetchError.cause) {
          console.error('Error cause:', fetchError.cause);
        }
        
        // Always throw the error to ensure it's reported properly
        throw fetchError;
      }
    } catch (fetchError) {
      console.error('=== WEBHOOK REQUEST FAILED ===');
      console.error('Error type:', fetchError.constructor.name);
      console.error('Error message:', fetchError.message);
      console.error('Error stack:', fetchError.stack);
      
      if (fetchError.cause) {
        console.error('Error cause:', fetchError.cause);
      }
      
      // Always throw the error to ensure it's reported properly
      throw fetchError;
    }
  } catch (error) {
    console.error('=== EMAIL VERIFICATION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Always throw the error to ensure it's reported properly
    throw error;
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

  // Handle CORS preflight request - critical for browser security
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: headersWithOrigin
    });
  }

  try {
    console.log("Edge Function Called: email-verification");
    console.log("Request method:", req.method);
    console.log("Headers received:", Array.from(req.headers.entries())
      .filter(([key]) => !key.toLowerCase().includes('authorization'))
      .map(([key, value]) => `${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`)
    );
    
    // Get URL path and handle 'verify' endpoint if needed
    const url = new URL(req.url);
    if (url.pathname.endsWith('/verify') && req.method === 'GET') {
      console.log("Magic link verification detected");
      // Handle verification directly for magic links
      
      // Get token from query parameters
      const token = url.searchParams.get('token');
      const redirectUrl = url.searchParams.get('redirect') || '/';
      console.log("Token from URL:", token ? `${token.substring(0, 3)}...` : 'none');
      console.log("Redirect URL:", redirectUrl);
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing token parameter' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Find verification record with this magic_token
      console.log("Looking up verification record with token");
      const { data: verification, error: verificationError } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('email_verifications')
          .select('*')
          .eq('magic_token', token)
          .single();
      });
      
      if (verificationError || !verification) {
        console.error('Invalid verification token:', verificationError);
        
        // Get the client's origin for redirect
        const clientOrigin = getBaseUrl(req);
        
        // Redirect with error to the client's origin
        return new Response(null, {
          status: 302,
          headers: {
            ...headersWithOrigin,
            'Location': `${clientOrigin}/verification-failed?reason=invalid&redirect=${encodeURIComponent(redirectUrl)}`
          }
        });
      }
      
      // Check if token is expired
      if (new Date(verification.expires_at) < new Date()) {
        console.error('Verification token expired');
        
        // Get the client's origin for redirect
        const clientOrigin = getBaseUrl(req);
        
        // Redirect with expiration error
        return new Response(null, {
          status: 302,
          headers: {
            ...headersWithOrigin,
            'Location': `${clientOrigin}/verification-failed?reason=expired&redirect=${encodeURIComponent(redirectUrl)}`
          }
        });
      }
      
      console.log("Valid verification token, marking as verified");
      
      // Mark verification as complete
      await retryDatabaseOperation(async () => {
        return await supabase
          .from('email_verifications')
          .update({ verified: true })
          .eq('id', verification.id);
      });
      
      // Update user's email_verified status if we have a user_id
      if (verification.user_id) {
        console.log("Updating user email_verified status for user:", verification.user_id);
        
        await retryDatabaseOperation(async () => {
          return await supabase
            .from('users')
            .update({ email_verified: true })
            .eq('id', verification.user_id);
        });
          
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
      
      // Get the client's origin for redirect
      const clientOrigin = getBaseUrl(req);
      console.log("Redirecting to:", `${clientOrigin}/verification-success?redirect=${encodeURIComponent(redirectUrl)}`);
      
      // Redirect to success page on the client's origin
      return new Response(null, {
        status: 302,
        headers: {
          ...headersWithOrigin,
          'Location': `${clientOrigin}/verification-success?redirect=${encodeURIComponent(redirectUrl)}`
        }
      });
    }
    
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
    
    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if this is a POST request for sending verification
    if (req.method === 'POST') {
      let requestData;
      try {
        requestData = await req.json();
        console.log("Request data action:", requestData.action);
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
      
      const { email, name, user_id, action, token, verificationId } = requestData;
      
      // Only require email for non-verification actions
      if (!email && action !== 'verify-otp') {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          {
            status: 400,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }

      // Process based on action
      if (action === 'validate') {
        // Check for typos in email
        const correctedEmail = checkEmailTypos(email);
        
        return new Response(
          JSON.stringify({ 
            valid: true, // Basic validation passed since it reached here
            suggested: correctedEmail
          }),
          {
            status: 200,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      } 
      else if (action === 'send-otp') {
        console.log("Processing send-otp action for email:", email);
        
        // Check rate limits
        const { allowed, remainingAttempts } = await checkRateLimits(email, supabase);
        
        if (!allowed) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Rate limit exceeded. Please try again later.',
              retryAfter: '1 hour',
              remainingAttempts: 0
            }),
            {
              status: 429,
              headers: { 
                ...headersWithOrigin, 
                'Content-Type': 'application/json',
                'Retry-After': '3600' // 1 hour in seconds
              }
            }
          );
        }
        
        // Generate OTP
        const otpCode = generateOTP();
        console.log("Generated OTP code:", otpCode);
        
        // Generate unique token for magic link
        const magicLinkToken = generateMagicLinkToken();
        
        // Calculate expiration time (15 minutes from now)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
        
        // Use provided user_id or try to find user by email
        let userId = user_id;
        
        if (!userId) {
          // Try to find user by email
          const { data: userData, error: userError } = await retryDatabaseOperation(async () => {
            return await supabase
              .from('users')
              .select('id')
              .eq('email', email)
              .maybeSingle();
          });
          
          if (userError && userError.code !== 'PGRST116') {
            console.error('Error checking user:', userError);
          } else if (userData) {
            userId = userData.id;
            console.log(`Found existing user ID for ${email}: ${userId}`);
          }
        }
        
        // Check for existing verification records for this email
        const { data: existingVerifications, error: verificationError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('email_verifications')
            .select('id')
            .eq('email', email)
            .eq('verified', false)
            .order('created_at', { ascending: false });
        });
        
        // Delete existing unverified verifications for this email to prevent DB clutter
        if (existingVerifications && existingVerifications.length > 0) {
          // Keep track of the IDs to delete
          const idsToDelete = existingVerifications.map(v => v.id);
          console.log(`Cleaning up ${idsToDelete.length} old verification records`);
          
          if (idsToDelete.length > 0) {
            await retryDatabaseOperation(async () => {
              return await supabase
                .from('email_verifications')
                .delete()
                .in('id', idsToDelete);
            });
          }
        }
        
        // Generate magic link URL
        const baseUrl = getBaseUrl(req);
        const magicLink = `${baseUrl}/verify-email?token=${magicLinkToken}&redirect=/login`;
        
        // Insert new verification with created_at timestamp
        console.log("Creating new verification record");
        const { data: newVerification, error: insertError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('email_verifications')
            .insert([{
              user_id: userId || null,
              token: otpCode, // Store OTP as token
              magic_token: magicLinkToken, // Store magic link token
              email: email, // Store email to track who this verification is for
              expires_at: expiresAt,
              verified: false,
              created_at: new Date().toISOString() // Explicitly set created_at
            }])
            .select()
            .single();
        });
        
        if (insertError) {
          console.error("Error inserting verification record:", insertError);
          throw new Error(`Error creating verification: ${insertError.message}`);
        }
        
        const verificationId = newVerification.id;
        console.log("Created verification record with ID:", verificationId);
        
        // Send verification email with both OTP and magic link
        try {
          console.log("Sending verification email");
          await sendVerificationEmail(name || '', email, otpCode, magicLink, req);
          console.log("Verification email sent successfully");
          
          // Return success with remaining attempts
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Verification email sent successfully',
              verificationId,
              remainingAttempts: remainingAttempts - 1
            }),
            {
              status: 200,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          
          throw emailError;
        }
      }
      else if (action === 'verify-otp') {
        // Handle OTP verification directly
        console.log("Processing verify-otp action");
        
        if (!token || !verificationId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Verification code and ID are required'
            }),
            {
              status: 400,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        console.log(`Verifying OTP: ${token} for ID: ${verificationId}`);
        
        // Find the verification record
        const { data: verification, error: verificationError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('email_verifications')
            .select('*')
            .eq('id', verificationId)
            .eq('token', token)
            .single();
        });
        
        if (verificationError) {
          console.error("Verification query error:", verificationError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid verification code'
            }),
            {
              status: 400,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
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
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        console.log("Verification is valid, marking as verified");
        
        // Mark as verified
        await retryDatabaseOperation(async () => {
          return await supabase
            .from('email_verifications')
            .update({ verified: true })
            .eq('id', verificationId);
        });
        
        // If we have a user_id, update the user's email_verified status
        if (verification.user_id) {
          console.log("Updating user email_verified status for user:", verification.user_id);
          await retryDatabaseOperation(async () => {
            return await supabase
              .from('users')
              .update({ email_verified: true })
              .eq('id', verification.user_id);
          });
            
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
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      else if (action === 'check-verification') {
        console.log("Checking verification status for email:", email);
        
        // Check if user exists and is verified
        const { data: userData, error: userError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('users')
            .select('id, email_verified')
            .eq('email', email)
            .maybeSingle();
        });
        
        if (userError) {
          console.error("Error checking user:", userError);
          throw new Error(`Error checking user: ${userError.message}`);
        }
        
        // If user doesn't exist or is already verified
        if (!userData) {
          console.log("No user found with email:", email);
          return new Response(
            JSON.stringify({ 
              verified: false,
              exists: false,
              requiresVerification: false
            }),
            {
              status: 200,
              headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
            }
          );
        }
        
        console.log("User found, email_verified status:", userData.email_verified);
        
        // Check if there are any pending verifications
        const { data: verifications, error: verificationError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('email_verifications')
            .select('id, created_at, expires_at')
            .eq('user_id', userData.id)
            .eq('verified', false)
            .order('created_at', { ascending: false })
            .limit(1);
        });
        
        // Has a recent verification (within the last 5 minutes)?
        let hasPendingVerification = false;
        let verificationAge = null;
        
        if (verifications && verifications.length > 0) {
          const latestVerification = verifications[0];
          const createdAt = new Date(latestVerification.created_at);
          const now = new Date();
          const ageInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          hasPendingVerification = ageInMinutes < 5; // Consider "pending" if less than 5 minutes old
          verificationAge = Math.round(ageInMinutes);
          
          console.log("Found pending verification, age:", verificationAge, "minutes");
        }
        
        return new Response(
          JSON.stringify({ 
            verified: !!userData.email_verified,
            exists: true,
            requiresVerification: !userData.email_verified,
            hasPendingVerification,
            verificationAge
          }),
          {
            status: 200,
            headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Invalid action
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Invalid method
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json', 'Allow': 'GET, POST, OPTIONS' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    // Get the client's origin
    const origin = req.headers.get('Origin') || 'https://royaltransfereu.com';
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Access-Control-Allow-Origin': origin,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});