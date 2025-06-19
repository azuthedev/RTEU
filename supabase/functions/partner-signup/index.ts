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

// Function to check if request is from a development environment
const isDevEnvironment = (req: Request): boolean => {
  const url = new URL(req.url);
  const host = url.hostname;
  return host === 'localhost' || 
         host.includes('local-credentialless') || 
         host.includes('webcontainer') ||
         host.endsWith('.supabase.co');
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
    console.log("Partner signup form submission received");
    
    // Parse the request body
    const formData = await req.json();
    console.log("Form data received:", {
      hasName: !!formData.name,
      hasEmail: !!formData.email,
      hasPhone: !!formData.phone,
      hasCompanyName: !!formData.company_name,
      hasMessage: !!formData.message
    });

    // Validate required fields
    if (!formData.name || !formData.email) {
      return new Response(
        JSON.stringify({ 
          error: 'Name and email are required fields' 
        }),
        {
          status: 400,
          headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
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
    
    // Check for duplicate submissions (to prevent spam)
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
      
      if (hoursSinceLastApplication < 24) {
        return new Response(
          JSON.stringify({ 
            error: 'You have already submitted an application recently. Please wait 24 hours before submitting another one.',
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
    }

    // Prepare the data to insert
    const partnerApplication = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone ? formData.phone.trim() : null,
      company_name: formData.company_name ? formData.company_name.trim() : null,
      message: formData.message ? formData.message.trim() : null,
      status: 'pending',  // Default status
      user_id: formData.user_id || null  // If submitted by a logged-in user
    };

    // Insert the application into the database
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
    
    console.log("Partner application inserted successfully:", insertedApplication.id);
    
    // Now send a notification about the new application
    try {
      const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
      
      // Only proceed with webhook if secret is available
      if (webhookSecret) {
        console.log("Sending notification to webhook");
        
        // For development/testing, skip the actual webhook call
        const isDev = isDevEnvironment(req);
        if (isDev) {
          console.log("Development environment detected - skipping webhook call");
        } else {
          // Send notification to the webhook
          const webhookResponse = await fetch('https://n8n.capohq.com/webhook/rteu-tx-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Auth': webhookSecret
            },
            body: JSON.stringify({
              // Email parameters
              name: 'Royal Transfer EU Admin',
              email: 'contact@royaltransfereu.com',  // Admin email to receive notifications
              partner_name: partnerApplication.name,
              partner_email: partnerApplication.email,
              partner_phone: partnerApplication.phone || 'Not provided',
              partner_company: partnerApplication.company_name || 'Not provided',
              partner_message: partnerApplication.message || 'No message provided',
              application_id: insertedApplication.id,
              application_date: new Date().toISOString(),
              email_type: 'PartnerApplication'
            })
          });
          
          if (!webhookResponse.ok) {
            // Log webhook error but don't fail the request
            console.error("Webhook notification failed:", await webhookResponse.text());
          } else {
            console.log("Webhook notification sent successfully");
          }
        }
      } else {
        console.warn("WEBHOOK_SECRET not found in environment variables - skipping notification");
      }
    } catch (webhookError) {
      // Log but don't fail the main request if notification fails
      console.error("Error sending webhook notification:", webhookError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Partner application submitted successfully! We will contact you soon.",
        applicationId: insertedApplication.id
      }),
      {
        status: 200,
        headers: { ...headersWithOrigin, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Error processing partner application:", error);
    
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