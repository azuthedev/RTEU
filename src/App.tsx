// Update App.tsx to include the new PartnerSignup route
import React, { useEffect, Suspense, lazy, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/toaster';

// Import feature flag bridge for cross-domain communication
import './utils/featureFlagBridge';

// Components that are needed on first render should not be lazy-loaded
import Header from './components/Header';
import { preloadImagesForRoute } from './utils/imagePreloader';

// Import contexts providers only (not their implementations)
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { createAnalytics } from './hooks/useAnalytics';
import { FeatureFlagProvider, useFeatureFlags } from './components/FeatureFlagProvider';
import OTPVerificationModal from './components/OTPVerificationModal';

// Import BookingProvider
import { BookingProvider } from './contexts/BookingContext';

// Create analytics outside of the component to avoid Router context dependency
const globalAnalytics = createAnalytics();

// Lazily load all pages to improve initial load time
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const FAQ = lazy(() => import('./pages/FAQ'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Services = lazy(() => import('./pages/Services'));
const Partners = lazy(() => import('./pages/Partners'));
const Login = lazy(() => import('./pages/Login'));
const Contact = lazy(() => import('./pages/Contact'));
const CustomerSignup = lazy(() => import('./pages/CustomerSignup'));
const PartnerSignup = lazy(() => import('./pages/PartnerSignup')); // Added new page
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogsDestinations = lazy(() => import('./pages/BlogsDestinations'));
const BookingFlow = lazy(() => import('./pages/BookingFlow'));
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'));
const BookingCancelled = lazy(() => import('./pages/BookingCancelled'));
const Profile = lazy(() => import('./pages/Profile'));
const Bookings = lazy(() => import('./pages/Bookings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Privacy = lazy(() => import('./pages/Privacy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const CookieBanner = lazy(() => import('./components/ui/CookieBanner'));
const Sitemap = lazy(() => import('./components/Sitemap'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerificationSuccess = lazy(() => import('./pages/VerificationSuccess'));
const VerificationFailed = lazy(() => import('./pages/VerificationFailed'));
const UnverifiedUserPrompt = lazy(() => import('./components/UnverifiedUserPrompt'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Terms = lazy(() => import('./pages/Terms'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

// Optimized loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" aria-hidden="true" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Route observer component to handle page-specific classes and SEO updates
const RouteObserver = () => {
  const location = useLocation();
  const { trackEvent } = useAuth();
  const prevPathRef = useRef(location.pathname);
  // Track if we're scrolling due to a navigation action
  const scrollInProgressRef = useRef(false);
  // Store a flag for forced scroll (like clicking Home on home page)
  const forceScrollRef = useRef(false);

  // Set up listener for custom scroll events
  useEffect(() => {
    const handleForceScroll = () => {
      forceScrollRef.current = true;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
      // Reset the force scroll flag after animation completes
      setTimeout(() => {
        forceScrollRef.current = false;
      }, 1000);
    };

    window.addEventListener('forceScrollToTop', handleForceScroll);
    
    return () => {
      window.removeEventListener('forceScrollToTop', handleForceScroll);
    };
  }, []);

  useEffect(() => {
    // Update page-specific classes
    const isBookingPage = location.pathname.startsWith('/transfer/');
    document.documentElement.classList.toggle('booking-page', isBookingPage);
    
    // Track page transitions as events
    trackEvent('Navigation', 'Page Transition', location.pathname);
    
    // Preload images for the current route
    preloadImagesForRoute(location.pathname);

    // Check if this is a booking flow page - we don't want to scroll to top for these
    const isBookingFlow = location.pathname.includes('/transfer/') && location.pathname.includes('/form');

    // Always scroll to top on navigation or forced scroll
    // Either when path changes OR when forceScrollRef is true
    // But NOT for booking flow pages (let them handle their own scrolling)
    if ((prevPathRef.current !== location.pathname || forceScrollRef.current) && !isBookingFlow) {
      if (!scrollInProgressRef.current) {
        scrollInProgressRef.current = true;
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
        
        // Reset the scroll flag after animation completes
        setTimeout(() => {
          scrollInProgressRef.current = false;
        }, 1000);
      }
      
      prevPathRef.current = location.pathname;
    }

    return () => {
      document.documentElement.classList.remove('booking-page');
    };
  }, [location, trackEvent]);

  return null;
};

// Updated ProtectedRoute to handle unverified users
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading, emailVerified, emailVerificationChecked, trackEvent } = useAuth();
  const location = useLocation();
  const [showUnverifiedPrompt, setShowUnverifiedPrompt] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      trackEvent('Authentication', 'Access Denied', 'Protected Route', 0, true);
    }
  }, [user, authLoading, trackEvent]);
  
  useEffect(() => {
    // Check if user needs email verification
    if (!authLoading && user && emailVerificationChecked && !emailVerified) {
      setShowUnverifiedPrompt(true);
    } else {
      setShowUnverifiedPrompt(false);
    }
  }, [authLoading, user, emailVerified, emailVerificationChecked]);
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  // If user is authenticated but not verified, show the verification prompt
  if (showUnverifiedPrompt) {
    return (
      <Suspense fallback={<PageLoader />}>
        <UnverifiedUserPrompt 
          redirectUrl={location.pathname}
          email={user.email || ""}
        />
      </Suspense>
    );
  }
  
  // User is authenticated and verified, render children
  return <>{children}</>;
};

function AppRoutes() {
  // Use feature flags to determine if we should show the cookie banner
  const { flags } = useFeatureFlags();
  
  return (
    <>
      <RouteObserver />
      <Header />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home/transfer/:from/:to/:type/:date/:returnDate/:passengers/form" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/destinations" element={<BlogsDestinations />} />
          <Route path="/blogs/:city" element={<BlogPost />} />
          <Route path="/services" element={<Services />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/login" element={<Login />} />
          <Route path="/partner-signup" element={<PartnerSignup />} /> {/* New route for partner signup */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verification-success" element={<VerificationSuccess />} />
          <Route path="/verification-failed" element={<VerificationFailed />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/customer-signup" element={<CustomerSignup />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/booking-cancelled" element={<BookingCancelled />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/bookings" 
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />
          {/* BookingFlow route - BookingProvider is already available from parent */}
          <Route 
            path="/transfer/:from/:to/:type/:date/:returnDate/:passengers/form" 
            element={<BookingFlow />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      
      {/* Conditionally render the CookieBanner based on the feature flag */}
      {flags.showCookieBanner && (
        <Suspense fallback={null}>
          <CookieBanner />
        </Suspense>
      )}
      
      {/* Lazy load Sitemap - Common footer for all pages */}
      <Suspense fallback={null}>
        <Sitemap />
      </Suspense>
      
      {/* Toaster for displaying notifications */}
      <Toaster />
    </>
  );
}

// Wrapper component to provide analytics within Router context
const AppWithAuth = () => {
  return (
    <AuthProvider trackEvent={globalAnalytics.trackEvent} setUserId={globalAnalytics.setUserId}>
      <BookingProvider>
        <AppRoutes />
      </BookingProvider>
    </AuthProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <FeatureFlagProvider>
        <AppWithAuth />
      </FeatureFlagProvider>
    </BrowserRouter>
  );
}

export default App;