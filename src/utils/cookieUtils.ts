/**
 * Set a cookie with the given name, value and expiration days
 * @param name Cookie name
 * @param value Cookie value
 * @param expiryDays Number of days until the cookie expires
 */
export const setCookie = (name: string, value: string, expiryDays: number = 365): void => {
  const date = new Date();
  date.setTime(date.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
  
  // Get top-level domain for cross-domain compatibility
  let domain = window.location.hostname;
  
  // Extract top-level domain (e.g., example.com from subdomain.example.com)
  const parts = domain.split('.');
  if (parts.length > 2) {
    // If we have a subdomain, use the top two parts
    domain = parts.slice(-2).join('.');
  }
  
  // Set the cookie with domain attribute to share across subdomains
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; domain=.${domain}; SameSite=Lax`;
};

/**
 * Get a cookie by name
 * @param name Cookie name
 * @returns The cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(';').shift() || '');
  }
  return null;
};

/**
 * Delete a cookie by setting its expiration date to the past
 * @param name Cookie name to delete
 */
export const deleteCookie = (name: string): void => {
  // Get top-level domain for cross-domain compatibility
  let domain = window.location.hostname;
  
  // Extract top-level domain (e.g., example.com from subdomain.example.com)
  const parts = domain.split('.');
  if (parts.length > 2) {
    // If we have a subdomain, use the top two parts
    domain = parts.slice(-2).join('.');
  }
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}; SameSite=Lax`;
};

/**
 * Check if a cookie exists
 * @param name Cookie name
 * @returns True if the cookie exists, false otherwise
 */
export const cookieExists = (name: string): boolean => {
  return getCookie(name) !== null;
};