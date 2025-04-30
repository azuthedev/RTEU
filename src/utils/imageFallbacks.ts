/**
 * Utility to help with image loading issues by providing fallback URLs
 */

// Map of original URLs to fallback URLs
const fallbackImageMap: Record<string, string> = {
  // Logo fallbacks
  "https://files.royaltransfer.eu/assets/rt-logo-black-950-500.webp": "https://i.imgur.com/cDgm3025.webp",
  "https://files.royaltransfer.eu/assets/rt-logo-black-950-500.png": "https://i.imgur.com/mijH1834.png",
  
  // Hero image fallbacks
  "https://files.royaltransfer.eu/assets/newherotest.webp": "https://i.imgur.com/ZKj2573.webp",
  "https://files.royaltransfer.eu/assets/newherotest.png": "https://i.imgur.com/Axi3104.png",
  "https://files.royaltransfer.eu/assets/mobileherotest.webp": "https://i.imgur.com/ohfj7576.webp",
  "https://files.royaltransfer.eu/assets/mobileherotest.png": "https://i.imgur.com/lTA7682.png",
  
  // Vehicle images
  "https://files.royaltransfer.eu/assets/Standard-Sedan.jpg": "https://i.imgur.com/BUpN7Wn.jpeg",
  "https://files.royaltransfer.eu/assets/Premium-Sedan.jpg": "https://i.imgur.com/BUpN7Wn.jpeg",
  "https://files.royaltransfer.eu/assets/VIP-Sedan.jpg": "https://i.imgur.com/DKdfE4r.jpeg",
  "https://files.royaltransfer.eu/assets/Standard-Minivan.jpg": "https://i.imgur.com/0jlOuEe.jpeg",
  "https://files.royaltransfer.eu/assets/XL-Minivan.jpg": "https://i.imgur.com/0jlOuEe.jpeg",
  "https://files.royaltransfer.eu/assets/VIP-Minivan.jpg": "https://i.imgur.com/0jlOuEe.jpeg",
  "https://files.royaltransfer.eu/assets/Sprinter-8.jpg": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/Sprinter-16.jpg": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/Sprinter-21.jpg": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/Bus-51.jpg": "https://i.imgur.com/IZqo3474.jpg",
  
  // City images
  "https://files.royaltransfer.eu/assets/rome327.webp": "https://i.imgur.com/CFL9494.webp",
  "https://files.royaltransfer.eu/assets/rome1280png.png": "https://i.imgur.com/lTA7682.jpg",
  "https://files.royaltransfer.eu/assets/paris136.webp": "https://i.imgur.com/sLs3440.webp",
  "https://files.royaltransfer.eu/assets/paris1280png.png": "https://i.imgur.com/IdwC2475.jpg",
  "https://files.royaltransfer.eu/assets/barc255.webp": "https://i.imgur.com/iqAp5725.webp",
  "https://files.royaltransfer.eu/assets/barca1280png.png": "https://i.imgur.com/IZqo3474.jpg",
  "https://files.royaltransfer.eu/assets/milano250.webp": "https://i.imgur.com/ZqBO3169.webp",
  "https://files.royaltransfer.eu/assets/milano1280png.png": "https://i.imgur.com/rLX6532.jpeg",
  
  // Payment logos
  "https://files.royaltransfer.eu/assets/Visa.png": "https://i.ibb.co/cbqV7Pf/visa.png",
  "https://files.royaltransfer.eu/assets/Mastercard-logo.svg": "https://i.ibb.co/X4LwdPQ/mastercard.png",
  "https://files.royaltransfer.eu/assets/Google_Pay_Logo.png": "https://i.ibb.co/PCTrbwf/googlepay.png",
  "https://files.royaltransfer.eu/assets/applepay.png": "https://i.ibb.co/Nx8h4vk/applepay.png",
  "https://files.royaltransfer.eu/assets/American_Express_logo.png": "https://i.ibb.co/NL7bD8d/amex.png",
  "https://files.royaltransfer.eu/assets/Stripe_Logo.png": "https://i.ibb.co/1JL4TFb/stripe.png",
  
  // Additional images
  "https://files.royaltransfer.eu/assets/about-hero.webp": "https://i.imgur.com/sLs3440.webp",
  "https://files.royaltransfer.eu/assets/services-hero.webp": "https://i.imgur.com/BUpN7Wn.jpeg"
};

// Alternative CDN domains to try
const cdnDomains = [
  "files.royaltransfer.eu",
  "files2.royaltransfer.eu", // Hypothetical secondary domain
  "cdn.royaltransfer.eu", // Hypothetical CDN domain
  "static.royaltransfer.eu" // Hypothetical static assets domain
];

/**
 * Get fallback URL for an image if available
 * @param originalUrl The original image URL
 * @returns The fallback URL or the original if no fallback exists
 */
export const getFallbackImageUrl = (originalUrl: string): string => {
  return fallbackImageMap[originalUrl] || originalUrl;
};

/**
 * Create a URL that uses a different CDN domain
 * @param url The original URL
 * @returns Modified URL using a different domain, or original if not applicable
 */
export const getAlternateCdnUrl = (url: string): string | null => {
  // Check if URL is from one of our known domains
  const mainDomain = cdnDomains[0];
  if (!url.includes(mainDomain)) {
    return null;
  }
  
  // Select a random alternate domain
  const alternates = cdnDomains.slice(1);
  if (alternates.length === 0) {
    return null;
  }
  
  const randomDomain = alternates[Math.floor(Math.random() * alternates.length)];
  return url.replace(mainDomain, randomDomain);
};

/**
 * Checks if an image is from the primary CDN
 * @param url The URL to check
 * @returns Boolean indicating if it's a CDN image
 */
export const isPrimaryCdnImage = (url: string): boolean => {
  return url.includes(cdnDomains[0]);
};

/**
 * Get WebP version of an image URL
 * @param url The original image URL
 * @returns WebP version of the URL
 */
export const getWebpUrl = (url: string): string => {
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
export const generateImageUrlStrategy = (originalUrl: string): string[] => {
  const urls = [originalUrl];
  
  // Add WebP version if it's a convertible format
  if (originalUrl.match(/\.(jpe?g|png)$/i)) {
    urls.push(getWebpUrl(originalUrl));
  }
  
  // Add cache buster version
  urls.push(`${originalUrl}?cb=${Date.now()}`);
  
  // Add fallback URL if available
  const fallbackUrl = getFallbackImageUrl(originalUrl);
  if (fallbackUrl !== originalUrl) {
    urls.push(fallbackUrl);
  }
  
  // Add alternate CDN domain if applicable
  const alternateCdnUrl = getAlternateCdnUrl(originalUrl);
  if (alternateCdnUrl) {
    urls.push(alternateCdnUrl);
  }
  
  return [...new Set(urls)]; // Remove any duplicates
};

export default {
  getFallbackImageUrl,
  getAlternateCdnUrl,
  isPrimaryCdnImage,
  getWebpUrl,
  generateImageUrlStrategy
};