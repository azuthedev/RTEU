/**
 * Feature Flag Bridge - Enables cross-domain feature flag synchronization
 * 
 * This script can be included in both the main application and the admin panel
 * to facilitate feature flag communication across different domains/subdomains.
 */

// Enhanced cookie management for domain sharing
const FeatureFlagBridge = {
  /**
   * Gets cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} - Cookie value or null if not found
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(';').shift());
    }
    return null;
  },

  /**
   * Sets a cookie with domain attribute for cross-subdomain sharing
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Days until expiration
   */
  setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    
    // Get top-level domain for cross-domain compatibility
    let domain = window.location.hostname;
    
    // Extract top-level domain (e.g., example.com from subdomain.example.com)
    const parts = domain.split('.');
    if (parts.length > 2) {
      // Use the top two parts for standard domains
      domain = parts.slice(-2).join('.');
    }
    
    // Set cookie with domain to enable cross-subdomain sharing
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; domain=.${domain}; SameSite=Lax`;
    
    // Also trigger storage event for cross-tab communication
    try {
      if (localStorage) {
        const oldValue = localStorage.getItem(name);
        localStorage.setItem(name, value);
        
        // Manually dispatch storage event to notify other tabs
        // This helps with same-origin tabs that might be listening
        window.dispatchEvent(new StorageEvent('storage', {
          key: name,
          oldValue,
          newValue: value,
          storageArea: localStorage
        }));
      }
    } catch (e) {
      // Ignore localStorage errors (private browsing, etc.)
    }
  },

  /**
   * Gets all feature flags
   * @returns {Object} - Feature flags object
   */
  getFeatureFlags() {
    try {
      const flagsStr = this.getCookie('featureFlags');
      if (flagsStr) {
        return JSON.parse(flagsStr);
      }
      
      // Fallback to localStorage
      const localFlags = localStorage.getItem('featureFlags');
      if (localFlags) {
        return JSON.parse(localFlags);
      }
    } catch (e) {
      console.error('Error getting feature flags:', e);
    }
    
    // Default flags
    return { showCookieBanner: true };
  },

  /**
   * Updates a specific feature flag across domains
   * @param {string} key - Feature flag key (snake_case format for admin, camelCase for main app)
   * @param {boolean} value - New flag value
   * @returns {boolean} - Success indicator
   */
  setFeatureFlag(key, value) {
    try {
      // Get current flags
      const flags = this.getFeatureFlags();
      
      // Map from snake_case to camelCase
      let camelCaseKey;
      if (key === 'show_cookies_banner') {
        camelCaseKey = 'showCookieBanner';
      } else {
        // Default to original key if no mapping exists
        camelCaseKey = key;
      }
      
      // Update flag
      flags[camelCaseKey] = value;
      
      // Save to cookie for cross-domain sharing
      this.setCookie('featureFlags', JSON.stringify(flags));
      
      // Try to update via window.setFeatureFlag if available (same-origin context)
      if (window.setFeatureFlag) {
        window.setFeatureFlag(key, value);
      }
      
      // Try to notify parent/child windows via postMessage (cross-origin iframes)
      try {
        window.parent.postMessage({
          type: 'updateFeatureFlags',
          flags: { [camelCaseKey]: value }
        }, '*');
        
        // If we have frames, notify them too
        if (window.frames && window.frames.length > 0) {
          for (let i = 0; i < window.frames.length; i++) {
            window.frames[i].postMessage({
              type: 'updateFeatureFlags',
              flags: { [camelCaseKey]: value }
            }, '*');
          }
        }
      } catch (e) {
        // Ignore postMessage errors
      }
      
      console.log(`Feature flag '${key}' updated to ${value}. Changes will propagate across domains.`);
      
      return true;
    } catch (e) {
      console.error('Error setting feature flag:', e);
      return false;
    }
  },

  /**
   * Initialize bridge to listen for cross-domain updates
   */
  init() {
    // Listen for feature flag updates from other windows
    window.addEventListener('message', (event) => {
      // Optional origin check for security
      // if (!trustedOrigins.includes(event.origin)) return;
      
      if (event.data && event.data.type === 'updateFeatureFlags') {
        const newFlags = event.data.flags;
        for (const [key, value] of Object.entries(newFlags)) {
          // Update local state if we have React context
          if (window.setFeatureFlag) {
            // Convert camelCase to snake_case for admin panel
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            window.setFeatureFlag(snakeKey, value);
          }
        }
      }
    });
    
    // Poll for cookie changes (for cross-domain sync when postMessage fails)
    setInterval(() => {
      const flagsStr = this.getCookie('featureFlags');
      if (flagsStr) {
        try {
          const flags = JSON.parse(flagsStr);
          
          // If we have React context, update it
          if (window.setFeatureFlag && flags.showCookieBanner !== undefined) {
            window.setFeatureFlag('show_cookies_banner', flags.showCookieBanner);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }, 10000); // Check every 10 seconds
    
    console.log('FeatureFlagBridge initialized for cross-domain communication');
  }
};

// Auto-initialize
FeatureFlagBridge.init();

// Export for module usage
