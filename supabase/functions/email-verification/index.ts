import { createClient } from 'npm:@supabase/supabase-js@2.41.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Import common email typos for server-side validation
const commonEmailTypos = {
  'gmail.com': [
    'gamil.com', 'gmial.com', 'gmaill.com', 'gmail.co', 'gmail.con',
    'gmail.cm', 'gmail.cmo', 'gmail.comm', 'gmail.om', 'gmal.com',
    'gmaik.com', 'gmil.com', 'gmaio.com', 'gmil.co', 'gma.com',
    'gmail.co.uk', 'gmail.net', 'gmail.org', 'gmail.co.com', 'gmail.xom',
    'gmail.vom', 'gmail.cim', 'gmail.cok', 'gmail.ckm', 'gemail.com',
    'gemail.co', 'gmailc.om', 'gmaul.com', 'gmall.com', 'gmali.com',
    'gmaik.co', 'gmailcmo.com', 'gmqil.com', 'gmajl.com', 'gmaul.co',
    'gmail,com', 'gmail;.com', 'gmail..com', 'gmailcom', 'gmail@com',
    'gmai.com', 'ggmail.com', 'gmaillcom', 'gmail.co,', 'gmaio.con',
    'gmaul.comm', 'gmqil.con'
  ],
  'hotmail.com': [
    'hotmal.com', 'hotmil.com', 'hotmial.com', 'hotmaill.com', 'hotmail.co',
    'hotmail.con', 'hotmail.cm', 'hotmail.cmo', 'hotmail.comm', 'hotmai.com',
    'htomail.com', 'hormail.com', 'homtail.com', 'hottmail.com', 'hotmaik.com',
    'hotmali.com', 'hotmial.co', 'hotmailc.om', 'hoitmail.com', 'hptmail.com',
    'hoymail.com', 'hitmail.com', 'hotmqil.com', 'hotmial.comm', 'hotmqil.co',
    'hotmial.con', 'hotmial.cm', 'hoymail.co', 'hotmail,com', 'hotmail;.com',
    'hotmail..com', 'hotmailcom', 'hotmail@com', 'hotmail.co.uk', 'hotmail.net',
    'hotmail.org', 'hotmail.co.com', 'hotmaillcom', 'h0tmail.com', 'hotmaul.com',
    'hotnail.com', 'hoymail.com', 'hormail.co', 'hotmall.com', 'hotmkil.com',
    'ho5mail.com', 'botmail.com', 'dotmail.com'
  ],
  'yahoo.com': [
    'yaho.com', 'yhoo.com', 'yaho.co', 'yahoo.co', 'yahoo.cm', 'yahoo.cmo',
    'yahoo.con', 'yahoo.comm', 'yahho.com', 'yahhoo.com', 'yaaho.com',
    'yahooo.com', 'yahool.com', 'yahok.com', 'yqhoo.com', 'yah0o.com',
    'yah9o.com', 'yaoo.com', 'yaho.co.uk', 'yahoo.net', 'yahoo.org',
    'yahoo.co.com', 'yahoo@com', 'yahoo,com', 'yahoo;.com', 'yahoo..com',
    'yahoocom', 'yahko.com', 'yajoo.com', 'yahoi.com', 'yagoo.com',
    'yagoo.co', 'yahlo.com', 'yshoo.com', 'tahoo.com', 'gahoo.com',
    'yaaho.co', 'yyahoo.com', 'yahooo.co', 'yahol.com', 'yajoo.co',
    'yaboo.com', 'yahol.co', 'yagoo.con', 'yaoho.com'
  ],
  'outlook.com': [
    'outlok.com', 'outllok.com', 'otulook.com', 'outloo.com', 'outllook.com',
    'outloook.com', 'outlok.co', 'outlook.co', 'outlook.cm', 'outlook.cmo',
    'outlook.con', 'outlook.comm', 'outllok.co', 'outloak.com', 'outlock.com',
    'oulook.com', 'otlook.com', 'outlk.com', 'outloik.com', 'outlooc.com',
    'outlo9k.com', 'outlooj.com', 'ouytlook.com', 'putlook.com', 'iutlook.com',
    'outl0ok.com', 'outlookk.com', 'outlokc.om', 'outlok.con', 'outlook.co.uk',
    'outlook.net', 'outlook.org', 'outloo.co', 'outlook,com', 'outlook;.com',
    'outlook..com', 'outlookcom', 'outlook@com', 'outlo.com', 'ootlook.com',
    'outlookk.co', 'outlpok.com', 'outloojk.com', 'outlolk.com', 'outlokk.com',
    'outllolk.com', 'outliok.com', 'outuook.com', 'otulok.com', 'outloik.co',
    'outlok.org'
  ],
};

