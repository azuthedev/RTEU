import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Calendar, Clock, MapPin, DollarSign, ChevronRight, Loader2, 
  Phone, Mail, User, Car, AlertCircle, RefreshCw, Copy, 
  CheckCircle, XCircle, ArrowLeft, FileText, ExternalLink, 
  Users, Briefcase, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/use-toast';
import { withRetry } from '../utils/retryHelper';
import { useLanguage } from '../contexts/LanguageContext';

interface Trip {
  id: string;
  datetime: string;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_price: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  pickup_address: string;
  dropoff_address: string;
  customer_email: string;
  booking_reference: string;
  user_id?: string;
  payment_method?: string;
  vehicle_type?: string;
  is_return?: boolean;
  return_datetime?: string;
  flight_number?: string;
  passengers?: number;
  luggage_count?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_title?: string;
  notes?: string;
  extra_items?: string;
  extra_stops?: string;
  child_seats?: string;
}

// Simplified BookingDetails to only include trip fields
type BookingDetails = Trip;

const Bookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Helper function to classify error types
  const classifyError = (error: any): { type: 'network' | 'auth' | 'permission' | 'server' | 'unknown', message: string } => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('TypeError: Failed to fetch')) {
      return { type: 'network', message: t('bookings.error.networkError', 'Network connection failed. Please check your internet connection and try again.') };
    }
    
    if (errorMessage.includes('infinite recursion') || errorMessage.includes('42P17')) {
      return { type: 'permission', message: t('bookings.error.configError', 'Database configuration issue. Please try refreshing the page or contact support if the problem persists.') };
    }
    
    if (errorMessage.includes('Invalid session') || errorMessage.includes('401')) {
      return { type: 'auth', message: t('bookings.error.sessionExpired', 'Your session has expired. Please sign in again.') };
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
      return { type: 'permission', message: t('bookings.error.permissionError', 'Access denied. You do not have permission to view these bookings.') };
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      return { type: 'server', message: t('bookings.error.serverError', 'Server error occurred. Please try again in a few moments.') };
    }
    
    return { type: 'unknown', message: errorMessage };
  };

  // Helper function to determine if we should use Edge Function
  const shouldUseEdgeFunction = () => {
    // In development, check if Supabase URL is accessible
    // In production, always try Edge Functions first
    const isDevEnvironment = window.location.hostname === 'localhost' || 
                            window.location.hostname.includes('local-credentialless') ||
                            window.location.hostname.includes('webcontainer');
    return !isDevEnvironment || import.meta.env.VITE_SUPABASE_URL;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { 
        state: { from: location },
        replace: true 
      });
    }
  }, [user, authLoading, navigate, location]);

  // Enhanced fetch trips function with better error handling
  const fetchTrips = useCallback(async (showLoadingState = true) => {
    if (!user) return;

    try {
      if (showLoadingState) {
        setLoading(true);
      }
      setError(null);

      console.log(`[fetchTrips] Fetching ${activeTab} trips for user:`, user.id);

      // Try Edge Function first if available
      if (shouldUseEdgeFunction()) {
        try {
          console.log('[fetchTrips] Attempting Edge Function approach');
          
          // Get the current session for auth token
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error(t('bookings.error.noSession', 'No active session - please sign in again'));
          }

          // Call the Edge Function with proper authorization
          const response = await withRetry(async () => {
            return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-data?type=bookings&filter=${activeTab}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              }
            });
          }, {
            maxRetries: 5,
            initialDelay: 1000,
            onRetry: (attempt) => console.log(`[fetchTrips] Retrying Edge Function, attempt ${attempt}`)
          });
          
          if (response.ok) {
            const { data, error: responseError } = await response.json();
            
            if (responseError) {
              throw new Error(responseError);
            }

            console.log(`[fetchTrips] Found ${data?.length || 0} trips via Edge Function`);
            setTrips(data || []);
            setRetryCount(0); // Reset retry count on success

            // If no trips found, show appropriate message
            if (!data || data.length === 0) {
              toast({
                title: activeTab === 'upcoming' 
                  ? t('bookings.toast.noUpcoming', 'No upcoming bookings')
                  : t('bookings.toast.noPast', 'No past bookings'),
                description: activeTab === 'upcoming' 
                  ? t('bookings.toast.noUpcomingDesc', "You don't have any upcoming bookings.")
                  : t('bookings.toast.noPastDesc', "You don't have any past bookings."),
                variant: "default"
              });
            }
            
            return; // Success, exit function
          } else {
            const errorText = await response.text();
            console.error('[fetchTrips] Edge Function failed:', response.status, errorText);
            throw new Error(t('bookings.error.edgeFunctionFailed', 'Edge Function failed: {{status}}', { status: response.status.toString() }));
          }
        } catch (edgeFunctionError) {
          console.warn('[fetchTrips] Edge Function failed, falling back to direct query:', edgeFunctionError);
        }
      }

      // Fallback to direct database query
      console.log('[fetchTrips] Using direct database query approach');
      
      // Get user's email for email-based booking matching
      let userEmail: string;
      
      if (userData?.email) {
        userEmail = userData.email;
      } else {
        // Try to get email from user object
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          userEmail = session.user.email;
        } else {
          throw new Error(t('bookings.error.emailLookupFailed', 'Could not determine user email for booking lookup'));
        }
      }

      console.log(`[fetchTrips] Using email for booking lookup: ${userEmail}`);

      // Build query to fetch both user_id-linked AND email-matched bookings
      const now = new Date().toISOString();
      let query = supabase
        .from('trips')
        .select('*')
        .or(`user_id.eq.${user.id},customer_email.eq.${userEmail}`);

      // Apply date filters
      if (activeTab === 'upcoming') {
        query = query.gte('datetime', now);
      } else {
        query = query.lt('datetime', now);
      }

      // Order by date
      query = query.order('datetime', { ascending: activeTab === 'upcoming' });

      const { data, error } = await withRetry(async () => {
        return await query;
      }, {
        maxRetries: 5,
        initialDelay: 500,
        onRetry: (attempt) => console.log(`[fetchTrips] Retrying direct query, attempt ${attempt}`)
      });

      if (error) {
        const classifiedError = classifyError(error);
        console.error('[fetchTrips] Direct query error:', error);
        
        // If it's an auth/permission error and we haven't retried much, try to refresh session
        if ((classifiedError.type === 'auth' || classifiedError.type === 'permission') && retryCount < 2) {
          console.log('[fetchTrips] Auth/permission error, attempting session refresh');
          setRetryCount(prev => prev + 1);
          
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && session) {
            console.log('[fetchTrips] Session refreshed, retrying...');
            setTimeout(() => fetchTrips(false), 1000);
            return;
          }
        }
        
        throw new Error(classifiedError.message);
      }

      console.log(`[fetchTrips] Found ${data?.length || 0} trips via direct query`);
      setTrips(data || []);
      setRetryCount(0); // Reset retry count on success

      // If no trips found, show appropriate message
      if (!data || data.length === 0) {
        toast({
          title: activeTab === 'upcoming' 
            ? t('bookings.toast.noUpcoming', 'No upcoming bookings') 
            : t('bookings.toast.noPast', 'No past bookings'),
          description: activeTab === 'upcoming' 
            ? t('bookings.toast.noUpcomingDesc', "You don't have any upcoming bookings.") 
            : t('bookings.toast.noPastDesc', "You don't have any past bookings."),
          variant: "default"
        });
      }

    } catch (error: any) {
      const classifiedError = classifyError(error);
      console.error('[fetchTrips] All methods failed:', classifiedError);
      setError(classifiedError.message);
      
      // Show user-friendly error message
      toast({
        title: t('bookings.toast.error', "Error Loading Bookings"),
        description: classifiedError.message,
        variant: "destructive",
        action: classifiedError.type === 'network' ? (
          <button 
            onClick={() => fetchTrips()} 
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            {t('bookings.error.retry', 'Retry')}
          </button>
        ) : undefined
      });
      
      // For auth errors, suggest re-authentication
      if (classifiedError.type === 'auth') {
        setTimeout(() => {
          navigate('/login', { 
            state: { from: location, message: t('bookings.error.reloginMessage', 'Please sign in again to access your bookings.') },
            replace: true 
          });
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, userData?.email, navigate, location, toast, retryCount, t]);

  // Fetch trips when user or activeTab changes
  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user, activeTab, fetchTrips]);

  const fetchBookingDetails = async (tripId: string) => {
    setLoadingDetails(true);
    try {
      // Try Edge Function first if available
      if (shouldUseEdgeFunction()) {
        try {
          // Get the current session for auth token
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session');
          }

          // Call the Edge Function with proper authorization
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-data?type=booking-details&id=${tripId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          
          if (response.ok) {
            const { data, error: responseError } = await response.json();
            
            if (responseError) {
              throw new Error(responseError);
            }

            return data;
          } else {
            const errorText = await response.text();
            console.error('[fetchBookingDetails] Edge Function failed:', response.status, errorText);
            throw new Error('Edge Function failed');
          }
        } catch (edgeFunctionError) {
          console.warn('[fetchBookingDetails] Edge Function failed, falling back to direct query:', edgeFunctionError);
        }
      }
      
      // Fallback to direct query
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) {
        const classifiedError = classifyError(error);
        throw new Error(classifiedError.message);
      }
      
      return data;
    } catch (error) {
      console.error('[fetchBookingDetails] Error fetching booking details:', error);
      
      toast({
        title: t('bookings.toast.detailsError', "Error Loading Details"),
        description: t('bookings.toast.detailsErrorDesc', "Could not load booking details. Please try again."),
        variant: "destructive"
      });
      
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookingClick = async (trip: Trip) => {
    const details = await fetchBookingDetails(trip.id);
    if (details) {
      setSelectedBooking(details);
      setShowDetails(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Link an unlinked booking to the current user
  const handleLinkUnlinkedBooking = async (trip: Trip) => {
    if (!user || trip.user_id) return; // Skip if already linked
    
    try {
      setLoadingDetails(true);
      
      const { error } = await supabase
        .from('trips')
        .update({ user_id: user.id })
        .eq('id', trip.id)
        .eq('customer_email', userData?.email || '');
      
      if (error) {
        const classifiedError = classifyError(error);
        throw new Error(classifiedError.message);
      }
      
      // Update the trip in the UI
      const updatedTrips = trips.map(t => 
        t.id === trip.id ? { ...t, user_id: user.id } : t
      );
      setTrips(updatedTrips);
      
      // Update selected booking if currently viewing
      if (selectedBooking && selectedBooking.id === trip.id) {
        setSelectedBooking({ ...selectedBooking, user_id: user.id });
      }
      
      toast({
        title: t('bookings.toast.linkSuccess', "Booking Linked"),
        description: t('bookings.toast.linkSuccessDesc', "This booking has been linked to your account."),
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error linking booking:', error);
      toast({
        title: t('bookings.toast.linkError', "Error"),
        description: error.message || t('bookings.toast.linkErrorDesc', "Failed to link booking to your account."),
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCopyBookingRef = () => {
    if (selectedBooking?.booking_reference) {
      navigator.clipboard.writeText(selectedBooking.booking_reference);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
      
      toast({
        title: t('bookings.toast.referenceCopied', "Booking Reference Copied"),
        description: t('bookings.toast.referenceCopiedDesc', "Reference has been copied to clipboard"),
        variant: "default"
      });
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return t('bookings.dateTime.na', 'N/A');
    try {
      return format(new Date(dateString), 'EEE, MMM d, yyyy • h:mm a');
    } catch (e) {
      return t('bookings.dateTime.invalid', 'Invalid date');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return t('bookings.currency.na', 'N/A');
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Function to parse and format JSON data for extra fields
  const parseJsonField = (jsonStr?: string) => {
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Error parsing JSON field:", e);
      return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p>{t('bookings.loading.auth', 'Loading authentication...')}</p>
        </div>
      </div>
    );
  }

  if (loading && trips.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p>{t('bookings.loading.bookings', 'Loading your bookings...')}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t('bookings.header.title', 'Your Bookings')}</h1>
            
            {/* Refresh button */}
            <button
              onClick={() => fetchTrips()}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('bookings.header.refreshButton', 'Refresh')}</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
              <button
                onClick={() => fetchTrips()}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                {t('bookings.error.retry', 'Retry')}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-white rounded-lg shadow-sm p-1 mb-8 max-w-xs">
            <button
              className={`flex-1 py-3 text-center rounded-md transition-colors ${
                activeTab === 'upcoming' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('upcoming')}
            >
              {t('bookings.tabs.upcoming', 'Upcoming')}
            </button>
            <button
              className={`flex-1 py-3 text-center rounded-md transition-colors ${
                activeTab === 'past' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('past')}
            >
              {t('bookings.tabs.past', 'Past')}
            </button>
          </div>

          {/* Bookings List */}
          <div className="space-y-6">
            {trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">
                  {activeTab === 'upcoming' 
                    ? t('bookings.emptyState.upcoming', 'No upcoming bookings')
                    : t('bookings.emptyState.past', 'No past bookings')
                  }
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('bookings.emptyState.bookButton', 'Book a Transfer')}
                </button>
              </div>
            ) : (
              trips.map((trip) => (
                <motion.div
                  key={trip.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleBookingClick(trip)}
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">
                          {format(new Date(trip.datetime), 'EEE, MMM d, yyyy')}
                        </span>
                        <span className="text-gray-400 hidden sm:inline">•</span>
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-gray-500 sm:ml-1" />
                          <span className="ml-1">{format(new Date(trip.datetime), 'h:mm a')}</span>
                        </div>
                      </div>
                      
                      {/* Status and Reference - Stacked on mobile */}
                      <div className="flex flex-col xs:flex-row items-start sm:items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(trip.status)}`}>
                          {t(`bookings.status.${trip.status}`, trip.status.charAt(0).toUpperCase() + trip.status.slice(1))}
                        </span>
                        <div className="flex items-center justify-between w-full sm:w-auto">
                          <div className="flex items-center bg-gray-100 px-2 py-0.5 rounded-full text-sm text-gray-700">
                            <FileText className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                            <span className="font-mono">{trip.booking_reference}</span>
                          </div>
                          
                          {/* Show indicator if booking is not linked to user account */}
                          {!trip.user_id && userData?.email === trip.customer_email && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent opening details
                                handleLinkUnlinkedBooking(trip);
                              }}
                              className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                              title={t('bookings.bookingItem.linkTooltip', 'Link to my account')}
                            >
                              {t('bookings.bookingItem.link', 'Link')}
                            </button>
                          )}
                          
                          <ChevronRight className="w-5 h-5 text-gray-400 ml-1 sm:ml-2" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between border-t border-gray-100 pt-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm text-gray-500">{t('bookings.bookingItem.from', 'From')}</div>
                            <div className="font-medium line-clamp-1">{trip.pickup_address}</div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm text-gray-500">{t('bookings.bookingItem.to', 'To')}</div>
                            <div className="font-medium line-clamp-1">{trip.dropoff_address}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end md:space-x-8 border-t md:border-0 pt-4 md:pt-0">
                        <div className="flex items-center space-x-1">
                          <Car className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{trip.vehicle_type || t('bookings.vehicle.standard', 'Standard')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{trip.passengers || 1}</span>
                        </div>
                        <div className="flex items-center text-blue-600 font-semibold">
                          <DollarSign className="w-4 h-4 mr-0.5" />
                          <span>€{trip.estimated_price?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {showDetails && selectedBooking && (
          <>
            {/* Backdrop with higher z-index to appear above header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-[200] backdrop-blur-sm"
              onClick={() => setShowDetails(false)}
            />
            
            {/* Modal container - FIXED POSITION with REDUCED TOP PADDING */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-[201] flex items-center justify-center pt-16 pb-6 px-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal content wrapper with max height constraint */}
              <div 
                className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-auto flex flex-col max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with sticky positioning */}
                <div className="sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => setShowDetails(false)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label={t('bookings.bookingDetails.buttons.closeLabel', 'Close details')}
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold">{t('bookings.bookingDetails.title', 'Booking Details')}</h2>
                      <div className="flex flex-col xs:flex-row xs:items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${getStatusColor(selectedBooking.status)}`}>
                          {t(`bookings.status.${selectedBooking.status}`, selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1))}
                        </span>
                        <div 
                          className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs cursor-pointer"
                          onClick={handleCopyBookingRef}
                          title={t('bookings.bookingDetails.copyReference', 'Click to copy booking reference')}
                        >
                          <span className="font-mono truncate max-w-[150px]">{selectedBooking.booking_reference}</span>
                          {copiedRef ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCROLLABLE CONTENT AREA */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center h-full py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Trip Information */}
                      <section className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-semibold flex items-center text-gray-800">
                          <Car className="w-4 h-4 mr-2 text-blue-500" />
                          {t('bookings.bookingDetails.trip.title', 'Trip Information')}
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {/* Pickup details */}
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.trip.pickup', 'Pickup')}</p>
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">{selectedBooking.pickup_address}</p>
                                <p className="text-sm text-blue-600">{formatDateTime(selectedBooking.datetime)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Dropoff details */}
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.trip.dropoff', 'Dropoff')}</p>
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">{selectedBooking.dropoff_address}</p>
                                {selectedBooking.is_return && selectedBooking.return_datetime && (
                                  <p className="text-sm text-blue-600">{formatDateTime(selectedBooking.return_datetime)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Vehicle & Passengers */}
                          <div className="bg-white p-3 rounded-md border border-gray-200 col-span-1">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.trip.vehicle', 'Vehicle')}</p>
                            <div className="flex items-center">
                              <Car className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium truncate">{selectedBooking.vehicle_type || t('bookings.vehicle.standard', 'Standard')}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-200 col-span-1">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.trip.passengers', 'Passengers')}</p>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium">{selectedBooking.passengers || 1}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-200 col-span-1">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.trip.luggage', 'Luggage')}</p>
                            <div className="flex items-center">
                              <Briefcase className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium">{selectedBooking.luggage_count || 0} {t('bookings.bookingDetails.trip.items', 'items')}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-200 col-span-1">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.trip.tripType', 'Trip Type')}</p>
                            <p className="font-medium">{selectedBooking.is_return ? t('bookings.bookingDetails.trip.roundTrip', 'Round Trip') : t('bookings.bookingDetails.trip.oneWay', 'One Way')}</p>
                          </div>
                        </div>
                        
                        {/* Price & Payment */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.price.title', 'Price')}</p>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium text-blue-600">{formatCurrency(selectedBooking.estimated_price)}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.price.payment', 'Payment Method')}</p>
                            <div className="flex items-center">
                              <CreditCard className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium capitalize">{selectedBooking.payment_method || t('bookings.payment.card', 'Card')}</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Flight Information */}
                      {selectedBooking.flight_number && (
                        <section className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="font-semibold flex items-center text-blue-800 mb-2">
                            <div className="p-1 rounded bg-blue-100 mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
                              </svg>
                            </div>
                            {t('bookings.bookingDetails.flightInfo.title', 'Flight Information')}
                          </h3>
                          <div className="bg-white p-3 rounded-md border border-blue-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.flightInfo.flightNumber', 'Flight Number')}</p>
                            <p className="font-medium">{selectedBooking.flight_number}</p>
                          </div>
                        </section>
                      )}
                      
                      {/* Additional Information */}
                      <section className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold flex items-center text-gray-800 mb-3">
                          <User className="w-4 h-4 mr-2 text-blue-500" />
                          {t('bookings.bookingDetails.contact.title', 'Contact Information')}
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.contact.name', 'Customer Name')}</p>
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium">
                                {selectedBooking.customer_title && `${selectedBooking.customer_title}. `}
                                {selectedBooking.customer_name || t('bookings.contact.notProvided', 'Not provided')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.contact.email', 'Email')}</p>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-1.5" />
                              <p className="font-medium text-sm truncate">{selectedBooking.customer_email || t('bookings.contact.notProvided', 'Not provided')}</p>
                            </div>
                          </div>
                          
                          {selectedBooking.customer_phone && (
                            <div className="bg-white p-3 rounded-md border border-gray-200 sm:col-span-2">
                              <p className="text-sm text-gray-500 mb-1">{t('bookings.bookingDetails.contact.phone', 'Phone')}</p>
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 text-gray-400 mr-1.5" />
                                <p className="font-medium">{selectedBooking.customer_phone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                      
                      {/* Extra Items */}
                      {selectedBooking.extra_items && selectedBooking.extra_items.length > 0 && (
                        <section className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold flex items-center text-gray-800 mb-3">
                            <div className="p-1 rounded bg-gray-200 mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                <rect width="20" height="14" x="2" y="5" rx="2" />
                                <line x1="2" x2="22" y1="10" y2="10" />
                                <line x1="7" x2="7" y1="5" y2="19" />
                                <line x1="17" x2="17" y1="5" y2="19" />
                              </svg>
                            </div>
                            {t('bookings.bookingDetails.extras.title', 'Additional Services')}
                          </h3>
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <ul className="divide-y divide-gray-100">
                              {selectedBooking.extra_items.split(',').map((item, index) => (
                                <li key={index} className="py-2 first:pt-0 last:pb-0 flex items-center">
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                  <span className="text-sm capitalize">
                                    {item.replace(/-/g, ' ')}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </section>
                      )}
                      
                      {/* Extra Stops */}
                      {selectedBooking.extra_stops && (
                        <section className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold flex items-center text-gray-800 mb-3">
                            <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                            {t('bookings.bookingDetails.stops.title', 'Extra Stops')}
                          </h3>
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <ul className="divide-y divide-gray-100">
                              {parseJsonField(selectedBooking.extra_stops)?.map((stop: any, index: number) => (
                                <li key={index} className="py-2 first:pt-0 last:pb-0">
                                  <div className="flex items-start">
                                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full text-blue-700 text-xs mr-2 flex-shrink-0 mt-0.5">
                                      {index + 1}
                                    </div>
                                    <span>{stop.address}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </section>
                      )}
                      
                      {/* Notes */}
                      {selectedBooking.notes && (
                        <section className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold flex items-center text-gray-800 mb-3">
                            <div className="p-1 rounded bg-gray-200 mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </div>
                            {t('bookings.bookingDetails.notes.title', 'Notes')}
                          </h3>
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="text-sm">{selectedBooking.notes}</p>
                          </div>
                        </section>
                      )}
                      
                      {/* Account linking section */}
                      {!selectedBooking.user_id && userData?.email === selectedBooking.customer_email && (
                        <section className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="font-semibold text-blue-700 mb-2">{t('bookings.bookingDetails.linkBooking.title', 'Link This Booking')}</h3>
                          <p className="text-sm text-blue-600 mb-3">
                            {t('bookings.bookingDetails.linkBooking.description', 'This booking matches your email but isn\'t linked to your account yet.')}
                          </p>
                          <button
                            onClick={() => handleLinkUnlinkedBooking(selectedBooking)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                            disabled={loadingDetails}
                          >
                            {loadingDetails ? (
                              <>{t('bookings.bookingDetails.linkBooking.linking', 'Linking...')}<Loader2 className="w-4 h-4 ml-2 inline animate-spin" /></>
                            ) : (
                              t('bookings.bookingDetails.linkBooking.button', 'Link to My Account')
                            )}
                          </button>
                        </section>
                      )}
                    </>
                  )}
                </div>
                
                {/* Footer with actions */}
                <div className="sticky bottom-0 border-t bg-white p-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-3">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="mt-3 sm:mt-0 flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {t('bookings.bookingDetails.buttons.close', 'Close')}
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`mailto:support@royaltransfereu.com?subject=Booking ${selectedBooking.booking_reference} Inquiry&body=Hello, I have a question about my booking reference ${selectedBooking.booking_reference}.`}
                      className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {t('bookings.bookingDetails.buttons.support', 'Support')}
                    </a>
                    
                    {activeTab === 'upcoming' && (
                      <button
                        onClick={() => {
                          // Navigate to booking form with same parameters
                          // This is just a placeholder - in a real app would implement rebooking logic
                          navigate('/');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t('bookings.bookingDetails.buttons.manage', 'Manage')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Bookings;