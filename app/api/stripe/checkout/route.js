import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Initialize Firebase Admin SDK for server-side access
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request) {
  try {
    const body = await request.json();
    
    const {
      orderId,
      productId,
      productName,
      productPrice,
      quantity,
      customerEmail,
      customerName,
      shippingCost,
      tax,
    } = body;

    console.log('[Stripe Dynamic] Creating checkout for order:', orderId);
    console.log('[Stripe Dynamic] Product ID:', productId);

    // STEP 1: Get product from Firestore to find admin
    console.log('[Stripe Dynamic] Fetching product details...');
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      console.error('[Stripe Dynamic] Product not found:', productId);
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    const productData = productSnap.data();
    const adminUserId = productData.userId;

    console.log('[Stripe Dynamic] Product owner (admin) ID:', adminUserId);

    // STEP 2: Get admin's Stripe keys from their profile
    console.log('[Stripe Dynamic] Fetching admin Stripe keys...');
    const adminRef = doc(db, 'users', adminUserId, 'integrations', 'stripe');
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      console.error('[Stripe Dynamic] Admin has no Stripe keys configured:', adminUserId);
      return NextResponse.json(
        {
          success: false,
          error: 'Product owner has not configured Stripe payment processing',
        },
        { status: 400 }
      );
    }

    const stripeData = adminSnap.data();
    const stripeSecretKey = stripeData.secretKey;

    if (!stripeSecretKey) {
      console.error('[Stripe Dynamic] Admin Stripe secret key is empty:', adminUserId);
      return NextResponse.json(
        {
          success: false,
          error: 'Product owner Stripe configuration is incomplete',
        },
        { status: 400 }
      );
    }

    console.log('[Stripe Dynamic] Using admin Stripe account:', stripeData.accountId || 'N/A');

    // STEP 3: Create Stripe instance with admin's key
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecretKey);

    // STEP 4: Calculate totals in cents
    const unitPriceInCents = Math.round(parseFloat(productPrice) * 100);
    const subtotalInCents = unitPriceInCents * quantity;
    const shippingInCents = Math.round(parseFloat(shippingCost) * 100);
    const taxInCents = Math.round(parseFloat(tax) * 100);
    const totalInCents = subtotalInCents + shippingInCents + taxInCents;

    console.log('[Stripe Dynamic] Price breakdown:', {
      unitPrice: unitPriceInCents,
      subtotal: subtotalInCents,
      shipping: shippingInCents,
      tax: taxInCents,
      total: totalInCents,
    });

    // STEP 5: Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    console.log('[Stripe Dynamic] Base URL:', baseUrl);

    // STEP 6: Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: `Quantity: ${quantity}`,
              metadata: {
                orderId: orderId,
                productId: productId,
                adminId: adminUserId,
              },
            },
            unit_amount: unitPriceInCents,
          },
          quantity: quantity,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping',
            },
            unit_amount: shippingInCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tax',
            },
            unit_amount: taxInCents,
          },
          quantity: 1,
        },
      ],
      
      mode: 'payment',
      success_url: `${baseUrl}/success?order=${orderId}`,
      cancel_url: `${baseUrl}/cancelled`,
      
      metadata: {
        orderId: orderId,
        productId: productId,
        adminId: adminUserId,
        customerName: customerName,
        customerEmail: customerEmail,
      },
    });

    console.log('[Stripe Dynamic] Session created:', session.id);
    console.log('[Stripe Dynamic] Checkout URL:', session.url);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      adminId: adminUserId,
    });

  } catch (error) {
    console.error('[Stripe Dynamic] Error:', error.message);
    console.error('[Stripe Dynamic] Full error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
