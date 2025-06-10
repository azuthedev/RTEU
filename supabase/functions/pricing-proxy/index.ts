// Supabase Edge Function to proxy API requests to the pricing API
// This avoids CORS issues by making the request server-side

import { serve } from "https://deno.land/std@0.180.0/http/server.ts";

const apiUrl = "https://get-price-941325580206.europe-southwest1.run.app";

// CORS headers that handle origin dynamically
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Main function to handle requests
serve(async (req) => {
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
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: headersWithOrigin,
    });
  }

  try {
    // Extract the path from the request URL
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/pricing-proxy/, "");

    // Get the request method and body
    const method = req.method;
    let body = null;

    if (method === "POST" || method === "PUT") {
      body = await req.json();
      console.log("Request body:", JSON.stringify(body));
    }

    // Log the request being made
    console.log(`Proxying ${method} request to ${apiUrl}${path}`);

    // Make the request to the target API
    const targetResponse = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Add any API key headers if needed
        // "Authorization": `Bearer ${apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Read the response data
    const contentType = targetResponse.headers.get("Content-Type") || "";
    let data;
    
    if (contentType.includes("application/json")) {
      data = await targetResponse.json();
    } else {
      data = await targetResponse.text();
    }

    // Return the response to the client
    return new Response(
      typeof data === "string" ? data : JSON.stringify(data),
      {
        status: targetResponse.status,
        headers: {
          ...headersWithOrigin,
          "Content-Type": contentType,
        },
      }
    );
  } catch (error) {
    console.error("Error in pricing proxy:", error.message);
    
    return new Response(
      JSON.stringify({
        error: "Failed to proxy request",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin
        },
      }
    );
  }
});