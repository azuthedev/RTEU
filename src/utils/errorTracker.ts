/**
 * Centralized error tracking and reporting utility
 */

import { trackError } from './analyticsTracker';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error contexts/sources
export enum ErrorContext {
  PRICING = 'pricing',
  BOOKING = 'booking',
  NAVIGATION = 'navigation',
  GEOCODING = 'geocoding',
  AUTHENTICATION = 'authentication',
  PAYMENT = 'payment',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

interface ErrorReport {
  id: string;
  message: string;
  context: ErrorContext;
  severity: ErrorSeverity;
  timestamp: number;
  data?: any;
  componentStack?: string;
  userInfo?: {
    userId?: string;
    email?: string;
    sessionId?: string;  // Added for session correlation
  };
  appState?: {
    url: string;
    referrer: string;
  };
  systemInfo?: {
    userAgent: string;
    viewport: string;
    connectionType?: string;
    language: string;
  };
  correlationId?: string; // Added for request correlation
}

interface ErrorTrackerOptions {
  debugMode?: boolean;
  captureState?: boolean;
  captureSystemInfo?: boolean;
  silentErrors?: boolean;
  errorLimit?: number;
}

class ErrorTracker {
  // Use WeakMap to allow garbage collection when objects are no longer needed
  private errors = new WeakMap<object, ErrorReport>();
  // Use array to keep track of error keys in chronological order
  private errorKeys: object[] = [];
  
  private options: ErrorTrackerOptions = {
    debugMode: false,
    captureState: true,
    captureSystemInfo: true,
    silentErrors: false,
    errorLimit: 50
  };
  
  constructor(options: Partial<ErrorTrackerOptions> = {}) {
    this.options = { ...this.options, ...options };
    
    // Override options from localStorage if present (for debug purposes)
    if (typeof localStorage !== 'undefined') {
      const debugMode = localStorage.getItem('ERROR_TRACKER_DEBUG');
      if (debugMode === 'true') {
        this.options.debugMode = true;
      }
    }
  }
  
  /**
   * Set tracker options
   */
  setOptions(options: Partial<ErrorTrackerOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Get error tracker options
   */
  getOptions(): ErrorTrackerOptions {
    return { ...this.options };
  }
  
  /**
   * Track an error with detailed reporting
   */
  trackError(
    error: Error | string,
    context: ErrorContext = ErrorContext.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    additionalData?: any
  ): string {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Generate unique ID for this error
    const id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Extract session ID and correlation ID if present
    let sessionId: string | undefined = undefined;
    let correlationId: string | undefined = undefined;
    
    if (additionalData) {
      sessionId = additionalData.sessionId;
      correlationId = additionalData.correlationId;
      
      // Remove these from additionalData to avoid duplication
      if (sessionId) delete additionalData.sessionId;
      if (correlationId) delete additionalData.correlationId;
    }
    
    // Create key object for WeakMap (needs to be an object)
    const errorKey = { id, timestamp: Date.now() };
    
    // Build the error report
    const report: ErrorReport = {
      id,
      message: errorMessage,
      context,
      severity,
      timestamp: Date.now(),
      data: additionalData
    };
    
    // Add correlation ID if present
    if (correlationId) {
      report.correlationId = correlationId;
    }
    
    // Capture stack trace if an Error object was provided
    if (typeof error !== 'string' && error.stack) {
      report.componentStack = error.stack;
    }
    
    // Capture application state if enabled
    if (this.options.captureState) {
      report.appState = {
        url: window.location.href,
        referrer: document.referrer || ''
      };
    }
    
    // Capture system information if enabled
    if (this.options.captureSystemInfo) {
      report.systemInfo = {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
      };
      
      // Attempt to get connection type if available
      // @ts-ignore: Connection API not in all browsers
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection && connection.effectiveType) {
        report.systemInfo.connectionType = connection.effectiveType;
      }
    }
    
    // Get user info from session storage
    try {
      // Add session ID to user info
      report.userInfo = {
        sessionId: sessionId || sessionStorage.getItem('session_id') || undefined
      };
      
      // Try to get user ID and email from storage
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        report.userInfo.userId = userInfo.userId;
        report.userInfo.email = userInfo.email;
      }
    } catch (e) {
      console.warn('Failed to get user info for error reporting:', e);
    }
    
    // Add the error to our local log
    this.errors.set(errorKey, report);
    this.errorKeys.push(errorKey);
    
    // Trim error log if it exceeds the limit
    if (this.errorKeys.length > this.options.errorLimit!) {
      // Remove the oldest error
      this.errorKeys.shift();
    }
    
