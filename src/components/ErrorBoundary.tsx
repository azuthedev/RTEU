import React, { Component, ErrorInfo, ReactNode } from 'react';
import { XCircle, ArrowLeft, AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Use this higher-order component to provide a navigation-enabled error fallback
 */
export const withErrorBoundaryNavigation = (WrappedComponent: React.ComponentType<any>) => {
  return (props: any) => {
    const navigate = useNavigate();
    const handleGoBack = () => navigate(-1);
    const handleGoHome = () => navigate('/');
    
    return (
      <ErrorBoundary
        onReset={handleGoHome}
        fallback={(
          <ErrorFallback 
            onGoBack={handleGoBack} 
            onGoHome={handleGoHome}
          />
        )}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
};

// Default error fallback component with navigation actions
export const ErrorFallback = ({ 
  error, 
  onGoBack, 
  onGoHome, 
  onReset 
}: { 
  error?: Error | null;
  onGoBack?: () => void;
  onGoHome?: () => void;
  onReset?: () => void;
}) => {
  const message = error?.message || "Something went wrong";
  
  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg text-center">
      <XCircle className="w-16 h-16 text-red-500 mb-4 mx-auto" />
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops! An Error Occurred</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      
      <div className="flex flex-col md:flex-row gap-3 justify-center">
        {onGoBack && (
          <button 
            onClick={onGoBack}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        )}
        
        {(onReset || onGoHome) && (
          <button 
            onClick={onReset || onGoHome}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
      
      {process.env.NODE_ENV !== 'production' && error && (
        <div className="mt-6 p-4 bg-gray-100 rounded-md text-left">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Debug Information:</h3>
          <div className="text-xs font-mono text-gray-600 overflow-auto max-h-32">
            {error.stack}
          </div>
        </div>
      )}
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update errorInfo in state
    this.setState({ errorInfo });
    
    // Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Track error in analytics
    try {
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.toString(),
          fatal: true
        });
      }
    } catch (e) {
      console.error('Failed to log error to analytics', e);
    }

    // Log error in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if any of the resetKeys have changed
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some((key, idx) => 
        prevProps.resetKeys && key !== prevProps.resetKeys[idx]
      );
      
      if (hasChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;