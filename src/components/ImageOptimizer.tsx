import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { getFallbackImageUrl } from '../utils/imageFallbacks';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  placeholder?: string | boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  blurEffect?: boolean;
  useWebp?: boolean;
  rootMargin?: string;
  threshold?: number;
  aspectRatio?: string;
  style?: React.CSSProperties;
}

const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
  sizes,
  placeholder = true,
  fallbackSrc,
  onLoad,
  onError,
  blurEffect = true,
  useWebp = true,
  rootMargin = '200px',
  threshold = 0.01,
  aspectRatio,
  style = {},
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(loading === 'eager' ? src : null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;

  // Safeguard against double loading or re-entry
  const attemptedUrls = useRef<Set<string>>(new Set());

  // Create a webp version of the source URL if supported
  const getWebpUrl = (url: string): string => {
    if (!useWebp) return url;
    
    // Only try to convert certain file formats
    if (url.match(/\.(jpe?g|png)$/i)) {
      const webpUrl = url.replace(/\.\w+$/, '.webp');
      return webpUrl;
    }
    return url;
  };
  
  // Get the appropriate fallback URL, either explicitly provided or from the mapping
  const getFallback = (): string | null => {
    if (fallbackSrc) return fallbackSrc;
    
    const mappedFallback = getFallbackImageUrl(src);
    return mappedFallback !== src ? mappedFallback : null;
  };
  
  // Use Intersection Observer to trigger loading when visible
  const { ref: inViewRef, inView } = useInView({
    rootMargin,
    threshold,
    triggerOnce: true
  });

  // Set up the ref combining both inView and the img element
  const setRefs = (node: HTMLDivElement | null) => {
    inViewRef(node);
  };

  // Start loading when in view if using lazy loading
  useEffect(() => {
    if (!imgSrc && inView && !hasError) {
      setImgSrc(src);
    }
  }, [inView, src, imgSrc, hasError]);

  // Update source if prop changes
  useEffect(() => {
    if (loading === 'eager') {
      setImgSrc(src);
      setHasError(false);
      setRetryCount(0);
      attemptedUrls.current.clear();
      attemptedUrls.current.add(src);
    }
  }, [src, loading]);

  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    // Avoid multiple retries with the same URL
    const currentSrc = imgRef.current?.src || '';
    if (attemptedUrls.current.has(currentSrc)) {
      return;
    }
    attemptedUrls.current.add(currentSrc);

    if (retryCount < maxRetries) {
      setRetryCount(prevCount => prevCount + 1);
      
      // Determine the next URL to try
      let nextSrc = null;
      
      // First retry: Try the webp version if not already attempted
      if (retryCount === 0 && useWebp && !currentSrc.includes('.webp')) {
        const webpUrl = getWebpUrl(src);
        if (webpUrl !== src && !attemptedUrls.current.has(webpUrl)) {
          nextSrc = webpUrl;
        }
      }
      
      // Second retry: Try a cache-busting URL
      if ((retryCount === 1 || !nextSrc) && !currentSrc.includes('cb=')) {
        nextSrc = `${src}?cb=${Date.now()}`;
      }
      
      // Final retry: Try the fallback URL
      if ((retryCount === 2 || !nextSrc)) {
        const fallbackUrl = getFallback();
        if (fallbackUrl && !attemptedUrls.current.has(fallbackUrl)) {
          nextSrc = fallbackUrl;
        }
      }
      
      // If we have a new URL to try, set it after a short delay
      if (nextSrc) {
        setTimeout(() => {
          setImgSrc(nextSrc);
        }, 500 * Math.pow(2, retryCount)); // Exponential backoff
      } else {
        setHasError(true);
        if (onError) onError();
      }
    } else {
      setHasError(true);
      if (onError) onError();
    }
  };

  // Generate combined style with aspect ratio if provided
  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio } : {}),
  };

  return (
    <div 
      ref={setRefs} 
      className={`image-optimizer-container ${className}`}
      style={combinedStyle}
      role={hasError ? 'img' : undefined}
      aria-label={hasError ? alt : undefined}
    >
      {/* Placeholder/Error UI */}
      {(isLoading || hasError) && (
        <div 
          className={`w-full h-full flex items-center justify-center bg-gray-200 ${blurEffect && isLoading ? 'blur-sm animate-pulse' : ''}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {hasError ? (
            <div className="text-gray-500 p-4 text-center">
              <span className="block text-2xl mb-2">📷</span>
              <span className="text-sm">{alt.split(' ')[0]}</span>
            </div>
          ) : placeholder === true ? (
            <div className="w-full h-full bg-gray-300 animate-pulse" />
          ) : typeof placeholder === 'string' ? (
            <div className="w-full h-full bg-gray-300 animate-pulse flex items-center justify-center">
              <span className="text-gray-500">{placeholder}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Actual image */}
      {imgSrc && (
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          fetchPriority={fetchPriority}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style
          }}
          aria-hidden={hasError}
        />
      )}
    </div>
  );
};

export default ImageOptimizer;