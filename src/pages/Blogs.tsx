import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Top 10 Hidden Gems in Rome',
    summary: 'Discover the secret spots and local favorites in the Eternal City.',
    imageUrl: 'https://wallpapercat.com/w/full/0/7/b/293465-1920x1080-desktop-1080p-rome-background.jpg',
    category: 'Travel Tips'
  },
  {
    id: '2',
    title: 'A Weekend in Paris',
    summary: 'Make the most of your short stay in the City of Light.',
    imageUrl: 'https://wallpapercat.com/w/full/b/f/3/30528-3840x2160-desktop-4k-eiffel-tower-background-image.jpg',
    category: 'Travel Tips'
  },
  {
    id: '3',
    title: 'Barcelona: A Local\'s Guide',
    summary: 'Experience Barcelona like a true local with our comprehensive guide.',
    imageUrl: 'https://wallpapers.com/images/hd/barcelona-1920-x-1080-picture-y19qwj8its708dty.jpg',
    category: 'Local Guides'
  },
  {
    id: '4',
    title: 'Milan Fashion Week Guide',
    summary: 'Navigate the fashion capital during its most exciting time.',
    imageUrl: 'https://img.travelnaut.com/web/db/photose/location/eu/it/milan/28ed6358c8d39fb9ad74d343877d94f8.jpeg',
    category: 'Events'
  },
  {
    id: '5',
    title: 'Best Restaurants in Rome',
    summary: 'From traditional trattorias to modern fine dining experiences.',
    imageUrl: 'https://i.imgur.com/DxQsDc9.jpeg',
    category: 'Food & Dining'
  }
];

const Blogs = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Array.from(new Set(blogPosts.map(post => post.category)));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Royal Transfer EU Blog</h1>
            <p className="text-lg text-gray-600">
              Travel tips, local guides, and insider knowledge for your next adventure
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto mb-12">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search blog posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Blog Posts by Category */}
          <div className="space-y-12">
            {categories.map(category => {
              const categoryPosts = filteredPosts.filter(post => post.category === category);
              if (categoryPosts.length === 0) return null;

              return (
                <div key={category}>
                  <h2 className="text-2xl font-bold mb-6">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categoryPosts.map(post => (
                      <motion.a
                        key={post.id}
                        href={`/blogs/${post.title.toLowerCase().replace(/\s+/g, '-')}`}
                        className="group block"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-4">
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-600">{post.summary}</p>
                      </motion.a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Sitemap />
    </div>
  );
};

export default Blogs;