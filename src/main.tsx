import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';
import { initGoogleMaps, initGoogleAnalytics, initVoiceflowChat } from './utils/optimizeThirdParty.ts';

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

// Initialize Google Maps API - delay loading but start it soon after page load
if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
  // Wait until the page has shown some content before loading the heavy Maps API
  if (document.readyState === 'complete') {
    setTimeout(() => {
      initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
        .then(success => {
          console.log('Google Maps API initialized:', success);
        })
        .catch(error => {
          console.error('Error initializing Google Maps API:', error);
        });
    }, 1000); // 1s delay to let initial page render complete
  } else {
    // If document not yet loaded, add event listener
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
          .then(success => {
            console.log('Google Maps API initialized after DOMContentLoaded:', success);
          });
      }, 1000);
    });
  }
}

// Initialize Google Analytics with delay
if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
  initGoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
}

// Initialize Voiceflow chat with delayed loading
initVoiceflowChat('67d817b721b78ba30f3baa7d', {
  delay: 5000,
  waitForInteraction: true
});

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
        
        // Track in GA
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