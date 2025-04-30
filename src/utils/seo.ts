/**
 * SEO utilities for managing meta tags and structured data
 */

/**
 * Updates the page title and meta tags for SEO
 * @param title Page title
 * @param description Meta description
 * @param path Current path (for canonical URL)
 * @param imageUrl Open Graph image URL (optional)
 */
export const updateMetaTags = (
  title: string,
  description: string,
  path: string,
  imageUrl?: string
): void => {
  // Update document title
  document.title = title;
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
  
  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (ogDescription) ogDescription.setAttribute('content', description);
  
  const baseUrl = 'https://royaltransfer.eu';
  const fullUrl = `${baseUrl}${path}`;
  
  if (ogUrl) ogUrl.setAttribute('content', fullUrl);
  if (ogImage && imageUrl) ogImage.setAttribute('content', imageUrl);
  
  // Update Twitter tags
  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  const twitterDescription = document.querySelector('meta[property="twitter:description"]');
  const twitterUrl = document.querySelector('meta[property="twitter:url"]');
  const twitterImage = document.querySelector('meta[property="twitter:image"]');
  
  if (twitterTitle) twitterTitle.setAttribute('content', title);
  if (twitterDescription) twitterDescription.setAttribute('content', description);
  if (twitterUrl) twitterUrl.setAttribute('content', fullUrl);
  if (twitterImage && imageUrl) twitterImage.setAttribute('content', imageUrl);
  
  // Update canonical URL
  let canonicalUrl = document.querySelector('link[rel="canonical"]');
  if (!canonicalUrl) {
    canonicalUrl = document.createElement('link');
    canonicalUrl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalUrl);
  }
  canonicalUrl.setAttribute('href', fullUrl);
};

/**
 * Gets default SEO content for a specific route
 * @param path Current path
 * @returns Object with title and description
 */
export const getDefaultSeoContent = (path: string): { title: string, description: string } => {
  const baseTitle = 'Royal Transfer EU';
  
  // Default values
  let title = `${baseTitle} | Premium Airport Transfers & Taxi in Italy`;
  let description = 'Professional airport transfers and taxi services across Italy with 15+ years of experience. Safe, reliable travel with English-speaking drivers.';
  
  // Path-specific values
  if (path.startsWith('/about')) {
    title = `About Us | ${baseTitle}`;
    description = 'Learn about Royal Transfer EU\'s 15+ years of experience providing premium airport transfers and taxi services across Italy.';
  } else if (path.startsWith('/services')) {
    title = `Our Services | ${baseTitle}`;
    description = 'Explore our range of transfer services including airport pickups, taxi services, and minivan rentals for groups and families.';
  } else if (path.startsWith('/blogs/destinations')) {
    title = `Popular Destinations | ${baseTitle}`;
    description = 'Discover travel guides for popular destinations in Italy including Rome, Milan, Florence and more.';
  } else if (path.startsWith('/blogs')) {
    title = `Travel Blog | ${baseTitle}`;
    description = 'Read our travel tips, local guides, and insider knowledge for your next Italian adventure.';
  } else if (path.startsWith('/faq')) {
    title = `Frequently Asked Questions | ${baseTitle}`;
    description = 'Find answers to common questions about our airport transfers, booking process, cancellation policy, and more.';
  } else if (path.startsWith('/transfer')) {
    title = `Book Your Transfer | ${baseTitle}`;
    description = 'Book your premium airport transfer or taxi service in Italy. Simple online booking with instant confirmation.';
  } else if (path.startsWith('/booking-success')) {
    title = `Booking Confirmed | ${baseTitle}`;
    description = 'Your transfer booking has been confirmed. Thank you for choosing Royal Transfer EU.';
  }
  
  return { title, description };
};

/**
 * Adds JSON-LD structured data to the document head
 * @param type Schema.org type (e.g., 'Product', 'Service')
 * @param data Structured data object
 */
export const addStructuredData = (type: string, data: Record<string, any>): void => {
  // Remove any existing structured data of the same type
  const existingScripts = document.querySelectorAll(`script[data-type="${type}"]`);
  existingScripts.forEach(script => script.remove());
  
  // Create the structured data script
  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-type', type);
  
  // Add the context and type to the data
  const fullData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  };
  
  script.textContent = JSON.stringify(fullData);
  document.head.appendChild(script);
};

/**
 * Adds breadcrumb structured data based on the current path
 * @param path Current path
 */
export const addBreadcrumbData = (path: string): void => {
  const baseUrl = 'https://royaltransfer.eu';
  const pathSegments = path.split('/').filter(Boolean);
  
  // No breadcrumbs needed for homepage
  if (pathSegments.length === 0) return;
  
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      'position': 1,
      'name': 'Home',
      'item': baseUrl
    }
  ];
  
  let currentUrl = baseUrl;
  
  // Add items for each path segment
  pathSegments.forEach((segment, index) => {
    currentUrl += `/${segment}`;
    
    // Format segment name (replace hyphens with spaces, capitalize)
    const name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': index + 2, // +2 because we already have the home item at position 1
      'name': name,
      'item': currentUrl
    });
  });
  
  // Add the breadcrumb structured data
  addStructuredData('BreadcrumbList', {
    'itemListElement': breadcrumbItems
  });
};