// File: StripePayment.jsx - COMPLETE FIX FOR INR
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';

// Use your actual Stripe publishable key
const stripePromise = loadStripe(import.meta.env.VITE__STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ amount, room, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate proper amount display for INR
  const displayAmount = amount ? (amount / 100).toFixed(2) : '0.00';

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      console.error('Stripe not loaded');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🟡 Step 1: Creating payment intent for:', amount);
      
      if (!amount || amount < 1) {
        throw new Error('Invalid amount');
      }

      // Send payment data with INR currency
      const paymentData = {
        amount: amount,
        currency: 'inr', // CHANGE TO INR
        room: {
          _id: room?._id || 'unknown',
          name: room?.name || 'Room',
        }
      };

      console.log('🟡 Sending payment data:', paymentData);

      // Step 1: Create Payment Intent
      const { data } = await axios.post('/api/payments/create-payment-intent', paymentData);
      
      console.log('🟡 Step 2: Payment intent created:', data);

      // Step 2: Confirm Payment with Stripe
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        console.error('🔴 Stripe confirmation error:', result.error);
        setError(result.error.message);
        return;
      }

      console.log('✅ Step 3: Payment successful:', result.paymentIntent);
      onSuccess(result.paymentIntent);
      
    } catch (error) {
      console.error('🔴 Payment failed:', error);
      setError(error.response?.data?.message || error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: '15px'
        }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '20px' }}>Complete Your Booking</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Room Details */}
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '18px' }}>
              {room?.name || 'Conference Room'}
            </h4>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {room?.description || 'Premium conference room'}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '10px',
            borderTop: '1px solid #e0e0e0'
          }}>
            <span style={{ fontWeight: '500', color: '#333' }}>Total Amount:</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#000' }}>
              ₹{displayAmount} {/* CHANGE TO INR SYMBOL */}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333'
            }}>
              Card Details
            </label>
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: '#fff'
            }}>
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    },
                  },
                  hidePostalCode: true,
                }}
              />
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!stripe || loading || !amount}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: (!stripe || loading || !amount) ? '#ccc' : '#007bff',
                color: '#fff',
                cursor: (!stripe || loading || !amount) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '120px'
              }}
            >
              {loading ? 'Processing...' : `Pay ₹${displayAmount}`} {/* CHANGE TO INR */}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StripePayment = ({ amount, room, onSuccess, onClose }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm 
        amount={amount} 
        room={room} 
        onSuccess={onSuccess} 
        onClose={onClose} 
      />
    </Elements>
  );
};

export default StripePayment;