import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';

interface Destination {
  city: string;
  imageUrl: string;
}

const destinations: Record<string, Destination> = {
  rome: {
    city: 'Rome',
    imageUrl: 'https://wallpapercat.com/w/full/0/7/b/293465-1920x1080-desktop-1080p-rome-background.jpg'
  },
  paris: {
    city: 'Paris',
    imageUrl: 'https://wallpapercat.com/w/full/b/f/3/30528-3840x2160-desktop-4k-eiffel-tower-background-image.jpg'
  },
  barcelona: {
    city: 'Barcelona',
    imageUrl: 'https://wallpapers.com/images/hd/barcelona-1920-x-1080-picture-y19qwj8its708dty.jpg'
  },
  milan: {
    city: 'Milan',
    imageUrl: 'https://img.travelnaut.com/web/db/photose/location/eu/it/milan/28ed6358c8d39fb9ad74d343877d94f8.jpeg'
  }
};

const BlogPost = () => {
  const { city } = useParams<{ city: string }>();
  const destination = destinations[city?.toLowerCase() ?? ''];

  if (!destination) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold text-center">Destination Not Found</h1>
          </div>
        </main>
        <Sitemap />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-video rounded-lg overflow-hidden mb-8">
            <img
              src={destination.imageUrl}
              alt={destination.city}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold text-center">{destination.city}</h1>
        </div>
      </main>
      <Sitemap />
    </div>
  );
};

export default BlogPost;