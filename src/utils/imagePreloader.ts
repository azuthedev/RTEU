/**
 * Utility for preloading images to ensure faster rendering
 * and graceful fallbacks when primary images fail to load
 */

import { getFallbackImageUrl } from './imageFallbacks';

type ImagePreloadStatus = {
  loaded: boolean;
  failed: boolean;
  fallbackLoaded: boolean;
};

// Map to track the loading status of all images
const imageStatuses = new Map<string, ImagePreloadStatus>();

// Cache of fully loaded images (URL -> img element)
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Preload critical images in the background
 * @param urls Array of image URLs to preload
 * @param options Configuration options
 */
const preloadImages = (
  urls: string[],
  options: {
    useFallbacks?: boolean;
    onProgress?: (loaded: number, total: number) => void;
    onComplete?: () => void;
    cacheImages?: boolean;
    timeout?: number;
    priority?: 'high' | 'low' | 'auto';
  } = {}
) => {
  const { 
    useFallbacks = true, 
    onProgress, 
    onComplete, 
    cacheImages = true,
    timeout = 10000,
    priority = 'auto'
  } = options;
  
  // For tracking progress
  let loadedCount = 0;
  const totalToLoad = useFallbacks ? urls.length * 2 : urls.length;
  
  // Create a unique list of all URLs to preload (primary + fallbacks)
  const uniqueUrls = [...new Set(urls)];
  const allUrls = useFallbacks
    ? [...uniqueUrls, ...uniqueUrls.map(getFallbackImageUrl)]
    : uniqueUrls;
  
  // Filter out duplicates and already loaded images
  const urlsToLoad = [...new Set(allUrls)].filter(url => {
    const status = imageStatuses.get(url);
    return !status || (!status.loaded && !status.fallbackLoaded);
  });

  if (urlsToLoad.length === 0) {
    // All images already loaded
    if (onComplete) {
      onComplete();
    }
    return {
      getProgress: () => ({ loaded: totalToLoad, total: totalToLoad }),
      isComplete: () => true,
    };
  }

  // Start preloading all images
  urlsToLoad.forEach(url => {
    // Skip if already loaded, but still count toward progress
    if (imageStatuses.has(url)) {
      const status = imageStatuses.get(url)!;
      if (status.loaded || status.fallbackLoaded) {
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalToLoad);
        }
        if (loadedCount === urlsToLoad.length && onComplete) {
          onComplete();
        }
        return;
      }
    } else {
      imageStatuses.set(url, { loaded: false, failed: false, fallbackLoaded: false });
    }

    const img = new Image();
    
    // Set fetchpriority if supported
    if (priority !== 'auto') {
      img.setAttribute('fetchpriority', priority);
    }
    
    // Set a timeout to prevent hanging on slow connections
    const timeoutId = setTimeout(() => {
      if (!imageStatuses.get(url)?.loaded) {
        img.src = ''; // Cancel the request
        
        const status = imageStatuses.get(url) || { loaded: false, failed: false, fallbackLoaded: false };
        imageStatuses.set(url, { ...status, failed: true });
        
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalToLoad);
        }
        
        if (loadedCount === urlsToLoad.length && onComplete) {
          onComplete();
        }
      }
    }, timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      
      const status = imageStatuses.get(url) || { loaded: false, failed: false, fallbackLoaded: false };
      imageStatuses.set(url, { ...status, loaded: true });
      
      if (cacheImages) {
        imageCache.set(url, img);
      }
      
      loadedCount++;
      if (onProgress) {
        onProgress(loadedCount, totalToLoad);
      }
      
      if (loadedCount === urlsToLoad.length && onComplete) {
        onComplete();
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      
      const status = imageStatuses.get(url) || { loaded: false, failed: false, fallbackLoaded: false };
      imageStatuses.set(url, { ...status, failed: true });
      
      // If this was a primary URL and it failed, try the fallback
      if (urls.includes(url) && useFallbacks) {
        const fallbackUrl = getFallbackImageUrl(url);
        
        // Only try the fallback if it's different from the original
        if (fallbackUrl !== url) {
          const fallbackImg = new Image();
          
          // Set fetchpriority if supported
          if (priority !== 'auto') {
            fallbackImg.setAttribute('fetchpriority', priority);
          }
          
          // Set timeout for fallback image as well
          const fallbackTimeoutId = setTimeout(() => {
            if (!imageStatuses.get(url)?.fallbackLoaded) {
              fallbackImg.src = ''; // Cancel the request
              
              loadedCount++;
              if (onProgress) {
                onProgress(loadedCount, totalToLoad);
              }
              
              if (loadedCount === urlsToLoad.length && onComplete) {
                onComplete();
              }
            }
          }, timeout);
          
          fallbackImg.onload = () => {
            clearTimeout(fallbackTimeoutId);
            
            const status = imageStatuses.get(url) || { loaded: false, failed: true, fallbackLoaded: false };
            imageStatuses.set(url, { ...status, fallbackLoaded: true });
            
            if (cacheImages) {
              imageCache.set(url, fallbackImg); // Cache the fallback
              imageCache.set(fallbackUrl, fallbackImg); // Also cache under fallback URL
            }
            
            loadedCount++;
            if (onProgress) {
              onProgress(loadedCount, totalToLoad);
            }
            
            if (loadedCount === urlsToLoad.length && onComplete) {
              onComplete();
            }
          };
          
          fallbackImg.onerror = () => {
            clearTimeout(fallbackTimeoutId);
            
            loadedCount++;
            if (onProgress) {
              onProgress(loadedCount, totalToLoad);
            }
            
            if (loadedCount === urlsToLoad.length && onComplete) {
              onComplete();
            }
          };
          
          fallbackImg.src = fallbackUrl;
        } else {
          // If no different fallback, just count as loaded
          loadedCount++;
          if (onProgress) {
            onProgress(loadedCount, totalToLoad);
          }
          
          if (loadedCount === urlsToLoad.length && onComplete) {
            onComplete();
          }
        }
      } else {
        // No fallback option, just count as loaded
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalToLoad);
        }
        
        if (loadedCount === urlsToLoad.length && onComplete) {
          onComplete();
        }
      }
    };
    
    // Start loading the image
    img.src = url;
  });

  // Return a status object that can be used to check the loading progress
  return {
    getProgress: () => ({ loaded: loadedCount, total: urlsToLoad.length }),
    isComplete: () => loadedCount === urlsToLoad.length,
  };
};

