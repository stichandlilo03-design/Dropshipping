import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { cartItems, customer, subtotal, tax, total, shippingAddress } = body;

    console.log('[Checkout API] Request received');
    console.log('[Checkout API] Items:', cartItems?.length);
    console.log('[Checkout API] Customer:', customer?.email);
    console.log('[Checkout API] Total:', total);

    if (!cartItems || cartItems.length === 0) {
      return Response.json(
        { success: false, error: 'Cart is empty' },
        { status: 400 }
      );
    }

    if (!customer || !customer.email) {
      return Response.json(
        { success: false, error: 'Customer email required' },
        { status: 400 }
      );
    }

    if (!total) {
      return Response.json(
        { success: false, error: 'Total amount required' },
        { status: 400 }
      );
    }

    try {
      // Create line items for Stripe
      const lineItems = cartItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name || item.productName || 'Product',
            description: item.description || '',
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round((parseFloat(item.price) || 0) * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      }));

      console.log('[Checkout API] Line items:', lineItems.length);

      // Create Stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://www.dropshipwithmonk.sbs'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://www.dropshipwithmonk.sbs'}/checkout/cancel`,
        customer_email: customer.email,
        metadata: {
          customerId: customer.id || 'unknown',
          customerName: customer.firstName || 'Customer',
          customerEmail: customer.email,
        },
      });

      console.log('[Checkout API] Stripe session created:', session.id);

      // Save order to Firestore before payment
      // This way we have a record even if payment fails
      try {
        const orderData = {
          id: session.id,
          stripeSessionId: session.id,
          customerId: customer.id,
          customerName: customer.firstName || 'Customer',
          customerEmail: customer.email,
          customerPhone: customer.phone || '',
          items: cartItems.map(item => ({
            productId: item.id,
            productName: item.name || item.productName,
            price: parseFloat(item.price),
            quantity: item.quantity || 1,
            image: item.image,
          })),
          subtotal: parseFloat(subtotal || 0),
          tax: parseFloat(tax || 0),
          total: parseFloat(total),
          shippingAddress: shippingAddress || {},
          status: 'pending_payment', // Not yet paid
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log('[Checkout API] Saving order to Firestore...');

        // Try to save to Firestore, but don't fail if it doesn't work
        try {
          const ordersRef = collection(db, 'orders');
          const docRef = await addDoc(ordersRef, orderData);
          console.log('[Checkout API] Order saved:', docRef.id);
        } catch (firestoreError) {
          console.error('[Checkout API] Firestore save error (non-fatal):', firestoreError.message);
          // Don't fail checkout if Firestore save fails
          // Stripe session is created, that's what matters
        }
      } catch (orderError) {
        console.error('[Checkout API] Order creation error:', orderError);
        // Don't fail - Stripe session is already created
      }

      // Return Stripe session
      return Response.json({
        success: true,
        sessionId: session.id,
        clientSecret: session.client_secret,
        message: 'Checkout session created successfully',
      });
    } catch (stripeError) {
      console.error('[Checkout API] Stripe error:', stripeError);
      return Response.json(
        { success: false, error: stripeError.message || 'Stripe error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Checkout API] Error:', error);
    return Response.json(
      { success: false, error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
