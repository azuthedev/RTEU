import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';
import { updateMetaTags } from '../utils/seo';
import OptimizedImage from '../components/OptimizedImage';

const BlogPosts = [
  {
    id: 'rome',
    title: 'Rome Travel Guide: A Comprehensive Itinerary',
    slug: 'rome',
    excerpt: 'Discover the Eternal City with our expert Rome travel guide, featuring essential tips for transportation, major attractions, and hidden gems.',
    image: 'https://files.royaltransfereu.com/assets/rome327.webp',
    imageAlt: 'Historic view of the Roman Colosseum with blue sky',
    date: '2025-02-15',
    readTime: 8,
    category: 'Travel Guide',
    featured: true
  },
  {
    id: 'venice',
    title: 'Venice: Navigating the Floating City',
    slug: 'venice',
    excerpt: 'Plan your perfect Venice getaway with insider tips on gondola rides, water taxis, and the most efficient ways to explore the canals.',
    image: 'https://files.royaltransfereu.com/assets/paris136.webp',
    imageAlt: 'Beautiful view of Venice canals with gondolas',
    date: '2025-01-18',
    readTime: 6,
    category: 'Transportation',
    featured: true
  },
  {
    id: 'florence',
    title: 'Florence: Renaissance Art and Modern Travel',
    slug: 'florence',
    excerpt: 'From the Uffizi Gallery to Ponte Vecchio, navigate Florence\'s artistic wonders while enjoying seamless transportation options.',
    image: 'https://files.royaltransfereu.com/assets/barc255.webp',
    imageAlt: 'Panoramic view of Florence with the Duomo cathedral',
    date: '2024-12-10',
    readTime: 7,
    category: 'Cultural Experience',
    featured: false
  },
  {
    id: 'milan',
    title: 'Milan: Fashion, Business, and Efficient Transit',
    slug: 'milan',
    excerpt: 'Explore Italy\'s business capital with our comprehensive guide to Milan's transportation network, fashion districts, and cultural landmarks.',
    image: 'https://files.royaltransfereu.com/assets/milano250.webp',
    imageAlt: 'Milan Cathedral (Duomo di Milano) and square',
    date: '2024-11-22',
    readTime: 5,
    category: 'City Guide',
    featured: false
  }
];

const Blogs = () => {
  const location = useLocation();
  const { t } = useLanguage();
  
  useEffect(() => {
    updateMetaTags(
      t('meta.title', 'Travel Blog | Royal Transfer EU'),
      t('meta.description', 'Explore Italy travel guides, transportation tips, and destination insights to help plan your perfect trip.'),
      location.pathname
    );
  }, [location.pathname, t]);

  // Extract featured blogs
  const featuredBlogs = BlogPosts.filter(post => post.featured);
  const regularBlogs = BlogPosts.filter(post => !post.featured);

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', 'Travel Blog | Royal Transfer EU')}</title>
        <meta name="description" content={t('meta.description', 'Explore Italy travel guides, transportation tips, and destination insights to help plan your perfect trip.')} />
      </Helmet>
      
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pb-24 bg-blue-600">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800 to-blue-600 opacity-90"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            className="text-4xl md:text-5xl text-white font-bold mb-4 font-serif"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {t('hero.title', 'Travel Guides & Insights')}
          </motion.h1>
          <motion.p
            className="text-xl text-white/90 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {t('hero.subtitle', 'Explore our collection of travel tips, destination guides, and transportation advice for your Italian adventure')}
          </motion.p>
        </div>
      </section>

      <main className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured Posts Section */}
          {featuredBlogs.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-8 text-center font-serif">
                {t('featured.title', 'Featured Articles')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {featuredBlogs.map((post, index) => (
                  <motion.div
                    key={post.id}
                    className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Link to={`/blogs/${post.slug}`} className="block">
                      <div className="relative h-60">
                        <OptimizedImage
                          src={post.image}
                          alt={post.imageAlt}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                          <span className="text-white/80 text-sm mb-2">{post.category}</span>
                          <h3 className="text-white text-xl font-bold">{post.title}</h3>
                          <div className="flex items-center text-white/80 text-sm mt-2">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{post.readTime} {t('blog.minuteRead', 'min read')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <p className="text-gray-600 mb-4">{post.excerpt}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-600 font-medium flex items-center hover:text-blue-800 transition-colors">
                            {t('blog.readMore', 'Read More')}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </span>
                          <span className="text-gray-500 text-sm">{new Date(post.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Regular Posts Section */}
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center font-serif">
              {t('latest.title', 'Latest Articles')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {regularBlogs.length > 0 ? (
                regularBlogs.map((post, index) => (
                  <motion.div
                    key={post.id}
                    className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  >
                    <Link to={`/blogs/${post.slug}`} className="block">
                      <div className="relative h-48">
                        <OptimizedImage
                          src={post.image}
                          alt={post.imageAlt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-blue-600 text-sm font-medium">{post.category}</span>
                          <span className="text-gray-500 text-sm">{new Date(post.date).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-lg font-bold mb-2 line-clamp-2">{post.title}</h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{post.readTime} {t('blog.minuteRead', 'min read')}</span>
                          </div>
                          <span className="text-blue-600 text-sm font-medium flex items-center hover:text-blue-800 transition-colors">
                            {t('blog.readMore', 'Read More')}
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-3 flex justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
                    <p className="text-lg text-gray-600">{t('blog.loading', 'Loading blog posts...')}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Categories Section */}
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-8 text-center font-serif">
              {t('categories.title', 'Browse by Category')}
            </h2>
            
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {(t('categories.items', [], { returnObjects: true }) as any[]).map((category, index) => (
                <Link 
                  key={index} 
                  to={`/blogs?category=${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </Link>
              ))}
            </motion.div>
          </section>
          
          {/* Newsletter Signup Section */}
          <section className="mt-16 bg-blue-600 rounded-xl p-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-3 text-white font-serif">
                {t('newsletter.title', 'Subscribe to Our Travel Newsletter')}
              </h2>
              <p className="text-white/90 mb-6">
                {t('newsletter.description', 'Get the latest travel tips, destination guides, and exclusive offers delivered straight to your inbox.')}
              </p>
              
              <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder={t('newsletter.emailPlaceholder', 'Your email address')}
                  className="flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                />
                <button
                  type="submit"
                  className="bg-white text-blue-600 font-semibold px-6 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {t('newsletter.button', 'Subscribe')}
                </button>
              </form>
              <p className="text-white/80 text-xs mt-4">
                {t('newsletter.privacyNote', 'By subscribing, you agree to our Privacy Policy. You can unsubscribe at any time.')}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Blogs;