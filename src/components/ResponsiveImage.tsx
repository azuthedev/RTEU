import React from 'react';
import { useInView } from 'react-intersection-observer';
import useImageLoader from '../hooks/useImageLoader';
import { getFallbackImageUrl, getWebpUrl } from '../utils/imageFallbacks';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  aspectRatio?: string;
  style?: React.CSSProperties;
  bgColor?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholderColor?: string;
  blur?: boolean;
  fadeIn?: boolean;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  sizes = '100vw',
  className = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto',
  aspectRatio,
  style = {},
  bgColor = '#f3f4f6', // gray-100
  objectFit = 'cover',
  placeholderColor = '#e5e7eb', // gray-200
  blur = true,
  fadeIn = true
}) => {
  // Use intersection observer to determine when the image is in view
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px' // Start loading when 200px from viewport
  });
  
  // Use the image loader hook
  const { src: currentSrc, status, isLoaded } = useImageLoader({
    src: src,
    fallbackSrc: getFallbackImageUrl(src),
    retryCount: 2,
    retryDelay: 800
  });

  // Create WebP source if applicable
  const webpSrc = getWebpUrl(src);
  const fallbackWebpSrc = getWebpUrl(getFallbackImageUrl(src));
  
  // Determine aspect ratio CSS
  const aspectRatioStyle = aspectRatio ? { aspectRatio } : {};
  
  // Construct full style object
  const containerStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    position: 'relative',
    overflow: 'hidden',
    ...aspectRatioStyle,
    ...style
  };
  
  // Create transition styles
  const imgStyle: React.CSSProperties = {
    objectFit,
    width: '100%',
    height: '100%',
    transition: fadeIn ? 'opacity 0.5s ease-in-out' : 'none',
    opacity: isLoaded ? 1 : 0
  };
  
  // Create placeholder style
  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: placeholderColor,
    display: isLoaded ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: blur && !isLoaded ? 'blur(8px)' : 'none',
    transition: 'opacity 0.3s ease'
  };
  
  return (
    <div 
      ref={ref}
      className={`responsive-image-container ${className}`}
      style={containerStyle}
    >
      {/* Placeholder */}
      <div style={placeholderStyle}>
        <div className={`w-8 h-8 rounded-full bg-gray-300 ${isLoaded ? '' : 'animate-pulse'}`}></div>
      </div>
      
      {/* Actual Image with picture element for WebP support */}
      {(inView || loading === 'eager') && (
        <picture>
          {webpSrc !== src && (
            <source srcSet={webpSrc} type="image/webp" />
          )}
          {fallbackWebpSrc !== getFallbackImageUrl(src) && (
            <source srcSet={fallbackWebpSrc} type="image/webp" />
          )}
          <img
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            fetchPriority={fetchPriority}
            sizes={sizes}
            style={imgStyle}
          />
        </picture>
      )}
    </div>
  );
};

export default ResponsiveImage;