    // Log to console in debug mode
    if (this.options.debugMode) {
      const logStyles = this.getLogStylesForSeverity(severity);
      console.group(`%c🔴 Error: ${context.toUpperCase()} - ${errorMessage}`, logStyles);
      console.log('Error details:', report);
      if (typeof error !== 'string' && error.stack) {
        console.log('Stack trace:', error.stack);
      }
      console.groupEnd();
    }
    
    // Track in analytics
    trackError(
      context, 
      errorMessage, 
      typeof additionalData === 'string' ? additionalData : JSON.stringify({
        ...additionalData,
        correlationId,
        sessionId: report.userInfo?.sessionId
      } || {}),
      severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL
    );
    
    // Show error notification for high severity errors if not in silent mode
    if (!this.options.silentErrors && (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL)) {
      this.showErrorNotification(errorMessage, context);
    }
    
    // Return the error ID for reference
    return id;
  }
  
  /**
   * Get recent errors
   */
  getErrors(limit?: number): ErrorReport[] {
    const errors: ErrorReport[] = [];
    
    // Get the keys to use, limiting if needed
    const keysToUse = limit ? this.errorKeys.slice(-limit) : this.errorKeys;
    
    // Retrieve error reports from WeakMap
    for (const key of keysToUse) {
      const error = this.errors.get(key);
      if (error) {
        errors.push(error);
      }
    }
    
    return errors;
  }
  
  /**
   * Clear all tracked errors
   */
  clearErrors(): void {
    // WeakMap entries will be garbage collected naturally
    // Just clear our keys array
    this.errorKeys = [];
  }
  
  /**
   * Get error by correlation ID
   */
  getErrorByCorrelationId(correlationId: string): ErrorReport | null {
    for (const key of this.errorKeys) {
      const error = this.errors.get(key);
      if (error && error.correlationId === correlationId) {
        return error;
      }
    }
    return null;
  }
  
  /**
   * Get errors by session ID
   */
  getErrorsBySession(sessionId: string): ErrorReport[] {
    const sessionErrors: ErrorReport[] = [];
    
    for (const key of this.errorKeys) {
      const error = this.errors.get(key);
      if (error && error.userInfo?.sessionId === sessionId) {
        sessionErrors.push(error);
      }
    }
    
    return sessionErrors;
  }
  
  /**
   * Show an error notification to the user
   */
  private showErrorNotification(message: string, context: ErrorContext): void {
    if (typeof document === 'undefined') return;
    
    // Check if the notification container exists
    let container = document.getElementById('error-notification-container');
    
    // Create the container if it doesn't exist
    if (!container) {
      container = document.createElement('div');
      container.id = 'error-notification-container';
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    
    // Create the notification element
    const notification = document.createElement('div');
    notification.style.backgroundColor = '#f8d7da';
    notification.style.color = '#721c24';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    notification.style.marginBottom = '10px';
    notification.style.width = '300px';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    notification.setAttribute('role', 'alert');
    
    // Add context label
    const contextLabel = document.createElement('div');
    contextLabel.style.fontWeight = 'bold';
    contextLabel.style.marginBottom = '4px';
    contextLabel.textContent = `${context.charAt(0).toUpperCase() + context.slice(1)} Error`;
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.style.fontSize = '14px';
    messageElement.textContent = message;
    
    // Assemble notification
    notification.appendChild(contextLabel);
    notification.appendChild(messageElement);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '8px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '18px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#721c24';
    closeButton.onclick = () => removeNotification();
    
    notification.appendChild(closeButton);
    
    // Add to container
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto-remove after 8 seconds
    const timeoutId = setTimeout(() => removeNotification(), 8000);
    
    // Function to remove the notification
    function removeNotification() {
      clearTimeout(timeoutId);
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        if (container?.contains(notification)) {
          container.removeChild(notification);
        }
      }, 300);
    }
  }
  
  /**
   * Get console log styles based on severity
   */
  private getLogStylesForSeverity(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'color: #856404; background-color: #fff3cd; padding: 2px 5px; border-radius: 3px; font-weight: bold;';
      case ErrorSeverity.MEDIUM:
        return 'color: #0c5460; background-color: #d1ecf1; padding: 2px 5px; border-radius: 3px; font-weight: bold;';
      case ErrorSeverity.HIGH:
        return 'color: #721c24; background-color: #f8d7da; padding: 2px 5px; border-radius: 3px; font-weight: bold;';
      case ErrorSeverity.CRITICAL:
        return 'color: white; background-color: #dc3545; padding: 2px 5px; border-radius: 3px; font-weight: bold;';
      default:
        return 'color: #383d41; background-color: #e2e3e5; padding: 2px 5px; border-radius: 3px; font-weight: bold;';
    }
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();