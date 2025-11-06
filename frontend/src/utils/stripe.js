import { loadStripe } from '@stripe/stripe-js';

// Use your DIRECT Stripe publishable key here
const stripePromise = loadStripe(import.meta.env.VITE__STRIPE_PUBLISHABLE_KEY);

// Test if Stripe loaded
stripePromise.then(stripe => {
  console.log('✅ Stripe loaded successfully');
}).catch(error => {
  console.error('❌ Stripe failed to load:', error);
});

export default stripePromise;