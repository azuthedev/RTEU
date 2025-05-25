import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';
import { initGoogleMaps, initGoogleAnalytics, initVoiceflowChat } from './utils/optimizeThirdParty.ts';
import { reportWebVitals } from './utils/webVitals.ts';

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

// Function to load third-party scripts when the browser is idle
const loadThirdPartyScripts = () => {
  // Use requestIdleCallback to load scripts when the browser is idle
  const loadWithIdleCallback = () => {
    // Load Google Maps API when browser is idle
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(
          () => {
            initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
              .then(success => {
                console.log('Google Maps API initialized during idle time:', success);
              });
          },
          { timeout: 5000 }
        );
      } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(() => {
          initGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ['places'])
            .then(success => {
              console.log('Google Maps API initialized with timeout fallback:', success);
            });
        }, 3000);
      }
    }

    // Initialize Google Analytics with idle callback or fallback
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
    }

    // Initialize Voiceflow chat with interaction detection
    initVoiceflowChat('67d817b721b78ba30f3baa7d', {
      delay: 5000,
      waitForInteraction: true
    });
  };

  // If the page is already loaded, use idle callback immediately
  if (document.readyState === 'complete') {
    loadWithIdleCallback();
  } else {
    // Otherwise wait for the page to load first
    window.addEventListener('load', loadWithIdleCallback, { once: true });
  }

  // Fallback timeout to ensure scripts eventually load even if 
  // the browser never becomes idle or load event doesn't fire
  setTimeout(loadWithIdleCallback, 10000);
};

// Start loading third-party scripts
loadThirdPartyScripts();

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

// Report web vitals if GA is configured
reportWebVitals();