/**
 * Check if a specific image has been preloaded successfully
 * @param url Image URL to check
 * @returns Boolean indicating if the image is ready
 */
const isImagePreloaded = (url: string): boolean => {
  const status = imageStatuses.get(url);
  
  if (!status) return false;
  
  return status.loaded || status.fallbackLoaded;
};

/**
 * Get a cached image if available
 * @param url The URL of the image
 * @returns The cached image element or null if not cached
 */
const getCachedImage = (url: string): HTMLImageElement | null => {
  return imageCache.get(url) || null;
};

/**
 * Clear the image cache to free up memory
 * @param urls Optional list of specific URLs to clear, or clear all if not specified
 */
const clearImageCache = (urls?: string[]): void => {
  if (urls) {
    urls.forEach(url => {
      imageCache.delete(url);
    });
  } else {
    imageCache.clear();
  }
};

/**
 * Preload route-specific images based on the current route
 * @param route The current route path
 */
export const preloadImagesForRoute = (route: string): void => {
  const routeMap: Record<string, string[]> = {
    // Home page critical images
    '/': [
      'https://files.royaltransfer.eu/assets/rt-logo-black-950-500.webp',
      'https://files.royaltransfer.eu/assets/newherotest.webp',
      'https://files.royaltransfer.eu/assets/mobileherotest.webp',
      // Add payment icons
      'https://files.royaltransfer.eu/assets/Visa.png',
      'https://files.royaltransfer.eu/assets/Mastercard-logo.svg',
      'https://files.royaltransfer.eu/assets/Google_Pay_Logo.png'
    ],
    
    // Booking flow images
    '/transfer': [
      'https://files.royaltransfer.eu/assets/Standard-Sedan.jpg',
      'https://files.royaltransfer.eu/assets/Premium-Sedan.jpg',
      'https://files.royaltransfer.eu/assets/VIP-Sedan.jpg',
      'https://files.royaltransfer.eu/assets/Standard-Minivan.jpg'
    ],
    
    // About page
    '/about': [
      'https://files.royaltransfer.eu/assets/about-hero.webp'
    ],
    
    // Services page
    '/services': [
      'https://files.royaltransfer.eu/assets/services-hero.webp'
    ],
    
    // Blogs page
    '/blogs': [
      'https://files.royaltransfer.eu/assets/rome327.webp',
      'https://files.royaltransfer.eu/assets/paris136.webp',
      'https://files.royaltransfer.eu/assets/barc255.webp',
      'https://files.royaltransfer.eu/assets/milano250.webp'
    ]
  };

  // Find matching route (exact or starts with)
  const exactRoute = routeMap[route];
  if (exactRoute) {
    preloadImages(exactRoute, { priority: 'high' });
    return;
  }

  // Try prefix matching
  for (const [key, urls] of Object.entries(routeMap)) {
    if (route.startsWith(key + '/')) {
      preloadImages(urls, { priority: route === '/' ? 'high' : 'auto' });
      return;
    }
  }
  
  // Default - no specific preloads
};

// Export a default object for module usage
