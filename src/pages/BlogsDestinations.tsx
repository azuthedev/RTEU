import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';

interface DestinationPost {
  id: string;
  title: string;
  summary: string;
  images: {
    webp: string;
    fallback: string;
  };
  location: string;
}

const destinationPosts: DestinationPost[] = [
  {
    id: '1',
    title: 'Exploring Rome: The Eternal City',
    summary: 'Discover the magic of Rome with our comprehensive guide to the city\'s most iconic landmarks and hidden gems.',
    images: {
      webp: 'https://i.imghippo.com/files/CFL9494KWE.webp',
      fallback: 'https://i.imghippo.com/files/lTA7682kU.jpg'
    },
    location: 'Rome, Italy'
  },
  {
    id: '2',
    title: 'Paris: City of Light and Love',
    summary: 'Experience the romance and charm of Paris through its architecture, cuisine, and cultural attractions.',
    images: {
      webp: 'https://i.imghippo.com/files/sLs3440odc.webp',
      fallback: 'https://i.imghippo.com/files/IdwC2475VOg.jpg'
    },
    location: 'Paris, France'
  },
  {
    id: '3',
    title: 'Barcelona: Mediterranean Jewel',
    summary: 'From Gaudi\'s masterpieces to vibrant street life, explore the best of Barcelona.',
    images: {
      webp: 'https://i.imghippo.com/files/iqAp5725KnQ.webp',
      fallback: 'https://i.imghippo.com/files/IZqo3474CDQ.jpg'
    },
    location: 'Barcelona, Spain'
  },
  {
    id: '4',
    title: 'Milan: Fashion & Culture Capital',
    summary: 'Dive into the sophisticated world of Milan, where fashion meets historical grandeur.',
    images: {
      webp: 'https://i.imghippo.com/files/ZqBO3169ko.webp',
      fallback: 'https://i.imghippo.com/files/rLX6532WHE.jpeg'
    },
    location: 'Milan, Italy'
  }
];

const BlogsDestinations = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = destinationPosts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Popular Destinations</h1>
            <p className="text-lg text-gray-600">
              Explore our curated guides to Europe's most beautiful cities
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto mb-12">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Destination Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => (
              <motion.a
                key={post.id}
                href={`/blogs/${post.location.split(',')[0].toLowerCase()}`}
                className="group block"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-4">
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                  <picture>
                    <source srcSet={post.images.webp} type="image/webp" />
                    <img
                      src={post.images.fallback}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </picture>
                </div>
                <div className="text-sm text-blue-600 mb-2">{post.location}</div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-600">{post.summary}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </main>

    </div>
  );
};

export default BlogsDestinations;