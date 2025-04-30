import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { reportWebVitals } from './utils/webVitals.ts';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';

// Create a fallback component for the error boundary
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="flex items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-700 mb-4">We apologize for the inconvenience. Please try refreshing the page.</p>
        <pre className="text-sm bg-gray-100 p-3 rounded mb-4 overflow-auto max-h-40">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset application state here if needed
        window.location.href = '/';
      }}
      onError={(error, info) => {
        // Log to error reporting service
        console.error("Global error caught:", error);
        console.error("Component stack:", info.componentStack);
        
        // You can add error reporting service integration here
        if (window.gtag) {
          window.gtag('event', 'exception', {
            description: error.toString(),
            fatal: true
          });
        }
      }}
    >
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);

// Report web vitals if GA is configured
reportWebVitals();