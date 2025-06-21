import { createClient } from "npm:@supabase/supabase-js@2.41.0";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-auth",
  "Access-Control-Allow-Origin": "*",
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log("Edge Function Called: validate-invite");
    
    // Handle GET requests for invite validation
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      
      if (!code) {
        return new Response(
          JSON.stringify({ 
            error: "Missing invite code parameter" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      console.log("Validating invite code:", code);
      
      // Initialize Supabase client with service role key
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Query the invite link
      const { data, error } = await retryDatabaseOperation(async () => {
        return await supabase
          .from('invite_links')
          .select('*')
          .eq('code', code)
          .eq('status', 'active')
          .single();
      });
      
      if (error) {
        console.error("Database error:", error);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Invalid or expired invite code" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // Check if the invite link is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log("Invite link expired");
        
        // Update the status to expired
        await retryDatabaseOperation(async () => {
          return await supabase
            .from('invite_links')
            .update({ status: 'expired' })
            .eq('id', data.id);
        });
        
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "This invite link has expired" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // Try to find the partner application associated with this invite
      // This is useful for pre-filling the form
      let partnerData = null;
      
      try {
        const { data: partnerAppData, error: partnerAppError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('partner_applications')
            .select('*')
            .eq('invite_link_id', data.id)
            .maybeSingle();
        });
        
        if (!partnerAppError && partnerAppData) {
          console.log("Found associated partner application:", partnerAppData.id);
          partnerData = {
            name: partnerAppData.name,
            email: partnerAppData.email,
            phone: partnerAppData.phone,
            company_name: partnerAppData.company_name
          };
        }
      } catch (partnerLookupError) {
        console.error("Error looking up partner application:", partnerLookupError);
        // Non-critical error, continue
      }
      
      // Return the successful validation with role and partner data if available
      return new Response(
        JSON.stringify({
          valid: true,
          inviteId: data.id,
          role: data.role,
          expiresAt: data.expires_at,
          partnerData: partnerData
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Handle POST requests for marking invites as used
    if (req.method === "POST") {
      try {
        const { code, userId } = await req.json();
        
        if (!code || !userId) {
          return new Response(
            JSON.stringify({ 
              error: "Missing required parameters" 
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        console.log(`Marking invite code ${code} as used by user ${userId}`);
        
        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Get the invite link details first
        const { data: inviteData, error: inviteError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('invite_links')
            .select('*')
            .eq('code', code)
            .eq('status', 'active')
            .single();
        });
        
        if (inviteError) {
          console.error("Error fetching invite:", inviteError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Invalid or expired invite code" 
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        // Update the invite link as used
        const { error: updateError } = await retryDatabaseOperation(async () => {
          return await supabase
            .from('invite_links')
            .update({
              status: 'used',
              used_at: new Date().toISOString(),
              used_by: userId
            })
            .eq('id', inviteData.id)
            .eq('status', 'active');
        });
        
        if (updateError) {
          console.error("Error updating invite:", updateError);
          throw new Error("Failed to mark invite as used");
        }
        
        // Look up the partner application if it exists
        try {
          const { data: partnerAppData } = await retryDatabaseOperation(async () => {
            return await supabase
              .from('partner_applications')
              .select('id')
              .eq('invite_link_id', inviteData.id)
              .maybeSingle();
          });
          
          // If there's a partner application, update it
          if (partnerAppData) {
            console.log(`Updating partner application ${partnerAppData.id} with user ID ${userId}`);
            
            await retryDatabaseOperation(async () => {
              return await supabase
                .from('partner_applications')
                .update({ user_id: userId })
                .eq('id', partnerAppData.id);
            });
          }
        } catch (appError) {
          console.error("Error updating partner application:", appError);
          // Non-critical error, continue
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            role: inviteData.role
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (error) {
        console.error("Error processing request:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "An unexpected error occurred" 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }
    
    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});