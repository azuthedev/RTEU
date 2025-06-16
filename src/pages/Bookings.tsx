import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, ChevronRight, Loader2, Phone, Mail, User, Car, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/use-toast';
import { withRetry } from '../utils/retryHelper';

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
}

// Simplified BookingDetails to only include trip fields
type BookingDetails = Trip;

const Bookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Helper function to classify error types
  const classifyError = (error: any): { type: 'network' | 'auth' | 'permission' | 'server' | 'unknown', message: string } => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('TypeError: Failed to fetch')) {
      return { type: 'network', message: 'Network connection failed. Please check your internet connection and try again.' };
    }
    
    if (errorMessage.includes('infinite recursion') || errorMessage.includes('42P17')) {
      return { type: 'permission', message: 'Database configuration issue. Please try refreshing the page or contact support if the problem persists.' };
    }
    
    if (errorMessage.includes('Invalid session') || errorMessage.includes('401')) {
      return { type: 'auth', message: 'Your session has expired. Please sign in again.' };
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
      return { type: 'permission', message: 'Access denied. You do not have permission to view these bookings.' };
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      return { type: 'server', message: 'Server error occurred. Please try again in a few moments.' };
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
  }, [user, authLoading, navigate]);

  // Enhanced fetch trips function with better error handling
  const fetchTrips = async (showLoadingState = true) => {
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
            throw new Error('No active session - please sign in again');
          }

          // Call the Edge Function with proper authorization
          const response = await withRetry(async () => {
            return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-user-data?type=bookings&filter=${activeTab}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `${session.access_token}`
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
                title: `No ${activeTab} bookings`,
                description: activeTab === 'upcoming' 
                  ? "You don't have any upcoming bookings." 
                  : "You don't have any past bookings.",
                variant: "default"
              });
            }
            
            return; // Success, exit function
          } else {
            const errorText = await response.text();
            console.error('[fetchTrips] Edge Function failed:', response.status, errorText);
            throw new Error(`Edge Function failed: ${response.status}`);
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
          throw new Error('Could not determine user email for booking lookup');
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
          title: `No ${activeTab} bookings`,
          description: activeTab === 'upcoming' 
            ? "You don't have any upcoming bookings." 
            : "You don't have any past bookings.",
          variant: "default"
        });
      }

    } catch (error: any) {
      const classifiedError = classifyError(error);
      console.error('[fetchTrips] All methods failed:', classifiedError);
      setError(classifiedError.message);
      
      // Show user-friendly error message
      toast({
        title: "Error Loading Bookings",
        description: classifiedError.message,
        variant: "destructive",
        action: classifiedError.type === 'network' ? (
          <button 
            onClick={() => fetchTrips()} 
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        ) : undefined
      });
      
      // For auth errors, suggest re-authentication
      if (classifiedError.type === 'auth') {
        setTimeout(() => {
          navigate('/login', { 
            state: { from: location, message: 'Please sign in again to access your bookings.' },
            replace: true 
          });
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch trips when user or activeTab changes
  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user, activeTab]);

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
              'Authorization': `${session.access_token}`
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
        title: "Error Loading Details",
        description: "Could not load booking details. Please try again.",
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
        title: "Booking Linked",
        description: "This booking has been linked to your account.",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error linking booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link booking to your account.",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p>Loading authentication...</p>
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
                <p>Loading your bookings...</p>
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
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl">Your Bookings</h1>
            
            {/* Refresh button */}
            <button
              onClick={() => fetchTrips()}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <p>{error}</p>
              </div>
              <button
                onClick={() => fetchTrips()}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-white rounded-lg shadow-sm p-1 mb-8 max-w-xs">
            <button
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'upcoming' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'past' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('past')}
            >
              Past
            </button>
          </div>

          {/* Bookings List */}
          <div className="space-y-6">
            {trips.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-600">
                  {activeTab === 'upcoming' 
                    ? 'No upcoming bookings' 
                    : 'No past bookings'
                  }
                </p>
                <button
                  onClick={() => navigate('/booking')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book a Transfer
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">
                          {format(new Date(trip.datetime), 'MMM d, yyyy')}
                        </span>
                        <span className="text-gray-400">•</span>
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span>{format(new Date(trip.datetime), 'h:mm a')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(trip.status)}`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                        {trip.booking_reference && (
                          <span className="text-xs text-gray-500 font-mono">
                            {trip.booking_reference}
                          </span>
                        )}
                        
                        {/* Show indicator if booking is not linked to user account */}
                        {!trip.user_id && userData?.email === trip.customer_email && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening details
                              handleLinkUnlinkedBooking(trip);
                            }}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                            title="Link to my account"
                          >
                            Link
                          </button>
                        )}
                        
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-500">From</div>
                          <div className="text-sm font-medium truncate">{trip.pickup_address}</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-500">To</div>
                          <div className="text-sm font-medium truncate">{trip.dropoff_address}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5 text-gray-400" />
                        <span>€{trip.estimated_price?.toFixed(2) || '0.00'}</span>
                      </div>
                      {trip.estimated_distance_km > 0 && (
                        <div className="text-sm text-gray-500">
                          {trip.estimated_distance_km} km • {trip.estimated_duration_min} min
                        </div>
                      )}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowDetails(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-6">
                      <h2 className="text-2xl">Booking Details</h2>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Trip Details */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Trip Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Booking Reference</p>
                            <p className="font-mono">{selectedBooking.booking_reference}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p>{format(new Date(selectedBooking.datetime), 'PPP p')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Vehicle Type</p>
                            <p>{selectedBooking.vehicle_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Passengers</p>
                            <p>{selectedBooking.passengers}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div>
                            <p className="text-sm text-gray-500">From</p>
                            <p>{selectedBooking.pickup_address}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">To</p>
                            <p>{selectedBooking.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                        <div className="space-y-4">
                          <div className="flex items-center">
                            <Mail className="w-5 h-5 text-gray-400 mr-2" />
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p>{selectedBooking.customer_email}</p>
                            </div>
                          </div>
                          {selectedBooking.customer_phone && (
                            <div className="flex items-center">
                              <Phone className="w-5 h-5 text-gray-400 mr-2" />
                              <div>
                                <p className="text-sm text-gray-500">Phone</p>
                                <p>{selectedBooking.customer_phone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Information */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Payment</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Amount</p>
                            <p>€{selectedBooking.estimated_price.toFixed(2)}</p>
                          </div>
                          {selectedBooking.payment_method && (
                            <div>
                              <p className="text-sm text-gray-500">Payment Method</p>
                              <p className="capitalize">{selectedBooking.payment_method}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Information */}
                      {selectedBooking.notes && (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
                          <p className="text-gray-600">{selectedBooking.notes}</p>
                        </div>
                      )}
                      
                      {/* Account linking status */}
                      {!selectedBooking.user_id && userData?.email === selectedBooking.customer_email && (
                        <div className="bg-blue-50 p-4 rounded-md">
                          <h3 className="text-blue-700 font-medium mb-2">Link This Booking</h3>
                          <p className="text-sm text-blue-600 mb-3">
                            This booking matches your email but isn't linked to your account yet.
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkUnlinkedBooking(selectedBooking);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            disabled={loadingDetails}
                          >
                            {loadingDetails ? (
                              <><Loader2 className="w-4 h-4 mr-2 inline animate-spin" /> Linking...</>
                            ) : (
                              'Link to My Account'
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowDetails(false)}
                      className="w-full mt-8 bg-gray-100 text-gray-600 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Bookings;