// File: src/components/Booking.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../utils/stripe';
import StripePayment from '../components/StripePayment';

const Booking = () => {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentBookingData, setPaymentBookingData] = useState(null)
  const [bookingData, setBookingData] = useState({
    bookingDate: '',
    startTime: '09:00',
    endTime: '10:00',
    totalHours: 1
  })

  // Debug: Check token
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🔐 Token on mount:', token ? `Exists (${token.length} chars)` : 'Missing');
    console.log('🔐 User from auth:', user);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchRoom()
  }, [roomId, user, navigate])

  useEffect(() => {
    calculateTotalHours()
  }, [bookingData.startTime, bookingData.endTime])

  const fetchRoom = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}`)
      setRoom(response.data)
    } catch (error) {
      console.error('Error fetching room:', error)
    }
  }

  const calculateTotalHours = () => {
    if (bookingData.startTime && bookingData.endTime) {
      const start = new Date(`2000-01-01T${bookingData.startTime}`)
      const end = new Date(`2000-01-01T${bookingData.endTime}`)
      const diff = (end - start) / (1000 * 60 * 60)
      setBookingData(prev => ({
        ...prev,
        totalHours: diff > 0 ? diff : 1
      }))
    }
  }

  const handleChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value
    })
  }

  const handleProceedToPay = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to book a room');
      navigate('/login');
      return;
    }

    // Validate booking date
    if (!bookingData.bookingDate) {
      alert('Please select a booking date');
      return;
    }

    // Calculate total amount
    const totalAmount = room.pricePerHour * bookingData.totalHours;

    // Prepare data for payment
    setPaymentBookingData({
      room: room,
      bookingDate: bookingData.bookingDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      totalAmount: Math.round(totalAmount),
      totalHours: bookingData.totalHours,
      userName: user.name,
      userEmail: user.email,
      roomName: room.name,
      roomId: room._id
    });
    
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      setLoading(true);
      
      // Get token and verify it exists
      const token = localStorage.getItem('token');
      console.log('🔐 Token for booking:', token ? `Exists (${token.length} chars)` : 'MISSING!');
      
      if (!token) {
        alert('❌ No authentication token found. Please login again.');
        navigate('/login');
        return;
      }

      console.log('🟡 Creating booking with data:', {
        roomId: paymentBookingData.roomId,
        bookingDate: paymentBookingData.bookingDate,
        startTime: paymentBookingData.startTime,
        endTime: paymentBookingData.endTime,
        totalHours: paymentBookingData.totalHours,
      });

      // Create booking with payment details
      const bookingResponse = await axios.post('http://localhost:5000/api/bookings', {
        roomId: paymentBookingData.roomId,
        bookingDate: paymentBookingData.bookingDate,
        startTime: paymentBookingData.startTime,
        endTime: paymentBookingData.endTime,
        totalHours: paymentBookingData.totalHours,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Booking created successfully:', bookingResponse.data);
      alert('🎉 Booking confirmed! Payment successful.');
      
      // Redirect to my bookings
      navigate('/my-bookings');
      
    } catch (error) {
      console.error('🔴 FULL Booking creation error:');
      console.error('🔴 Status:', error.response?.status);
      console.error('🔴 Error message:', error.response?.data?.message);
      console.error('🔴 Error details:', error.response?.data);
      
      if (error.response?.status === 401) {
        alert('❌ Authentication failed. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 400) {
        alert(`❌ Booking failed: ${error.response.data.message}`);
      } else if (error.response?.status === 404) {
        alert('❌ Booking endpoint not found. Please contact support.');
      } else {
        alert('❌ Booking creation failed. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
      setShowPayment(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading room details...</div>
      </div>
    )
  }

  const totalAmount = room.pricePerHour * bookingData.totalHours

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book Your Room</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-6">Booking Details</h2>
            
            <form onSubmit={handleProceedToPay} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking Date
                </label>
                <input
                  type="date"
                  name="bookingDate"
                  value={bookingData.bookingDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <select
                    name="startTime"
                    value={bookingData.startTime}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 9 // 9 AM to 8 PM
                      return (
                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <select
                    name="endTime"
                    value={bookingData.endTime}
                    onChange={handleChange}
                    className="input-field"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const hour = i + 10 // 10 AM to 9 PM
                      return (
                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Room:</span>
                    <span>{room.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{bookingData.totalHours} hour(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span>₹{room.pricePerHour}/hour</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Amount:</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !bookingData.bookingDate}
                className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Proceed to Pay ₹${totalAmount}`}
              </button>
            </form>
          </div>

          {/* Room Summary */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4">Room Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{room.name}</h3>
                <p className="text-gray-600">{room.type}</p>
              </div>
              
              <div className="flex items-center text-gray-600">
                <span className="font-medium mr-2">Location:</span>
                <span>{room.location}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <span className="font-medium mr-2">Capacity:</span>
                <span>{room.capacity} people</span>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Facilities:</h4>
                <div className="flex flex-wrap gap-2">
                  {room.facilities.map((facility, index) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-gray-600">{room.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Payment Modal */}
        {showPayment && paymentBookingData && (
          <Elements stripe={stripePromise}>
            <StripePayment
              amount={paymentBookingData.totalAmount * 100} // Convert to paise
              room={{
                _id: room._id,
                name: room.name,
                description: room.description
              }}
              onSuccess={handlePaymentSuccess}
              onClose={() => setShowPayment(false)}
            />
          </Elements>
        )}
      </div>
    </div>
  )
}

export default Booking