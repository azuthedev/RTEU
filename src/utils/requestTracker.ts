/**
 * Utility for tracking and managing API requests
 * Provides request timing, cancellation, and performance monitoring
 */

import { trackEvent } from './analyticsTracker';

interface RequestMetadata {
  id: string;
  url: string;
  method: string;
  startTime: number;
  stage: 'preparing' | 'geocoding' | 'network' | 'processing' | 'complete' | 'failed' | 'cancelled';
  controller?: AbortController;
  timeout?: NodeJS.Timeout;
  geocodingTime?: number;
  networkTime?: number;
  processingTime?: number;
  totalTime?: number;
  status?: number;
  error?: string;
  retryCount?: number;
  correlationId?: string;
  timestamp: number;
}

class RequestTracker {
  // Use a Map with a limited size to conserve memory
  private requests = new Map<string, RequestMetadata>();
  private DEBUG_MODE = process.env.NODE_ENV === 'development' || localStorage.getItem('DEBUG_API_CALLS') === 'true';
  private MAX_CACHE_SIZE = 10; // Store only the last 10 requests
  
  // Track the last request time for each request type to implement cooldown
  private lastRequestTimes = new Map<string, number>();
  private requestCooldowns = new Map<string, number>();
  
  constructor() {
    // Initialize standard cooldown periods (in milliseconds)
    this.requestCooldowns.set('fetch-prices', 2000);  // 2 second cooldown for price fetching
    this.requestCooldowns.set('geocoding', 1000);     // 1 second cooldown for geocoding
    this.requestCooldowns.set('default', 500);        // 500ms default cooldown
  }

