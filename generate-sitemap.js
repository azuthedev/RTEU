import fs from 'fs';

// List of all site URLs
const urls = [
  {
    url: 'https://royaltransfer.eu/',
    lastMod: '2025-05-01',
    changeFreq: 'weekly',
    priority: '1.0'
  },
  {
    url: 'https://royaltransfer.eu/about',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.8'
  },
  {
    url: 'https://royaltransfer.eu/services',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.8'
  },
  {
    url: 'https://royaltransfer.eu/blogs/destinations',
    lastMod: '2025-05-01',
    changeFreq: 'weekly',
    priority: '0.8'
  },
  {
    url: 'https://royaltransfer.eu/faq',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.7'
  },
  {
    url: 'https://royaltransfer.eu/partners',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.6'
  },
  {
    url: 'https://royaltransfer.eu/contact',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.8'
  },
  {
    url: 'https://royaltransfer.eu/blogs',
    lastMod: '2025-05-01',
    changeFreq: 'weekly',
    priority: '0.7'
  },
  {
    url: 'https://royaltransfer.eu/blogs/rome',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.6'
  },
  {
    url: 'https://royaltransfer.eu/blogs/milan',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.6'
  },
  {
    url: 'https://royaltransfer.eu/blogs/florence',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.6'
  },
  {
    url: 'https://royaltransfer.eu/blogs/venice',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.6'
  },
  {
    url: 'https://royaltransfer.eu/privacy',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.5'
  },
  {
    url: 'https://royaltransfer.eu/cookie-policy',
    lastMod: '2025-05-01',
    changeFreq: 'monthly',
    priority: '0.5'
  }
];

// Generate XML
const generateSitemap = () => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  urls.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${page.url}</loc>\n`;
    xml += `    <lastmod>${page.lastMod}</lastmod>\n`;
    xml += `    <changefreq>${page.changeFreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  xml += '</urlset>';
  
  return xml;
};

// Write to file
const sitemap = generateSitemap();
fs.writeFileSync('./public/sitemap.xml', sitemap);

console.log('Sitemap generated successfully!');