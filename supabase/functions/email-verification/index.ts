import { createClient } from 'npm:@supabase/supabase-js@2.41.0';
import { v4 as uuidv4 } from 'npm:uuid@9.0.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Configuration constants
const OTP_EXPIRY_MINUTES = 15;
const OTP_FORMAT = '00a000'; // 2 digits, 1 letter, 3 digits
const RESEND_LIMIT_PER_HOUR = 5;

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
  const origin = req.headers.get('origin');
  return origin || 'https://royaltransfereu.com';
}

// Check if a user has exceeded rate limits for OTP/verification requests
async function checkRateLimits(email: string, supabase: any): Promise<{ allowed: boolean, remainingAttempts: number }> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  // Count verification attempts in the last hour
  const { count, error } = await supabase
    .from('email_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .gt('created_at', oneHourAgo.toISOString());
  
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
async function sendVerificationEmail(name: string, email: string, otpCode: string, magicLink: string) {
  try {
    // Get the webhook secret from environment variables
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new Error('Webhook secret is missing from environment variables');
    }
    
    const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': webhookSecret
      },
      body: JSON.stringify({
        name: name || email.split('@')[0], // Use part before @ if no name provided
        email: email,
        otp_code: otpCode,
        verify_link: magicLink,
        email_type: 'OTP'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to send verification email: ${response.status} ${text}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get URL path and redirect to verify endpoint if needed
    const url = new URL(req.url);
    if (url.pathname === '/email-verification/verify') {
      // Redirect to the dedicated verify endpoint
      const newUrl = new URL(url);
      newUrl.pathname = '/functions/v1/email-verification/verify';
      return fetch(newUrl.toString(), req);
    }
    
    // Check if this is a POST request for sending verification
    if (req.method === 'POST') {
      const requestData = await req.json();
      const { email, name, user_id, action } = requestData;
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } 
      else if (action === 'send-otp') {
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
                ...corsHeaders, 
                'Content-Type': 'application/json',
                'Retry-After': '3600' // 1 hour in seconds
              }
            }
          );
        }
        
        // Generate OTP
        const otpCode = generateOTP();
        
        // Generate unique token for magic link
        const magicLinkToken = generateMagicLinkToken();
        
        // Calculate expiration time (15 minutes from now)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
        
        // Use provided user_id or try to find user by email
        let userId = user_id;
        
        if (!userId) {
          // Try to find user by email
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          
          if (userError && userError.code !== 'PGRST116') {
            console.error('Error checking user:', userError);
          } else if (userData) {
            userId = userData.id;
            console.log(`Found existing user ID for ${email}: ${userId}`);
          }
        }
        
        // Check for existing verification records for this email
        const { data: existingVerifications, error: verificationError } = await supabase
          .from('email_verifications')
          .select('id')
          .eq('email', email)
          .eq('verified', false)
          .order('created_at', { ascending: false });
        
        // Delete existing unverified verifications for this email to prevent DB clutter
        if (existingVerifications && existingVerifications.length > 0) {
          // Keep track of the IDs to delete
          const idsToDelete = existingVerifications.map(v => v.id);
          
          if (idsToDelete.length > 0) {
            await supabase
              .from('email_verifications')
              .delete()
              .in('id', idsToDelete);
          }
        }
        
        // Generate magic link URL
        const baseUrl = getBaseUrl(req);
        const magicLink = `${baseUrl}/verify-email?token=${magicLinkToken}&redirect=/login`;
        
        // Insert new verification with created_at timestamp
        const { data: newVerification, error: insertError } = await supabase
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
        
        if (insertError) {
          throw new Error(`Error creating verification: ${insertError.message}`);
        }
        
        const verificationId = newVerification.id;
        
        // Send verification email with both OTP and magic link
        await sendVerificationEmail(name || '', email, otpCode, magicLink);
        
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      else if (action === 'verify-otp') {
        // Redirect to the verify endpoint
        const verifyUrl = new URL(url);
        verifyUrl.pathname = '/functions/v1/email-verification/verify';
        
        const proxyReq = new Request(verifyUrl.toString(), {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify(requestData)
        });
        
        return fetch(proxyReq);
      }
      else if (action === 'check-verification') {
        // Check if user exists and is verified
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email_verified')
          .eq('email', email)
          .maybeSingle();
        
        if (userError) {
          throw new Error(`Error checking user: ${userError.message}`);
        }
        
        // If user doesn't exist or is already verified
        if (!userData) {
          return new Response(
            JSON.stringify({ 
              verified: false,
              exists: false,
              requiresVerification: false
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // Check if there are any pending verifications
        const { data: verifications, error: verificationError } = await supabase
          .from('email_verifications')
          .select('id, created_at, expires_at')
          .eq('user_id', userData.id)
          .eq('verified', false)
          .order('created_at', { ascending: false })
          .limit(1);
        
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Invalid action
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Invalid method
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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