// Feature Flag Bridge
// This script provides cross-domain communication for feature flags

// Create a unique namespace
window.RTEU = window.RTEU || {};

// Feature flag state object
window.RTEU.featureFlags = {
  // Default values for feature flags
  showCookieBanner: true,
  enableVoiceflowChat: true,
  enableReviews: true,
  useGoogleMapsAutocomplete: true,
  showAllVehicles: true,
  enableAnimations: true,
  useSessionStorage: true, // Enable session storage for persistent state
  // Add more feature flags as needed
};

// Function to update feature flags
window.RTEU.updateFeatureFlags = function(flags) {
  console.log('Updating feature flags:', flags);
  Object.assign(window.RTEU.featureFlags, flags);
  
  // Dispatch event to notify components
  const event = new CustomEvent('featureFlagsUpdated', { 
    detail: window.RTEU.featureFlags 
  });
  window.dispatchEvent(event);
};

// Listen for messages from the admin portal
window.addEventListener('message', function(event) {
  // Verify the origin for security
  const allowedOrigins = [
    'https://app.royaltransfereu.com',
    'https://app.royaltransfer.eu',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  if (allowedOrigins.includes(event.origin)) {
    try {
      // Process feature flag updates
      if (event.data && event.data.type === 'updateFeatureFlags') {
        window.RTEU.updateFeatureFlags(event.data.flags);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
});

// Expose a mechanism to get feature flag values
window.RTEU.getFeatureFlag = function(flagName) {
  return window.RTEU.featureFlags[flagName];
};

// Initialize from localStorage if available
try {
  const savedFlags = localStorage.getItem('rteu_feature_flags');
  if (savedFlags) {
    window.RTEU.updateFeatureFlags(JSON.parse(savedFlags));
  }
} catch (e) {
  console.warn('Could not load feature flags from localStorage:', e);
}

// Log initialization
console.log('Feature Flag Bridge initialized');