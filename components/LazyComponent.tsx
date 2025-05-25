import React, { useState, useRef, useEffect } from 'react';

interface LazyComponentProps {
  children: React.ReactNode;
  height?: string | number;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

/**
 * A component that renders its children only when they scroll into view
 */
const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  height = '200px',
  placeholder,
  rootMargin = '200px',
  threshold = 0.1
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver !== 'function') {
      setIsVisible(true); // Fallback if IntersectionObserver not available
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    
    observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [rootMargin, threshold]);
  
  const minHeight = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <div 
      ref={ref} 
      className="relative"
      style={{ minHeight: isVisible ? 'auto' : minHeight }}
    >
      {isVisible ? (
        children
      ) : (
        placeholder || (
          <div 
            className="w-full h-full bg-gray-100 animate-pulse rounded"
            style={{ minHeight }}
          />
        )
      )}
    </div>
  );
};

export default LazyComponent;