/**
 * Helper function to toggle a feature flag value in the main application.
 * This can be called from the admin panel.
 * 
 * @param key The feature flag key (snake_case format)
 * @param value The new value for the feature flag
 * @returns Boolean indicating success or failure
 */
export const setFeatureFlag = (key: string, value: boolean): boolean => {
  if (window.setFeatureFlag) {
    return window.setFeatureFlag(key, value);
  }
  
  // If the global function isn't available, try to update localStorage directly
  try {
    const featureFlagsStr = localStorage.getItem('featureFlags');
    const featureFlags = featureFlagsStr ? JSON.parse(featureFlagsStr) : {};
    
    // Map from snake_case to camelCase
    let camelCaseKey = key;
    if (key === 'show_cookies_banner') {
      camelCaseKey = 'showCookieBanner';
    }
    // Add more mappings as needed
    
    featureFlags[camelCaseKey] = value;
    localStorage.setItem('featureFlags', JSON.stringify(featureFlags));
    
    // Dispatch storage event to notify other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'featureFlags',
      newValue: JSON.stringify(featureFlags),
    }));
    
    return true;
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return false;
  }
};

/**
 * Get current feature flag values
 * 
 * @returns Object with all feature flags
 */
export const getFeatureFlags = () => {
  try {
    const featureFlagsStr = localStorage.getItem('featureFlags');
    return featureFlagsStr ? JSON.parse(featureFlagsStr) : {};
  } catch (error) {
    console.error('Error loading feature flags:', error);
    return {};
  }
};

/**
 * Reset all feature flags to default values
 */
export const resetFeatureFlags = () => {
  localStorage.removeItem('featureFlags');
  window.location.reload();
};