// OTP generation function - format: 00a000
function generateOTP() {
  // Generate 2 random digits (00)
  const firstPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  // Generate a random lowercase letter (a-z)
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
  
  // Generate 3 random digits (000)
  const secondPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${firstPart}${letter}${secondPart}`;
}

// Check if domain has valid MX records using public DNS API
async function checkMxRecords(domain: string): Promise<boolean> {
  try {
    // Using Google's public DNS API to lookup MX records
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`);
    
    if (!response.ok) {
      console.error(`DNS API error: ${response.status} ${response.statusText}`);
      return true; // Fail open - assume domain is valid if API fails
    }
    
    const data = await response.json();
    
    // Check if we have any MX records
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    console.error('Error checking MX records:', error);
    return true; // Fail open - assume domain is valid if check fails
  }
}

// Improved domain validation with MX record check
async function isValidDomain(domain: string): Promise<boolean> {
  // Basic domain validation regex
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(domain)) {
    return false;
  }
  
  // Check MX records for the domain
  return await checkMxRecords(domain);
}

// Check common email typos and return corrections using the comprehensive list
function checkEmailTypos(email: string): string | null {
  const [localPart, domain] = email.toLowerCase().split('@');
  if (!domain) return null;

  // Use the comprehensive typology list
  for (const [correctDomain, typos] of Object.entries(commonEmailTypos)) {
    if (typos.includes(domain)) {
      return `${localPart}@${correctDomain}`;
    }
  }

  return null;
}

// Send OTP via the webhook
async function sendOTPEmail(name: string, email: string, otpCode: string) {
  try {
    const response = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name || email.split('@')[0], // Use part before @ if no name provided
        email: email,
        otp_code: otpCode,
        email_type: 'OTP'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to send OTP email: ${response.status} ${text}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
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
    
    // Extract request data
    const requestData = await req.json();
    const { email, name, action } = requestData;
    
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
      // 1. Basic email format validation is already done on client
      
      // 2. Check for typos using the comprehensive list
      const correctedEmail = checkEmailTypos(email);
      
      // 3. Check domain validity with MX records for non-standard domains
      const emailDomain = email.split('@')[1];
      
      // List of common email domains that we assume are valid without checking MX records
      const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'];
      
      // Skip MX check for common domains to improve performance
      let isValidEmail = true;
      if (!commonDomains.includes(emailDomain.toLowerCase())) {
        isValidEmail = await isValidDomain(emailDomain);
      }
      
      return new Response(
        JSON.stringify({ 
          valid: isValidEmail,
          suggested: correctedEmail
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } 
    else if (action === 'send-otp') {
      // Generate OTP
      const otpCode = generateOTP();
      
      // Calculate expiration time (15 minutes from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      
      // Store OTP in database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (userError) {
        throw new Error(`Error checking user: ${userError.message}`);
      }
      
      // Check for existing verification records
      const { data: existingVerification, error: verificationError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('user_id', userData?.id || null)
        .eq('verified', false)
        .maybeSingle();
      
      if (verificationError && verificationError.code !== 'PGRST116') {
        throw new Error(`Error checking verification: ${verificationError.message}`);
      }
      
      let verificationId;
      
      // Delete existing verification if found
      if (existingVerification) {
        await supabase
          .from('email_verifications')
          .delete()
          .eq('id', existingVerification.id);
      }
      
      // Insert new verification
      const { data: newVerification, error: insertError } = await supabase
        .from('email_verifications')
        .insert([{
          user_id: userData?.id || null,
          token: otpCode,
          expires_at: expiresAt,
          verified: false
        }])
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error creating verification: ${insertError.message}`);
      }
      
      verificationId = newVerification.id;
      
      // Send OTP email
      await sendOTPEmail(name || '', email, otpCode);
      
      // Return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent successfully',
          verificationId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } 
    else if (action === 'verify-otp') {
      const { otp, verificationId } = requestData;
      
      if (!otp || !verificationId) {
        return new Response(
          JSON.stringify({ error: 'OTP and verification ID are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Check OTP
      const { data: verification, error: verificationError } = await supabase
        .from('email_verifications')
        .select('*')
        .eq('id', verificationId)
        .eq('token', otp)
        .single();
      
      if (verificationError) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid OTP'
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
            error: 'OTP has expired'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Mark as verified
      const { error: updateError } = await supabase
        .from('email_verifications')
        .update({ verified: true })
        .eq('id', verificationId);
      
      if (updateError) {
        throw new Error(`Error updating verification: ${updateError.message}`);
      }
      
      // Return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email verified successfully'
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
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});