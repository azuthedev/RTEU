import React, { useState, useEffect } from 'react';
import { Crown, User, Loader2, Briefcase as Suitcase } from 'lucide-react';
import { smoothScrollTo } from '../utils/smoothScroll';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAnalytics } from '../hooks/useAnalytics';
import OptimizedImage from './OptimizedImage';

interface HeaderProps {
  isAboutPage?: boolean;
  hideSignIn?: boolean;
}

const Header = ({ isAboutPage = false, hideSignIn = false }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData, loading, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { trackEvent } = useAnalytics();
  const isAdmin = userData?.user_role === 'admin';
  const isPartner = userData?.user_role === 'partner';

  const handleCTAClick = () => {
    setIsMenuOpen(false);
    trackEvent('Navigation', 'Book Now Click', 'Header');

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
          const isMobile = window.innerWidth < 768;
          const offset = 70;
          
          if (!isMobile) {
            smoothScrollTo(0, 1050);
            return;
          }

          const heroText = bookingForm.querySelector('h1');
          if (heroText) {
            const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
            smoothScrollTo(scrollPosition, 1050);
          }
        }
      }, 100);
    } else {
      const bookingForm = document.getElementById('booking-form');
      if (bookingForm) {
        const isMobile = window.innerWidth < 768;
        const offset = 70;
        
        if (!isMobile) {
          smoothScrollTo(0, 1050);
          return;
        }

        const heroText = bookingForm.querySelector('h1');
        if (heroText) {
          const scrollPosition = heroText.getBoundingClientRect().bottom + window.scrollY - offset;
          smoothScrollTo(scrollPosition, 1050);
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      trackEvent('Authentication', 'Logout Initiated', 'Header');
      await signOut();
      setShowUserMenu(false);
      setIsMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      trackEvent('Authentication', 'Logout Error', JSON.stringify(error));
      setShowUserMenu(false);
      setIsMenuOpen(false);
      navigate('/');
    }
  };

  const handlePortalClick = async (portalType: 'admin' | 'partner', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackEvent('Navigation', `${portalType === 'admin' ? 'Admin' : 'Partner'} Portal Click`);
    
    try {
      // Get current session and extract token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, just redirect to portal login
        window.open(`https://app.royaltransfereu.com/${portalType}`, '_blank');
        return;
      }

      // Encode the token to make it URL safe
      const encodedToken = encodeURIComponent(session.access_token);
      
      // Open portal with token
      window.open(`https://app.royaltransfereu.com/${portalType}?token=${encodedToken}`, '_blank');
    } catch (error) {
      console.error(`Error preparing ${portalType} portal redirect:`, error);
      trackEvent('Error', `${portalType} Portal Redirect Error`, JSON.stringify(error));
      // Fallback to regular link if something goes wrong
      window.open(`https://app.royaltransfereu.com/${portalType}`, '_blank');
    }
    
    setShowUserMenu(false);
    setIsMenuOpen(false);
  };

  const handleAdminPortalClick = (e: React.MouseEvent) => {
    handlePortalClick('admin', e);
  };

  const handlePartnerPortalClick = (e: React.MouseEvent) => {
    handlePortalClick('partner', e);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showUserMenu && !target.closest('#user-menu-button') && !target.closest('#user-menu')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-[200]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="md:hidden w-12 h-12" />

          <button
            onClick={() => {
              trackEvent('Navigation', 'Logo Click', 'Header');
              navigate('/');
            }}
            className="flex items-center focus:outline-none h-16 py-2"
            aria-label="Royal Transfer EU Homepage"
          >
            <OptimizedImage
              src="https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp"
              alt="Royal Transfer EU Logo - Professional airport transfers and taxi services across Europe"
              className="h-full w-auto object-contain max-h-16"
              width={170}
              height={64}
              loading="eager"
              fetchPriority="high"
            />
          </button>

          
          <nav className="hidden md:flex space-x-6 lg:space-x-8">
            <a 
              href="/" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'Home')}
            >
              Home
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/about" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'About Us')}
            >
              About Us
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/services" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'Services')}
            >
              Services
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/blogs/destinations" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'Destinations')}
            >
              Destinations
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/faq" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'FAQs')}
            >
              FAQs
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/partners" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'Partners')}
            >
              Partners
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
            <a 
              href="/contact" 
              className="relative py-2 text-gray-700 group"
              onClick={() => trackEvent('Navigation', 'Menu Click', 'Contact')}
            >
              Contact
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full group-active:bg-blue-700 transition-all duration-300 -translate-x-1/2"></span>
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {!hideSignIn && (
              loading ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" aria-hidden="true" />
                </div>
              ) : user ? (
                <div className="relative">
                  <button
                    id="user-menu-button"
                    onClick={() => {
                      setShowUserMenu(!showUserMenu);
                      trackEvent('Navigation', 'User Menu Toggle', showUserMenu ? 'Close' : 'Open');
                    }}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    aria-label="Open user menu"
                    aria-expanded={showUserMenu ? "true" : "false"}
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {showUserMenu && (
                    <div 
                      id="user-menu"
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b">
                        {userData?.name || 'User'}
                        {userData?.user_role && (
                          <div className="text-xs text-gray-500 capitalize">
                            {userData.user_role}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <a 
                          href="#" 
                          onClick={handleAdminPortalClick}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          <Crown className="w-4 h-4 mr-2" aria-hidden="true" />
                          Admin Portal
                        </a>
                      )}
                      {isPartner && (
                        <a 
                          href="#" 
                          onClick={handlePartnerPortalClick}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                        >
                          <Suitcase className="w-4 h-4 mr-2" aria-hidden="true" />
                          Partner Portal
                        </a>
                      )}
                      <Link 
                        to="/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setShowUserMenu(false);
                          trackEvent('Navigation', 'Menu Click', 'Profile');
                        }}
                        role="menuitem"
                      >
                        Your Profile
                      </Link>
                      <Link 
                        to="/bookings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setShowUserMenu(false);
                          trackEvent('Navigation', 'Menu Click', 'Bookings');
                        }}
                        role="menuitem"
                      >
                        Your Bookings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a 
                  href="/login"
                  className="hidden md:inline-flex border border-blue-600 text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 box-border"
                  onClick={() => trackEvent('Navigation', 'Sign In Click', 'Header')}
                >
                  Sign In
                </a>
              )
            )}
            <button 
              onClick={handleCTAClick}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-all duration-300"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-white z-40 md:hidden"
            >
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 right-3 w-12 h-12 flex items-center justify-center"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <div className="w-6 h-6 relative">
                  <span className="absolute top-1/2 left-0 w-6 h-0.5 bg-gray-600 -translate-y-1/2 rotate-45"></span>
                  <span className="absolute top-1/2 left-0 w-6 h-0.5 bg-gray-600 -translate-y-1/2 -rotate-45"></span>
                </div>
              </motion.button>

              <div className="flex flex-col h-full">
                <div className="flex justify-center items-center p-4 border-b">
                  <OptimizedImage
                    src="https://files.royaltransfereu.com/assets/rt-logo-black-950-500.webp"
                    alt="Royal Transfer EU Logo - Professional taxi and transfer services"
                    className="h-12 w-auto object-contain"
                    width={150}
                    height={48}
                    loading="eager"
                  />
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                  <div className="flex flex-col space-y-4">
                    {[
                      { href: '/', label: 'Home' },
                      { href: '/about', label: 'About Us' },
                      { href: '/services', label: 'Services' },
                      { href: '/blogs/destinations', label: 'Destinations' },
                      { href: '/faq', label: 'FAQs' },
                      { href: '/partners', label: 'Partners' },
                      { href: '/contact', label: 'Contact' }
                    ].map((link) => (
                      <div key={link.href} className="flex">
                        <a
                          href={link.href}
                          className="relative py-2 text-gray-700 group"
                          onClick={() => {
                            setIsMenuOpen(false);
                            trackEvent('Navigation', 'Mobile Menu Click', link.label);
                          }}
                        >
                          <span>{link.label}</span>
                          <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                        </a>
                      </div>
                    ))}
                    
                    {user && (
                      <>
                        {isAdmin && (
                          <div className="flex">
                            <a
                              href="#"
                              className="relative py-2 text-gray-700 group"
                              onClick={(e) => {
                                handleAdminPortalClick(e);
                                setIsMenuOpen(false);
                                trackEvent('Navigation', 'Mobile Menu Click', 'Admin Portal');
                              }}
                            >
                              <span>Admin Portal</span>
                              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                          </div>
                        )}
                        {isPartner && (
                          <div className="flex">
                            <a
                              href="#"
                              className="relative py-2 text-gray-700 group"
                              onClick={(e) => {
                                handlePartnerPortalClick(e);
                                setIsMenuOpen(false);
                                trackEvent('Navigation', 'Mobile Menu Click', 'Partner Portal');
                              }}
                            >
                              <span>Partner Portal</span>
                              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                            </a>
                          </div>
                        )}
                        <div className="flex">
                          <a
                            href="/profile"
                            className="relative py-2 text-gray-700 group"
                            onClick={() => {
                              setIsMenuOpen(false);
                              trackEvent('Navigation', 'Mobile Menu Click', 'Your Profile');
                            }}
                          >
                            <span>Your Profile</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                          </a>
                        </div>
                        <div className="flex">
                          <a
                            href="/bookings"
                            className="relative py-2 text-gray-700 group"
                            onClick={() => {
                              setIsMenuOpen(false);
                              trackEvent('Navigation', 'Mobile Menu Click', 'Your Bookings');
                            }}
                          >
                            <span>Your Bookings</span>
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </nav>

                <div className="p-4 border-t space-y-3">
                  {!hideSignIn && (
                    loading ? (
                      <div className="flex justify-center">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" aria-hidden="true" />
                      </div>
                    ) : user ? (
                      <button
                        onClick={handleLogout}
                        className="block w-full border border-blue-600 text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 text-center box-border"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <a
                        href="/login"
                        onClick={() => {
                          setIsMenuOpen(false);
                          trackEvent('Navigation', 'Mobile Menu Click', 'Sign In');
                        }}
                        className="block w-full border border-blue-600 text-blue-600 px-[calc(1.5rem-1px)] py-[calc(0.5rem-1px)] rounded-md hover:bg-blue-50 transition-all duration-300 text-center box-border"
                      >
                        Sign In
                      </a>
                    )
                  )}
                  <button 
                    onClick={handleCTAClick}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-all duration-300"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button 
        className="md:hidden fixed top-[22px] left-4 z-50 w-12 h-12 flex items-center justify-center"
        onClick={() => {
          setIsMenuOpen(!isMenuOpen);
          trackEvent('Navigation', 'Mobile Menu Toggle', isMenuOpen ? 'Close' : 'Open');
        }}
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen ? "true" : "false"}
      >
        <div className="w-6 h-4 relative flex flex-col justify-between">
          <span 
            className={`bg-gray-600 h-0.5 w-6 rounded-sm transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span 
            className={`bg-gray-600 h-0.5 w-6 rounded-sm transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span 
            className={`bg-gray-600 h-0.5 w-6 rounded-sm transition-all duration-300 ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
        </div>
      </button>
    </header>
  );
};

export default Header;