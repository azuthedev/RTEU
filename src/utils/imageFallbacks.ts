/**
 * Utility to help with image loading issues by providing fallback URLs
 */

// Primary and backup image domains
const PRIMARY_IMAGE_DOMAIN = 'https://royaltransfereu.com';
const BACKUP_IMAGE_DOMAIN = 'https://melodious-panda-7ef225.netlify.app';

// Convert filename to lowercase and sanitize
const sanitizeFilename = (filename: string): string => {
  return filename.toLowerCase().replace(/\s+/g, '-');
};

// Convert a full URL to use the primary domain with lowercase filenames
export const getPrimaryDomainUrl = (url: string): string => {
  try {
    // Skip if it's already using the primary domain
    if (url.startsWith(PRIMARY_IMAGE_DOMAIN)) return url;
    
    // Parse the URL to extract the path
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    
    // Convert path segments to lowercase for new domain
    const pathSegments = pathname.split('/');
    const filename = pathSegments[pathSegments.length - 1];
    
    // Replace just the filename with lowercase version
    if (filename) {
      pathSegments[pathSegments.length - 1] = sanitizeFilename(filename);
      pathname = pathSegments.join('/');
    }
    
    return `${PRIMARY_IMAGE_DOMAIN}${pathname}`;
  } catch (e) {
    // If URL parsing fails, make a best effort attempt
    console.warn('Error parsing URL:', url, e);
    
    // Extract what looks like a filename
    const filenameMatch = url.match(/([^/]+)(\.\w+)(\?.*)?$/);
    if (filenameMatch) {
      const filename = filenameMatch[1] + filenameMatch[2];
      const queryParams = filenameMatch[3] || '';
      return `${PRIMARY_IMAGE_DOMAIN}/assets/${sanitizeFilename(filename)}${queryParams}`;
    }
    
    // Return original if we can't transform it
    return url;
  }
};

// Map of original URLs to fallback URLs
const fallbackImageMap: Record<string, string> = {
  // Logo fallbacks
  "https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp": `${BACKUP_IMAGE_DOMAIN}/cDgm3025.webp`,
  "https://files.royaltransfereu.com/assets/rt-logo-black-950-500.png": `${BACKUP_IMAGE_DOMAIN}/mijH1834.png`,
  
  // Hero image fallbacks
  "https://files.royaltransfereu.com/assets/newherotest.webp": `${BACKUP_IMAGE_DOMAIN}/ZKj2573.webp`,
  "https://files.royaltransfereu.com/assets/newherotest.png": `${BACKUP_IMAGE_DOMAIN}/Axi3104.png`,
  "https://files.royaltransfereu.com/assets/mobileherotest.webp": `${BACKUP_IMAGE_DOMAIN}/ohfj7576.webp`,
  "https://files.royaltransfereu.com/assets/mobileherotest.png": `${BACKUP_IMAGE_DOMAIN}/lTA7682.png`,
  
  // Vehicle images
  "https://files.royaltransfereu.com/assets/Standard-Sedan.jpg": `${BACKUP_IMAGE_DOMAIN}/BUpN7Wn.jpeg`,
  "https://files.royaltransfereu.com/assets/Premium-Sedan.jpg": `${BACKUP_IMAGE_DOMAIN}/BUpN7Wn.jpeg`,
  "https://files.royaltransfereu.com/assets/VIP-Sedan.jpg": `${BACKUP_IMAGE_DOMAIN}/DKdfE4r.jpeg`,
  "https://files.royaltransfereu.com/assets/Standard-Minivan.jpg": `${BACKUP_IMAGE_DOMAIN}/0jlOuEe.jpeg`,
  "https://files.royaltransfereu.com/assets/XL-Minivan.jpg": `${BACKUP_IMAGE_DOMAIN}/0jlOuEe.jpeg`,
  "https://files.royaltransfereu.com/assets/VIP-Minivan.jpg": `${BACKUP_IMAGE_DOMAIN}/0jlOuEe.jpeg`,
  "https://files.royaltransfereu.com/assets/Sprinter-8.jpg": `${BACKUP_IMAGE_DOMAIN}/IZqo3474.jpg`,
  "https://files.royaltransfereu.com/assets/Sprinter-16.jpg": `${BACKUP_IMAGE_DOMAIN}/IZqo3474.jpg`,
  "https://files.royaltransfereu.com/assets/Sprinter-21.jpg": `${BACKUP_IMAGE_DOMAIN}/IZqo3474.jpg`,
  "https://files.royaltransfereu.com/assets/Bus-51.jpg": `${BACKUP_IMAGE_DOMAIN}/IZqo3474.jpg`,
  
  // City images
  "https://files.royaltransfereu.com/assets/rome327.webp": `${BACKUP_IMAGE_DOMAIN}/CFL9494.webp`,
  "https://files.royaltransfereu.com/assets/rome1280png.png": `${BACKUP_IMAGE_DOMAIN}/lTA7682.jpg`,
  "https://files.royaltransfereu.com/assets/paris136.webp": `${BACKUP_IMAGE_DOMAIN}/sLs3440.webp`,
  "https://files.royaltransfereu.com/assets/paris1280png.png": `${BACKUP_IMAGE_DOMAIN}/IdwC2475.jpg`,
  "https://files.royaltransfereu.com/assets/barc255.webp": `${BACKUP_IMAGE_DOMAIN}/iqAp5725.webp`,
  "https://files.royaltransfereu.com/assets/barca1280png.png": `${BACKUP_IMAGE_DOMAIN}/IZqo3474.jpg`,
  "https://files.royaltransfereu.com/assets/milano250.webp": `${BACKUP_IMAGE_DOMAIN}/ZqBO3169.webp`,
  "https://files.royaltransfereu.com/assets/milano1280png.png": `${BACKUP_IMAGE_DOMAIN}/rLX6532.jpeg`,
  
  // Payment logos
  "https://files.royaltransfereu.com/assets/Visa.png": `${BACKUP_IMAGE_DOMAIN}/cbqV7Pf.png`,
  "https://files.royaltransfereu.com/assets/Mastercard-logo.svg": `${BACKUP_IMAGE_DOMAIN}/X4LwdPQ.png`,
  "https://files.royaltransfereu.com/assets/Google_Pay_Logo.png": `${BACKUP_IMAGE_DOMAIN}/PCTrbwf.png`,
  "https://files.royaltransfereu.com/assets/applepay.png": `${BACKUP_IMAGE_DOMAIN}/Nx8h4vk.png`,
  "https://files.royaltransfereu.com/assets/American_Express_logo.png": `${BACKUP_IMAGE_DOMAIN}/NL7bD8d.png`,
  "https://files.royaltransfereu.com/assets/Stripe_Logo.png": `${BACKUP_IMAGE_DOMAIN}/1JL4TFb.png`,
  
  // Additional images
  "https://files.royaltransfereu.com/assets/about-hero.webp": `${BACKUP_IMAGE_DOMAIN}/sLs3440.webp`,
  "https://files.royaltransfereu.com/assets/services-hero.webp": `${BACKUP_IMAGE_DOMAIN}/BUpN7Wn.jpeg`
};

