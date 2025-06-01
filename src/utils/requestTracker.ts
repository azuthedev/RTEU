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
  stage: 'preparing' | 'geocoding' | 'network' | 'processing' | 'complete' | 'failed';
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

  /**
   * Start tracking a new request
   */
  startRequest(url: string, method: string = 'GET'): string {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const controller = new AbortController();
    
    // Create request metadata
    const request: RequestMetadata = {
      id,
      url,
      method,
      startTime: performance.now(),
      stage: 'preparing',
      controller,
      timestamp: Date.now()
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
      console.log(`🚀 [API] Request started: ${method} ${url} [${id}]`);
    }
    
    return id;
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
    } else if (stage === 'complete' || stage === 'failed') {
      // Request completed or failed
      request.totalTime = elapsed;
      request.processingTime = elapsed - (request.networkTime || 0) - (request.geocodingTime || 0);
      
      // Clear timeout
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      
      // Log performance metrics
      if (this.DEBUG_MODE) {
        console.log(`✅ [API] Request ${stage === 'complete' ? 'completed' : 'failed'}: ${request.method} ${request.url} [${id}]`);
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
      } else {
        trackEvent('API Performance', 'Request Failed', `${request.url} - ${request.error || 'Unknown error'}`, Math.round(request.totalTime), true);
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
    this.updateStage(id, 'failed', { error: reason });
    
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
      if (request.stage !== 'complete' && request.stage !== 'failed') {
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
      if (request.controller && request.stage !== 'complete' && request.stage !== 'failed') {
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