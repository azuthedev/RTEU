import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  webp?: string;
  avif?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  sizes?: string;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  webp,
  avif,
  loading = 'lazy',
  fetchPriority = 'auto',
  decoding = 'async',
  sizes,
  onError,
}) => {
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Try loading from a different domain if the original fails
    // This helps if files.royaltransfer.eu is having issues
    const currentSrc = e.currentTarget.src;
    
    if (currentSrc.includes('files.royaltransfer.eu') && !currentSrc.includes('retry=true')) {
      // Replace with same filename but from imgur or imgbb if available
      // For now we'll just add a retry flag to prevent infinite loops
      e.currentTarget.src = `${currentSrc}?retry=true`;
    }
    
    // Call the onError callback if provided
    if (onError) {
      onError();
    }
  };

  // If we have multiple formats, use a picture element
  if (webp || avif) {
    return (
      <picture>
        {avif && <source srcSet={avif} type="image/avif" sizes={sizes} />}
        {webp && <source srcSet={webp} type="image/webp" sizes={sizes} />}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding={decoding}
          sizes={sizes}
          onError={handleImgError}
        />
      </picture>
    );
  }

  // Otherwise use a simple img element
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      sizes={sizes}
      onError={handleImgError}
    />
  );
};

export default OptimizedImage;