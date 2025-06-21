import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, ArrowLeft, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';
import { Helmet } from 'react-helmet-async';

const NotFound = () => {
  const { t, isLoading } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // If translations are still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t('meta.title', '404 - Page Not Found | Royal Transfer EU')}</title>
        <meta 
          name="description" 
          content={t('meta.description', 'The page you are looking for does not exist. Find your way back to our website.')} 
        />
      </Helmet>
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-4">{t('title', 'Page Not Found')}</h2>
            <p className="text-gray-600 mb-8">
              {t('message', "Oops! The page you're looking for doesn't exist or has been moved.")}
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder', 'Search our website...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </form>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Link
                to="/"
                className="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Home className="w-5 h-5 mr-2" />
                <span>{t('backToHome', 'Back to Homepage')}</span>
              </Link>
              <Link
                to="/contact"
                className="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>{t('contactSupport', 'Contact Support')}</span>
              </Link>
            </div>

            {/* Popular Links */}
            <div className="text-left">
              <h3 className="text-lg font-semibold mb-4">{t('popularPages', 'Popular Pages:')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/services" className="text-blue-600 hover:text-blue-700">
                    {t('nav.services', 'Our Services')}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-blue-600 hover:text-blue-700">
                    {t('nav.about', 'About Us')}
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-blue-600 hover:text-blue-700">
                    {t('nav.faqs', 'FAQ')}
                  </Link>
                </li>
                <li>
                  <Link to="/blogs/destinations" className="text-blue-600 hover:text-blue-700">
                    {t('nav.destinations', 'Popular Destinations')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;