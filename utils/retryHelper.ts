/**
 * Retry utility with exponential backoff
 */

type RetryCallback<T> = () => Promise<T>;
type OnRetryCallback = (attempt: number, error: any, delay: number) => void;

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
  onRetry?: OnRetryCallback;
  retryableErrors?: (string | RegExp)[] | ((error: any) => boolean);
  shouldRetry?: (error: any, attempt: number) => boolean;
}

// Default options
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry' | 'retryableErrors'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  timeout: 30000,
};

/**
 * Executes an async function with retry logic and exponential backoff
 * 
 * @param callback The function to retry
 * @param options Retry configuration
 * @returns The result of the callback
 */
export const withRetry = async <T>(
  callback: RetryCallback<T>, 
  options: RetryOptions = {}
): Promise<T> => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const {
    maxRetries,
    initialDelay,
    maxDelay,
    backoffFactor,
    timeout,
    onRetry,
    retryableErrors,
    shouldRetry
  } = mergedOptions;
  
  let attempt = 0;
  
  // Default shouldRetry implementation
  const defaultShouldRetry = (error: any, currentAttempt: number): boolean => {
    if (currentAttempt >= maxRetries) {
      return false;
    }
    
    // Check against retryableErrors if provided
    if (retryableErrors) {
      // If retryableErrors is a function, use it directly
      if (typeof retryableErrors === 'function') {
        return retryableErrors(error);
      }
      
      // Otherwise, check if error message matches any pattern in retryableErrors
      const errorMessage = error?.message || String(error);
      return retryableErrors.some(pattern => {
        if (typeof pattern === 'string') {
          return errorMessage.includes(pattern);
        }
        return pattern.test(errorMessage);
      });
    }
    
    // By default, retry on network or server errors
    if (error.name === 'TypeError' || error.name === 'NetworkError') {
      return true;
    }
    
    // For HTTP errors, retry on 5xx and specific 4xx codes
    if (error.status) {
      return error.status >= 500 || [408, 429].includes(error.status);
    }
    
    return true;
  };
  
  // Use provided shouldRetry function or fall back to default
  const shouldRetryFn = shouldRetry || defaultShouldRetry;
  
  while (true) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      });
      
      // Race the callback with the timeout
      return await Promise.race([
        callback(),
        timeoutPromise
      ]);
    } catch (error) {
      attempt++;
      
      // Check if we should retry
      if (!shouldRetryFn(error, attempt)) {
        throw error;
      }
      
      // Calculate the delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      
      // Add some jitter to prevent all retries happening simultaneously
      const jitter = Math.random() * 200 - 100; // ±100ms jitter
      const finalDelay = Math.floor(delay + jitter);
      
      // Call the onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, error, finalDelay);
      }
      
      // Wait for the delay
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
};