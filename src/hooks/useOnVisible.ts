import { useState, useEffect, useRef } from 'react';

interface UseOnVisibleOptions {
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

/**
 * Hook to detect when an element becomes visible in viewport
 */
export function useOnVisible<T extends Element>(
  options: UseOnVisibleOptions = {}
): [React.RefObject<T>, boolean] {
  const { 
    rootMargin = '0px',
    threshold = 0.1,
    triggerOnce = true
  } = options;
  
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);
  const hasTriggered = useRef(false);
  
  useEffect(() => {
    // If browser doesn't support IntersectionObserver, always set visible
    if (!('IntersectionObserver' in window) || hasTriggered.current) {
      setIsVisible(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          if (triggerOnce) {
            hasTriggered.current = true;
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { rootMargin, threshold }
    );
    
    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce]);
  
  return [ref, isVisible];
}