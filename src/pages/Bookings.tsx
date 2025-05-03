import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Sitemap from '../components/Sitemap';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
}

interface BookingDetails extends Trip {
  driver?: {
    name: string;
    phone: string;
  };
  vehicle?: {
    make: string;
    model: string;
    plate_number: string;
  };
  payment?: {
    status: string;
    payment_method: string;
  };
}

const Bookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

        // First get the user's email
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', user.id)
          .single();

        if (!userData?.email) {
          throw new Error('User email not found');
        }

        // Fetch trips by user_id and customer_email (for non-logged-in bookings)
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .or(`user_id.eq.${user.id},customer_email.eq.${userData.email}`)
          .order('datetime', { ascending: activeTab === 'upcoming' });

        if (error) throw error;

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
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTrips();
    }
  }, [user, activeTab]);

  const fetchBookingDetails = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          driver:drivers(
            user:users(
              name,
              phone
            )
          ),
          vehicle:vehicles(
            make,
            model,
            plate_number
          ),
          payment:payments(
            status,
            payment_method
          )
        `)
        .eq('id', tripId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return null;
    }
  };

  const handleBookingClick = async (trip: Trip) => {
    const details = await fetchBookingDetails(trip.id);
    setSelectedBooking(details);
    setShowDetails(true);
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
          <h1 className="text-3xl font-bold mb-8">Your Bookings</h1>

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
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          trip.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : trip.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                        {trip.booking_reference && (
                          <span className="text-xs text-gray-500 font-mono">
                            {trip.booking_reference}
                          </span>
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
                <h2 className="text-2xl font-bold mb-6">Booking Details</h2>
                
                <div className="space-y-6">
                  {/* Trip Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Trip Information</h3>
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
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="capitalize">{selectedBooking.status}</p>
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

                  {/* Driver Details */}
                  {selectedBooking.driver && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Driver</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p>{selectedBooking.driver.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p>{selectedBooking.driver.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vehicle Details */}
                  {selectedBooking.vehicle && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Vehicle</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Vehicle</p>
                          <p>{selectedBooking.vehicle.make} {selectedBooking.vehicle.model}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Plate Number</p>
                          <p>{selectedBooking.vehicle.plate_number}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Payment</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p>€{selectedBooking.estimated_price.toFixed(2)}</p>
                      </div>
                      {selectedBooking.payment && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Payment Method</p>
                            <p className="capitalize">
                              {selectedBooking.payment.payment_method.replace('_', ' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Payment Status</p>
                            <p className="capitalize">{selectedBooking.payment.status}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full mt-8 bg-gray-100 text-gray-600 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
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