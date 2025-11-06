// File: routes/bookings.js
import express from 'express';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendBookingConfirmation, sendCancellationEmail } from '../services/emailService.js';

const router = express.Router();

console.log('🔍 Bookings route loaded successfully');

// Middleware to verify token with detailed logging
const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('🔐 Auth header received:', authHeader ? 'Present' : 'Missing');
  
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    console.log('❌ No token provided in request');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    console.log('🔐 Token verification attempt, length:', token.length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.userId);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Create booking with detailed logging
router.post('/', verifyToken, async (req, res) => {
  try {
    console.log('📝 Booking creation request received for user:', req.userId);
    console.log('📝 Request body:', req.body);
    
    const { roomId, bookingDate, startTime, endTime, totalHours } = req.body;

    // Validate required fields
    if (!roomId || !bookingDate || !startTime || !endTime || !totalHours) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      console.log('❌ Room not found:', roomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      console.log('❌ User not found:', req.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      room: roomId,
      bookingDate: new Date(bookingDate),
      startTime: { $lte: endTime },
      endTime: { $gte: startTime },
      status: { $in: ['confirmed'] }
    });

    if (conflictingBooking) {
      console.log('❌ Conflicting booking found');
      return res.status(400).json({ message: 'Room already booked for this time slot' });
    }

    const totalAmount = room.pricePerHour * totalHours;
    console.log('💰 Calculated total amount:', totalAmount);

    const booking = await Booking.create({
      user: req.userId,
      room: roomId,
      bookingDate,
      startTime,
      endTime,
      totalHours,
      totalAmount,
      paymentStatus: 'completed',
      status: 'confirmed'
    });

    console.log('✅ Booking created with ID:', booking._id);

    // Generate QR code data
    const qrData = `ROOMBOOK:${booking._id}:${room.name}:${booking.bookingDate}:${booking.startTime}-${booking.endTime}:${user.email}`;
    booking.qrCode = qrData;
    await booking.save();

    // Send confirmation email with QR code
    try {
      await sendBookingConfirmation(booking, user, room);
      console.log('✅ Confirmation email sent');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
    }

    await booking.populate('room');
    await booking.populate('user', 'name email mobileNumber');

    console.log('✅ Booking process completed successfully');
    res.status(201).json(booking);
    
  } catch (error) {
    console.error('❌ Booking creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    console.log('📖 Fetching bookings for user:', req.userId);
    const bookings = await Booking.find({ user: req.userId })
      .populate('room')
      .sort({ createdAt: -1 });
    
    console.log(`📖 Found ${bookings.length} bookings for user ${req.userId}`);
    res.json(bookings);
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel booking
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    console.log('❌ Cancel booking request for:', req.params.id);
    const booking = await Booking.findOne({ _id: req.params.id, user: req.userId })
      .populate('room')
      .populate('user', 'name email');
    
    if (!booking) {
      console.log('❌ Booking not found for cancellation');
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Send cancellation email
    try {
      await sendCancellationEmail(booking, booking.user, booking.room);
      console.log('✅ Cancellation email sent');
    } catch (emailError) {
      console.error('❌ Cancellation email failed:', emailError);
    }

    console.log('✅ Booking cancelled successfully');
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('❌ Booking cancellation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;