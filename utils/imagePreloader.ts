/**
 * Utility for preloading images to ensure faster rendering
 */

type PreloadPriority = 'high' | 'low' | 'auto';

interface PreloadOptions {
  priority?: PreloadPriority;
  timeout?: number;
}

// Map to track preloaded image status
const preloadedImages = new Map<string, boolean>();

/**
 * Preload a single image
 */
export const preloadImage = (
  src: string, 
  options: PreloadOptions = {}
): Promise<boolean> => {
  const { priority = 'auto', timeout = 8000 } = options;
  
  // Skip if already preloaded
  if (preloadedImages.has(src)) {
    return Promise.resolve(preloadedImages.get(src) as boolean);
  }
  
  return new Promise((resolve) => {
    // Create timeout to avoid hanging
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, timeout);
    
    const img = new Image();
    
    if (priority !== 'auto') {
      // @ts-ignore - fetchpriority attribute may not be recognized by TypeScript yet
      img.fetchPriority = priority;
    }
    
    img.onload = () => {
      clearTimeout(timeoutId);
      preloadedImages.set(src, true);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      preloadedImages.set(src, false);
      resolve(false);
    };
    
    img.src = src;
  });
};

/**
 * Preload multiple images
 */
export const preloadImages = (
  urls: string[], 
  options: PreloadOptions & { concurrency?: number } = {}
): Promise<boolean[]> => {
  const { concurrency = 4, ...imgOptions } = options;
  
  // Process in batches to avoid overwhelming the browser
  const batchPromises: Promise<boolean[]>[] = [];
  
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    
    batchPromises.push(
      Promise.all(
        batch.map(url => preloadImage(url, imgOptions))
      )
    );
  }
  
  return Promise.all(batchPromises).then(results => results.flat());
};

/**
 * Preload route-specific images based on the current route
 */
export const preloadImagesForRoute = (route: string): void => {
  const routeMap: Record<string, string[]> = {
    // Home page critical images
    '/': [
      'https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp',
      'https://files.royaltransfereu.com/assets/newherotest.webp',
      'https://files.royaltransfereu.com/assets/mobileherotest.webp',
    ],
    
    // Booking flow images
    '/transfer': [
      'https://files.royaltransfereu.com/assets/Standard-Sedan.jpg',
      'https://files.royaltransfereu.com/assets/Premium-Sedan.jpg',
      'https://files.royaltransfereu.com/assets/VIP-Sedan.jpg',
    ],
    
    // About page
    '/about': [
      'https://files.royaltransfereu.com/assets/about-hero.webp',
    ],
    
    // Services page
    '/services': [
      'https://files.royaltransfereu.com/assets/services-hero.webp',
    ],
    
    // Blogs page
    '/blogs': [
      'https://files.royaltransfereu.com/assets/rome327.webp',
      'https://files.royaltransfereu.com/assets/paris136.webp',
      'https://files.royaltransfereu.com/assets/barc255.webp',
      'https://files.royaltransfereu.com/assets/milano250.webp'
    ]
  };

  // Find matching route
  const exactRoute = routeMap[route];
  if (exactRoute) {
    preloadImages(exactRoute, { 
      priority: route === '/' ? 'high' : 'auto' 
    });
    return;
  }

  // Try prefix matching
  for (const [key, urls] of Object.entries(routeMap)) {
    if (route.startsWith(key + '/')) {
      preloadImages(urls, { priority: 'auto' });
      return;
    }
  }
};