  /**
   * Start tracking a new request
   * @returns Object with requestId and AbortSignal
   */
  startRequest(requestType: string, method: string = 'GET'): { 
    requestId: string, 
    signal: AbortSignal,
    cooldownRemaining: number
  } {
    // Check cooldown period
    const cooldown = this.requestCooldowns.get(requestType) || this.requestCooldowns.get('default') || 0;
    const lastRequestTime = this.lastRequestTimes.get(requestType) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // If we're in cooldown period, return info with remaining cooldown time
    if (timeSinceLastRequest < cooldown) {
      const cooldownRemaining = cooldown - timeSinceLastRequest;
      
      // Find any existing active request of this type
      let existingRequestId: string | null = null;
      for (const [id, request] of this.requests.entries()) {
        if (request.url.includes(requestType) && 
            (request.stage === 'preparing' || 
             request.stage === 'geocoding' || 
             request.stage === 'network' || 
             request.stage === 'processing')) {
          existingRequestId = id;
          break;
        }
      }
      
      // If we have an existing request, return its controller
      if (existingRequestId) {
        const existingRequest = this.requests.get(existingRequestId)!;
        const controller = existingRequest.controller || new AbortController();
        
        if (this.DEBUG_MODE) {
          console.warn(`🚫 Request for ${requestType} blocked by cooldown. Previous request still active. Reusing request ID: ${existingRequestId}`);
        }
        
        return { 
          requestId: existingRequestId, 
          signal: controller.signal, 
          cooldownRemaining 
        };
      }
      
      // Otherwise create a throwaway controller just for the signal
      const controller = new AbortController();
      
      if (this.DEBUG_MODE) {
        console.warn(`🚫 Request for ${requestType} blocked by cooldown. Cooldown remaining: ${cooldownRemaining}ms`);
      }
      
      // Use a fake ID for the cooldown case
      const cooldownId = `cooldown_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return { requestId: cooldownId, signal: controller.signal, cooldownRemaining };
    }
    
    // Update the last request time for this type
    this.lastRequestTimes.set(requestType, now);
    
    // Normal request starting logic
    const id = `req_${requestType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const controller = new AbortController();
    
    // Create request metadata
    const request: RequestMetadata = {
      id,
      url: requestType,
      method,
      startTime: performance.now(),
      stage: 'preparing',
      controller,
      timestamp: now
    };
    
    // Set a timeout of 30 seconds
    request.timeout = setTimeout(() => {
      this.abortRequest(id, 'Request timed out after 30 seconds');
    }, 30000);
    
    // Prune cache if needed
    this.pruneCache();
    
    // Store the request
    this.requests.set(id, request);
    
    if (this.DEBUG_MODE) {
      console.log(`🚀 [API] Request started: ${method} ${requestType} [${id}]`);
    }
    
    return { requestId: id, signal: controller.signal, cooldownRemaining: 0 };
  }

  /**
   * Update the stage of a request
   */
  updateStage(id: string, stage: RequestMetadata['stage'], data?: Partial<RequestMetadata>): void {
    const request = this.requests.get(id);
    if (!request) return;
    
    const now = performance.now();
    const elapsed = now - request.startTime;
    
    // Update request metadata
    request.stage = stage;
    
    // Compute timing metrics based on stage transitions
    if (stage === 'geocoding') {
      // Starting geocoding
    } else if (stage === 'network') {
      // Finished geocoding, starting network request
      request.geocodingTime = elapsed;
    } else if (stage === 'processing') {
      // Finished network request, starting processing
      request.networkTime = elapsed - (request.geocodingTime || 0);
    } else if (stage === 'complete' || stage === 'failed' || stage === 'cancelled') {
      // Request completed or failed
      request.totalTime = elapsed;
      request.processingTime = elapsed - (request.networkTime || 0) - (request.geocodingTime || 0);
      
      // Clear timeout
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      
      // Log performance metrics
      if (this.DEBUG_MODE) {
        console.log(`${stage === 'complete' ? '✅' : stage === 'cancelled' ? '⚠️' : '❌'} [API] Request ${stage}: ${request.method} ${request.url} [${id}]`);
        console.log(`⏱️ [API] Performance metrics for [${id}]:`);
        console.log(`   - Total time: ${request.totalTime.toFixed(2)}ms`);
        if (request.geocodingTime) console.log(`   - Geocoding: ${request.geocodingTime.toFixed(2)}ms`);
        if (request.networkTime) console.log(`   - Network: ${request.networkTime.toFixed(2)}ms`);
        if (request.processingTime) console.log(`   - Processing: ${request.processingTime.toFixed(2)}ms`);
        
        if (stage === 'failed' && request.error) {
          console.error(`❌ [API] Error: ${request.error}`);
        }
      }
      
      // Track performance in analytics
      if (stage === 'complete') {
        trackEvent('API Performance', 'Request Complete', request.url, Math.round(request.totalTime));
      } else if (stage === 'failed') {
        trackEvent('API Performance', 'Request Failed', `${request.url} - ${request.error || 'Unknown error'}`, Math.round(request.totalTime), true);
      } else if (stage === 'cancelled') {
        trackEvent('API Performance', 'Request Cancelled', `${request.url}`, Math.round(request.totalTime), true);
      }
      
      // Update the request timestamp to ensure it's seen as fresh
      request.timestamp = Date.now();
    }
    
    // Update with additional data
    if (data) {
      Object.assign(request, data);
    }
  }

  /**
   * Abort a request
   */
  abortRequest(id: string, reason: string = 'Request aborted'): void {
    const request = this.requests.get(id);
    if (!request) return;
    
    if (this.DEBUG_MODE) {
      console.warn(`⚠️ [API] Aborting request: ${request.method} ${request.url} [${id}] - Reason: ${reason}`);
    }
    
    // Abort the fetch request
    if (request.controller) {
      request.controller.abort(reason);
    }
    
    // Clear timeout
    if (request.timeout) {
      clearTimeout(request.timeout);
    }
    
    // Mark as failed
    this.updateStage(id, 'cancelled', { error: reason });
    
    // Track abandonment
    trackEvent('User Behavior', 'Request Abandoned', `${request.url} - ${reason}`, Math.round(performance.now() - request.startTime), true);
    
    // Update the request timestamp
    request.timestamp = Date.now();
  }

  /**
   * Get the signal for a request
   */
  getSignal(id: string): AbortSignal | undefined {
    return this.requests.get(id)?.controller?.signal;
  }
  
  /**
   * Check if a request of a specific type is in progress
   */
  isRequestInProgress(requestType: string): boolean {
    for (const [_, request] of this.requests.entries()) {
      if (request.url.includes(requestType) && 
          (request.stage === 'preparing' || 
           request.stage === 'geocoding' || 
           request.stage === 'network' || 
           request.stage === 'processing')) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get the cooldown period for a request type
   */
  getCooldownPeriod(requestType: string): number {
    return this.requestCooldowns.get(requestType) || 
           this.requestCooldowns.get('default') || 
           0;
  }
  
  /**
   * Check if a request type is in cooldown
   */
  isInCooldown(requestType: string): { inCooldown: boolean, remainingTime: number } {
    const cooldown = this.requestCooldowns.get(requestType) || this.requestCooldowns.get('default') || 0;
    const lastRequestTime = this.lastRequestTimes.get(requestType) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < cooldown) {
      return { 
        inCooldown: true, 
        remainingTime: cooldown - timeSinceLastRequest 
      };
    }
    
    return { inCooldown: false, remainingTime: 0 };
  }
  
  /**
   * Set a custom cooldown period for a request type
   */
  setCooldownPeriod(requestType: string, cooldownMs: number): void {
    this.requestCooldowns.set(requestType, cooldownMs);
  }

  /**
   * Get performance metrics for a request
   */
  getMetrics(id: string): Pick<RequestMetadata, 'geocodingTime' | 'networkTime' | 'processingTime' | 'totalTime'> | null {
    const request = this.requests.get(id);
    if (!request) return null;
    
    return {
      geocodingTime: request.geocodingTime,
      networkTime: request.networkTime,
      processingTime: request.processingTime,
      totalTime: request.totalTime
    };
  }

  /**
   * Abort all active requests
   */
  abortAll(reason: string = 'All requests aborted'): void {
    this.requests.forEach(request => {
      if (request.stage !== 'complete' && request.stage !== 'failed' && request.stage !== 'cancelled') {
        this.abortRequest(request.id, reason);
      }
    });
  }
  
  /**
   * Prune the cache to keep only the last MAX_CACHE_SIZE requests
   */
  private pruneCache(): void {
    if (this.requests.size <= this.MAX_CACHE_SIZE) return;
    
    // Get all requests sorted by timestamp (oldest first)
    const sortedRequests = Array.from(this.requests.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest requests until we reach MAX_CACHE_SIZE
    const numToDelete = sortedRequests.length - this.MAX_CACHE_SIZE;
    for (let i = 0; i < numToDelete; i++) {
      const [id, request] = sortedRequests[i];
      
      // Clean up any resources before removing
      if (request.controller && request.stage !== 'complete' && request.stage !== 'failed' && request.stage !== 'cancelled') {
        request.controller.abort('Request cache pruned');
      }
      
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      
      this.requests.delete(id);
      
      if (this.DEBUG_MODE) {
        console.log(`🧹 [API] Pruned request from cache: ${request.method} ${request.url} [${id}]`);
      }
    }
  }

  /**
   * Check if we have a slow connection based on recent requests
   */
  isSlowConnection(): boolean {
    let totalTime = 0;
    let count = 0;
    
    // Look at the last 3 completed requests
    this.requests.forEach(request => {
      if (request.stage === 'complete' && request.totalTime && request.totalTime > 0) {
        totalTime += request.totalTime;
        count++;
      }
    });
    
    // If we have at least 2 completed requests and the average time is over 3 seconds,
    // consider it a slow connection
    return count >= 2 && (totalTime / count) > 3000;
  }
  
  /**
   * Get a request by correlation ID
   */
  getRequestByCorrelationId(correlationId: string): RequestMetadata | null {
    for (const request of this.requests.values()) {
      if (request.correlationId === correlationId) {
        return request;
      }
    }
    return null;
  }
}

// Export singleton instance
export const requestTracker = new RequestTracker();