import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    // Verify webhook is from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('💳 Stripe event:', event.type);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const shopifyOrderId = paymentIntent.metadata.shopify_order_id;

      console.log('Payment confirmed for order:', shopifyOrderId);

      // Update order status
      await updateDoc(doc(db, 'orders', shopifyOrderId), {
        paymentStatus: 'confirmed',
        paymentIntentId: paymentIntent.id,
        paymentConfirmedAt: new Date(),
      });

      console.log('✅ Payment status updated');
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
