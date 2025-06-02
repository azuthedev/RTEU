import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, ChevronRight, Loader2, Phone, Mail, User, Car, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/use-toast';

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
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { 
        state: { from: location },
        replace: true 
      });
    }
  }, [user, authLoading, navigate]);

  // Fetch trips - both user's trips and trips made with user's email
  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) return;

      try {
        const now = new Date().toISOString();
        setLoading(true);
        setError(null);

        // First get the user's email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user email:', userError);
          throw new Error('Could not retrieve your user information. Please try again.');
        }

        if (!userData?.email) {
          throw new Error('User email not found');
        }

        console.log('Fetching trips for user:', user.id, 'with email:', userData.email);

        // Build query to fetch both user_id-linked AND email-matched bookings
        const query = supabase
          .from('trips')
          .select('*')
          .or(`user_id.eq.${user.id},customer_email.eq.${userData.email}`)
          .order('datetime', { ascending: activeTab === 'upcoming' });

        const { data, error } = await query;

        if (error) throw error;

        console.log(`Found ${data?.length || 0} trips for user`);

        // Filter by date based on the active tab
        let filteredTrips = [];
        if (activeTab === 'upcoming') {
          filteredTrips = data.filter(trip => 
            new Date(trip.datetime) >= new Date(now)
          );
        } else {
          filteredTrips = data.filter(trip => 
            new Date(trip.datetime) < new Date(now)
          );
        }

        setTrips(filteredTrips);
        console.log(`Filtered to ${filteredTrips.length} ${activeTab} trips`);

        // If no trips found, show toast
        if (filteredTrips.length === 0) {
          toast({
            title: `No ${activeTab} bookings`,
            description: activeTab === 'upcoming' 
              ? "You don't have any upcoming bookings." 
              : "You don't have any past bookings.",
            variant: "default"
          });
        }
      } catch (error: any) {
        console.error('Error fetching trips:', error);
        setError(error.message || 'Failed to load bookings');
        
        toast({
          title: "Error Loading Bookings",
          description: error.message || "Could not load your bookings. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTrips();
    }
  }, [user, activeTab, toast]);

  const fetchBookingDetails = async (tripId: string) => {
    setLoadingDetails(true);
    try {
      // Simplified query to only fetch trip data
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookingClick = async (trip: Trip) => {
    const details = await fetchBookingDetails(trip.id);
    setSelectedBooking(details);
    setShowDetails(true);
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
      
      if (error) throw error;
      
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
        variant: "success"
      });
    } catch (error) {
      console.error('Error linking booking:', error);
      toast({
        title: "Error",
        description: "Failed to link booking to your account.",
        variant: "destructive"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p>Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl mb-8">Your Bookings</h1>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{error}</p>
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

      <Sitemap />
    </div>
  );
};

export default Bookings;