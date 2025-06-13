import React, { useState, useEffect, Suspense } from 'react';
import { useOnVisible } from '../hooks/useOnVisible';

interface DeferredComponentProps {
  children: React.ReactNode;
  height?: string | number;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  delay?: number;
}

/**
 * Component that defers rendering of its children until it's visible
 * and optionally adds an additional delay
 */
const DeferredComponent: React.FC<DeferredComponentProps> = ({
  children,
  height = '200px',
  placeholder,
  rootMargin = '200px',
  threshold = 0.1,
  delay = 0
}) => {
  const [ref, isInView] = useOnVisible<HTMLDivElement>({ 
    rootMargin, 
    threshold, 
    triggerOnce: true 
  });
  const [shouldRender, setShouldRender] = useState(false);
  
  useEffect(() => {
    if (isInView) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          setShouldRender(true);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        setShouldRender(true);
      }
    }
  }, [isInView, delay]);
  
  // Set the minimum height until component is rendered
  const minHeight = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <div 
      ref={ref} 
      className="relative"
      style={{ 
        minHeight: shouldRender ? undefined : minHeight
      }}
    >
      {shouldRender ? (
        <Suspense fallback={placeholder || <div className="w-full h-full bg-gray-100 animate-pulse rounded" />}>
          {children}
        </Suspense>
      ) : placeholder || (
        <div 
          className="w-full h-full bg-gray-100 animate-pulse rounded"
          style={{ minHeight }}
        />
      )}
    </div>
  );
};

export default DeferredComponent;