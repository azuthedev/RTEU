// Helper function to check if we're running in production environment
export const isProduction = (): boolean => {
  // Check for netlify or other production indicators
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'royaltransfer.eu' ||
    window.location.hostname === 'royaltransfereu.com' ||
    window.location.hostname.endsWith('netlify.app'))
  );
};

// Helper function to get the correct API URL based on environment
export const getApiUrl = (endpoint: string): string => {
  // Base API URL
  const baseUrl = 'https://get-price-941325580206.europe-southwest1.run.app';
  
  // Return the full URL
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Function to add CORS headers to fetch requests
export const fetchWithCors = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  // Ensure headers exist
  const headers = {
    'Content-Type': 'application/json',
    // Add additional headers for CORS if needed
    'Origin': window.location.origin,
    ...options.headers
  };
  
  // Log detailed request information
  console.log('CORS-aware fetch request:', {
    url,
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.parse(options.body as string) : undefined,
    origin: window.location.origin
  });

  try {
    // Make the request with the enhanced options
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Log detailed response information
    console.log('CORS-aware fetch response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      url: response.url
    });

    return response;
  } catch (error) {
    console.error('CORS-aware fetch error:', error);
    
    // Provide additional debug information about the environment
    console.log('Environment info:', {
      origin: window.location.origin,
      host: window.location.hostname,
      protocol: window.location.protocol,
      isProduction: isProduction(),
      userAgent: navigator.userAgent
    });
    
    throw error;
  }
};