/**
 * Get fallback URL for an image if available
 * @param originalUrl The original image URL
 * @returns The fallback URL or the original if no fallback exists
 */
export const getFallbackImageUrl = (originalUrl: string): string => {
  // Try to return a configured fallback
  const fallback = fallbackImageMap[originalUrl];
  if (fallback) return fallback;
  
  // If it's from the old domain, try to transform to the new one
  if (originalUrl.includes('files.royaltransfereu.com')) {
    return getPrimaryDomainUrl(originalUrl);
  }
  
  // Return the original if no fallback found
  return originalUrl;
};

/**
 * Alternative CDN domains to try
 * Adding the new Netlify domain as the primary one
 */
const cdnDomains = [
  "melodious-panda-7ef225.netlify.app",
  "files.royaltransfereu.com",
  "i.imgur.com",
  "i.ibb.co"
];

/**
 * Create a URL that uses a different CDN domain
 * @param url The original URL
 * @returns Modified URL using a different domain, or original if not applicable
 */
const getAlternateCdnUrl = (url: string): string | null => {
  // Skip if it's already using the primary domain
  if (url.startsWith(PRIMARY_IMAGE_DOMAIN)) return null;
  
  // Try to transform old domain URLs to the primary domain
  if (url.includes('files.royaltransfereu.com')) {
    return getPrimaryDomainUrl(url);
  }
  
  // For other domains, use the backup
  for (const domain of cdnDomains) {
    if (url.includes(domain)) {
      // Found a matching domain, replace with primary
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        return `${PRIMARY_IMAGE_DOMAIN}${path}`;
      } catch (e) {
        // URL parsing failed, return original
        return null;
      }
    }
  }
  
  return null;
};

/**
 * Checks if an image is from the primary CDN
 * @param url The URL to check
 * @returns Boolean indicating if it's a CDN image
 */
const isPrimaryCdnImage = (url: string): boolean => {
  return url.includes(PRIMARY_IMAGE_DOMAIN);
};

/**
 * Get WebP version of an image URL
 * @param url The original image URL
 * @returns WebP version of the URL
 */
const getWebpUrl = (url: string): string => {
  // Only convert certain file formats
  if (url.match(/\.(jpe?g|png)$/i)) {
    return url.replace(/\.\w+$/, '.webp');
  }
  return url;
};

/**
 * Generates a complete strategy for loading an image with fallbacks
 * @param originalUrl The original image URL
 * @returns Array of URLs to try in sequence
 */
const generateImageUrlStrategy = (originalUrl: string): string[] => {
  const urls = [];
  
  // First try the primary domain version
  if (originalUrl.includes('files.royaltransfereu.com')) {
    urls.push(getPrimaryDomainUrl(originalUrl));
  } else {
    urls.push(originalUrl);
  }
  
  // Add WebP version if it's a convertible format
  if (originalUrl.match(/\.(jpe?g|png)$/i)) {
    urls.push(getWebpUrl(urls[0]));
  }
  
  // Add original URL as fallback if we transformed it
  if (urls[0] !== originalUrl) {
    urls.push(originalUrl);
  }
  
  // Add cache buster version
  urls.push(`${urls[0]}?cb=${Date.now()}`);
  
  // Add fallback URL if available
  const fallbackUrl = getFallbackImageUrl(originalUrl);
  if (fallbackUrl !== urls[0] && fallbackUrl !== originalUrl) {
    urls.push(fallbackUrl);
  }
  
  return [...new Set(urls)]; // Remove any duplicates
};

