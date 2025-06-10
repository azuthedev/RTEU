import React, { useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: React.ReactNode;
}

/**
 * OptimizedImage component that supports WebP format and proper lazy loading
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  onLoad,
  onError,
  placeholder
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px'
  });
  
  // Generate WebP version URL if not already WebP
  const getWebpUrl = (url: string): string | undefined => {
    if (!url) return undefined;
    if (url.endsWith('.webp')) return url;
    
    // Only convert jpg/jpeg/png to webp
    if (url.match(/\.(jpe?g|png)$/i)) {
      return url.replace(/\.\w+$/, '.webp');
    }
    
    return undefined;
  };
  
  const webpSrc = getWebpUrl(src);
  
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };
  
  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };
  
  // Render placeholder or loading state when not in view
  if (!inView && loading === 'lazy') {
    return (
      <div 
        ref={ref}
        className={className}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          background: '#f3f4f6'
        }}
        role="img"
        aria-label={alt}
      >
        {placeholder}
      </div>
    );
  }
  
  // Handle error state
  if (hasError) {
    return (
      <div 
        className={className}
        style={{
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '0.875rem'
        }}
        role="img"
        aria-label={alt}
      >
        {alt.substring(0, 1).toUpperCase()}
      </div>
    );
  }
  
  return (
    <picture ref={ref}>
      {webpSrc && (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transition: 'opacity 0.3s ease'
        }}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority as any}
        onLoad={handleLoad}
        onError={handleError}
      />
      {!isLoaded && (
        <div 
          className={`absolute inset-0 bg-gray-200 ${className}`}
          style={{
            width: width ? `${width}px` : '100%',
            height: height ? `${height}px` : '100%'
          }}
        />
      )}
    </picture>
  );
};

export default OptimizedImage;