import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

interface LazyImageProps {
  src: string;
  webpSrc?: string;
  fallbackSrc?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderColor?: string;
  loadingStrategy?: 'lazy' | 'eager' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
  blurEffect?: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  webpSrc,
  fallbackSrc,
  alt,
  width,
  height,
  className = '',
  placeholderColor = '#f1f5f9', // slate-100 by default
  loadingStrategy = 'lazy',
  onLoad,
  onError,
  blurEffect = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;
  
  // Use Intersection Observer to detect when the image is in view
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px', // Start loading when image is 200px away from viewport
    threshold: 0.01
  });
  
  // Initialize image source based on loading strategy
  const shouldImmediatelyLoad = loadingStrategy === 'eager' || loadingStrategy === 'auto';
  const [imageSrc, setImageSrc] = useState(shouldImmediatelyLoad ? src : '');
  
  // Set the image source when it comes into view (if lazy loading)
  useEffect(() => {
    if (inView && !imageSrc && !isLoaded && !isError) {
      setImageSrc(src);
    }
  }, [inView, src, imageSrc, isLoaded, isError]);
  
  // Handle image load and error events
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    setIsError(true);
    
    // Try to retry loading the image a few times
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      
      // Wait a bit before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      
      setTimeout(() => {
        setIsError(false);
        
        // Try the fallback if available
        if (fallbackSrc && imageRef.current) {
          imageRef.current.src = fallbackSrc;
        } else {
          // Retry with the same source but add a cache buster
          const cacheBuster = `?retry=${retryCount}_${new Date().getTime()}`;
          if (imageRef.current) {
            imageRef.current.src = `${src}${cacheBuster}`;
          }
        }
      }, delay);
    } else if (fallbackSrc && imageRef.current) {
      // Try fallback as last resort
      imageRef.current.src = fallbackSrc;
    }
    
    onError?.();
  };
  
  // Aspect ratio styling
  const aspectRatioStyle = (width && height) ? {
    aspectRatio: `${width}/${height}`,
  } : {};
  
  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ 
        backgroundColor: placeholderColor,
        ...aspectRatioStyle
      }}
    >
      {webpSrc ? (
        <picture>
          <source srcSet={inView ? webpSrc : ''} type="image/webp" />
          <img
            ref={imageRef}
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading={loadingStrategy === 'lazy' ? 'lazy' : undefined}
            onLoad={handleLoad}
            onError={handleError}
            className={`transition-all duration-500 ${
              isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
            } w-full h-full object-cover`}
            decoding="async"
            fetchPriority={loadingStrategy === 'eager' ? 'high' : 'auto'}
          />
        </picture>
      ) : (
        <img
          ref={imageRef}
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loadingStrategy === 'lazy' ? 'lazy' : undefined}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-all duration-500 ${
            isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
          } w-full h-full object-cover`}
          decoding="async"
          fetchPriority={loadingStrategy === 'eager' ? 'high' : 'auto'}
        />
      )}
      
      {/* Placeholder / Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

export default LazyImage;