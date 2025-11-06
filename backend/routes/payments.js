// File: routes/payments.js - WITH HARDCODED KEY
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';


dotenv.config();

const router = express.Router();


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-payment-intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    console.log('🔹 Creating payment intent for amount:', req.body.amount);
    
    const { amount, currency = 'inr', room } = req.body;
    
    // Validate required fields
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // FIX: Use minimal metadata - remove long room descriptions
    const limitedMetadata = {
      roomId: room?._id || 'unknown',
      roomName: room?.name ? room.name.substring(0, 100) : 'Room',
      type: 'room_booking'
    };

    console.log('🔹 Creating Stripe payment intent with metadata:', limitedMetadata);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in paise (100 = ₹1.00)
      currency: currency, // 'inr' for Indian Rupees
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: limitedMetadata // Use the fixed metadata
    });

    console.log('✅ Payment intent created successfully:', paymentIntent.id);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      status: 'requires_payment_method'
    });

  } catch (error) {
    console.error('❌ Error creating payment intent:', error.message);
    res.status(500).json({ 
      error: 'Payment creation failed',
      message: error.message,
      details: 'Check server logs for more information'
    });
  }
});

export default router;