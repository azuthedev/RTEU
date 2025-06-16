import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Home, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';

const NotFound = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
            <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search our website..."
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
                <span>Back to Homepage</span>
              </Link>
              <Link
                to="/contact"
                className="flex items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span>Contact Support</span>
              </Link>
            </div>

            {/* Popular Links */}
            <div className="text-left">
              <h3 className="text-lg font-semibold mb-4">Popular Pages:</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/services" className="text-blue-600 hover:text-blue-700">
                    Our Services
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-blue-600 hover:text-blue-700">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-blue-600 hover:text-blue-700">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/blogs/destinations" className="text-blue-600 hover:text-blue-700">
                    Popular Destinations
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