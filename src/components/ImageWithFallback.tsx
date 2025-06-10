import React, { useState, useEffect, useRef } from 'react';
import { getFallbackImageUrl } from '../utils/imageFallbacks';
import { useInView } from 'react-intersection-observer';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Component that attempts to load an image with automatic fallback
 */
const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority = 'auto'
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;
  
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px' // Start loading when image is 200px from viewport
  });
  
  useEffect(() => {
    // Reset states when src prop changes
    setImgSrc(src);
    setHasError(false);
    setRetryCount(0);
    setIsLoaded(false);
  }, [src]);

  // Create a WebP version of the source if it's not already WebP
  const getWebpUrl = (url: string): string => {
    if (url.endsWith('.webp')) return url;
    
    if (url.match(/\.(jpe?g|png)$/i)) {
      return url.replace(/\.\w+$/, '.webp');
    }
    
    return url;
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (retryCount < maxRetries) {
      // First retry: Try adding cache buster
      setRetryCount(prev => prev + 1);
      
      // Choose different retry strategies based on retry count
      if (retryCount === 0) {
        // First try a WebP version if not already
        const webpUrl = getWebpUrl(src);
        if (webpUrl !== src) {
          setImgSrc(webpUrl);
          return;
        } else {
          // If already WebP or conversion not applicable, add cache buster
          setImgSrc(`${src}?cb=${Date.now()}`);
        }
      } else if (retryCount === 1) {
        // Second try: use fallback URL
        const fallbackUrl = getFallbackImageUrl(src);
        if (fallbackUrl !== src) {
          setImgSrc(fallbackUrl);
        } else {
          // If no fallback available, try with cache buster
          setImgSrc(`${src}?cb=${Date.now()}&retry=true`);
        }
      } else {
        // Third try: fallback with cache buster
        const fallbackUrl = getFallbackImageUrl(src);
        if (fallbackUrl !== src) {
          setImgSrc(`${fallbackUrl}?cb=${Date.now()}`);
        } else {
          // Give up
          setHasError(true);
        }
      }
    } else {
      // All retries failed
      setHasError(true);
    }
  };

  return (
    <div 
      ref={ref}
      className={`relative ${className}`}
      style={{width, height}}
    >
      {hasError ? (
        // Final fallback - show a colored div with first letter of alt text
        <div 
          className={`flex items-center justify-center bg-gray-200 w-full h-full`}
          role="img"
          aria-label={alt}
        >
          <span className="text-gray-500 text-2xl font-bold">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={inView || loading === 'eager' ? imgSrc : ''}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          fetchPriority={fetchPriority}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transition: 'opacity 0.3s ease',
            width: width ? `${width}px` : '100%',
            height: height ? `${height}px` : '100%'
          }}
        />
      )}
      
      {/* Show loading placeholder until image is loaded but with less aggressive animation */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200" />
      )}
    </div>
  );
};

export default ImageWithFallback;