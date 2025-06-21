import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Max-Age": "86400"
};

// Helper function to retry database operations
const retryDatabaseOperation = async (operation, maxRetries = 3) => {
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

// Basic validation function for email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Function to get host from URL
const getHost = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
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

  // Only allow POST requests for form submissions
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed' 
      }),
      {
        status: 405,
        headers: { 
          ...headersWithOrigin, 
          'Content-Type': 'application/json',
          'Allow': 'POST, OPTIONS'
        }
      }
    );
  }

  try {
    console.log("========== PARTNER SIGNUP FUNCTION START ==========");
    console.log("Partner signup form submission received");
    
    // Parse the request body
    const formData = await req.json();
    console.log("Form data received:", {
      name: formData.name,
      email: formData.email,
      hasPhone: !!formData.phone,
      hasCompanyName: !!formData.company_name,
      hasVatNumber: !!formData.vat_number,
      hasVehicleType: !!formData.vehicle_type,
      hasMessage: !!formData.message
    });

    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone || !formData.company_name || !formData.vat_number || !formData.message) {
      console.log("Validation failed - missing required fields");
      return new Response(
        JSON.stringify({ 
          error: 'Name, email, phone, company name, VAT number, and additional information are required fields' 
        }),
        {
          status: 400,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      console.log("Validation failed - invalid email format:", formData.email);
      return new Response(
        JSON.stringify({ 
          error: 'Please provide a valid email address' 
        }),
        {
          status: 400,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized");
    
    // Check for duplicate submissions (to prevent spam)
    console.log("Checking for existing applications with email:", formData.email);
    const { data: existingApplications, error: checkError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('partner_applications')
        .select('id, created_at')
        .eq('email', formData.email)
        .order('created_at', { ascending: false })
        .limit(1);
    });
    
    if (checkError) {
      console.error("Error checking for existing applications:", checkError);
      throw new Error("Database error when checking for existing applications");
    }
    
    // If there's a recent application (within the last 24 hours), reject to prevent spam
    if (existingApplications && existingApplications.length > 0) {
      const mostRecentApplication = existingApplications[0];
      const applicationTime = new Date(mostRecentApplication.created_at);
      const now = new Date();
      const hoursSinceLastApplication = (now.getTime() - applicationTime.getTime()) / (1000 * 60 * 60);
      
      console.log("Found existing application from:", applicationTime.toISOString());
      console.log("Hours since last application:", hoursSinceLastApplication);
      
      if (hoursSinceLastApplication < 24) {
        console.log("Application rejected due to recent submission");
        return new Response(
          JSON.stringify({ 
            error: 'You have already submitted a partner application. Please wait 3-5 business days for us to reach out to you. If you need to modify your submission, please contact us directly at contact@royaltransfereu.com.',
            existingApplication: {
              id: mostRecentApplication.id,
              submitted: applicationTime.toISOString()
            }
          }),
          {
            status: 429,  // Too Many Requests
            headers: { 
              ...headersWithOrigin, 
              'Content-Type': 'application/json',
              'Retry-After': `${Math.ceil(24 - hoursSinceLastApplication) * 3600}`  // Seconds until they can retry
            }
          }
        );
      }
    } else {
      console.log("No existing application found for this email");
    }

    // Prepare the data to insert - include vehicle_type and vat_number if provided
    const partnerApplication = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      company_name: formData.company_name.trim(),
      vat_number: formData.vat_number.trim(),
      vehicle_type: formData.vehicle_type || null, // Optional field
      message: formData.message.trim(),
      status: 'pending',  // Default status
      user_id: formData.user_id || null  // If submitted by a logged-in user
    };

    // Insert the application into the database
    console.log("Inserting partner application");
    const { data: insertedApplication, error: insertError } = await retryDatabaseOperation(async () => {
      return await supabase
        .from('partner_applications')
        .insert([partnerApplication])
        .select()
        .single();
    });
    
    if (insertError) {
      console.error("Error inserting partner application:", insertError);
      throw new Error(`Database error when inserting application: ${insertError.message}`);
    }
    
    console.log("Partner application inserted successfully with ID:", insertedApplication.id);

    // Now send OTP verification email
    try {
      const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        console.error("WEBHOOK_SECRET not found in environment variables");
        console.log("Available env variables:", Object.keys(Deno.env.toObject())
          .filter(key => !key.includes('KEY') && key !== 'WEBHOOK_SECRET')
          .join(', '));
        throw new Error("Server configuration error: Missing webhook secret");
      }
      
      console.log("Sending OTP verification email to:", partnerApplication.email);
      console.log("With name:", partnerApplication.name);
      
      // Call the email-verification Edge Function to send OTP
      console.log("Calling email-verification Edge Function");
      console.log("URL:", `${supabaseUrl}/functions/v1/email-verification`);
      console.log("Request payload:", {
        email: partnerApplication.email,
        name: partnerApplication.name,
        action: 'send-otp'
      });
      
      const verificationResponse = await fetch(`${supabaseUrl}/functions/v1/email-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'X-Auth': webhookSecret
        },
        body: JSON.stringify({
          email: partnerApplication.email,
          name: partnerApplication.name,
          action: 'send-otp'
        })
      });
      
      console.log("Verification response status:", verificationResponse.status);
      
      // Get the full response text regardless of success/failure
      let responseText;
      try {
        responseText = await verificationResponse.text();
        console.log("Verification response text:", responseText);
      } catch (textError) {
        console.error("Error getting response text:", textError);
        responseText = "Could not read response body";
      }
      
      // Parse the response JSON if it's valid JSON
      let verificationData;
      try {
        verificationData = JSON.parse(responseText);
        console.log("Parsed verification response data:", verificationData);
      } catch (parseError) {
        console.error("Error parsing verification response:", parseError);
        // If we can't parse the response, use the status and text to determine success/failure
        if (!verificationResponse.ok) {
          throw new Error(`Failed to send verification email: ${verificationResponse.status} ${responseText}`);
        }
      }
      
      if (!verificationResponse.ok) {
        throw new Error(`Failed to send verification email: ${verificationResponse.statusText}\n${responseText}`);
      }
      
      if (!verificationData?.success || !verificationData?.verificationId) {
        throw new Error('Failed to generate verification code: ' + (verificationData?.error || 'Unknown error'));
      }
      
      console.log("Verification successful, updating partner application with verification ID");
      
      // Update the partner application with the verification ID
      await retryDatabaseOperation(async () => {
        return await supabase
          .from('partner_applications')
          .update({ verification_id: verificationData.verificationId })
          .eq('id', insertedApplication.id);
      });
      
      // Return success with verification ID
      console.log("Returning success response with verification ID");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Partner application submitted successfully! Please verify your email to continue.",
          applicationId: insertedApplication.id,
          verificationId: verificationData.verificationId,
          email: partnerApplication.email
        }),
        {
          status: 200,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    } catch (otpError) {
      console.error("Error sending OTP verification:", otpError);
      console.log("Error details:", otpError.stack || "No stack trace available");
      
      // Return a proper error response
      return new Response(
        JSON.stringify({
          error: "Failed to send verification email. Please try again later.",
          details: otpError.message,
          fallback: true
        }),
        {
          status: 500,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Error processing partner application:", error);
    console.log("Error details:", error.stack || "No stack trace available");
    console.log("========== PARTNER SIGNUP FUNCTION END WITH ERROR ==========");
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: "Failed to process your application. Please try again later.",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
      }
    );
  }
});