import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

    console.log('[Stripe Checkout] Creating checkout for order:', orderId);
    console.log('[Stripe Checkout] Product ID:', productId);

    // STEP 1: Get product from Firestore to find owner
    console.log('[Stripe Checkout] Fetching product details...');
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      console.error('[Stripe Checkout] Product not found:', productId);
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

    console.log('[Stripe Checkout] Product owner ID:', adminUserId);

    // STEP 2: Get admin's Stripe integration from their settings
    console.log('[Stripe Checkout] Fetching admin Stripe integration...');
    
    // The integrations are stored at: /users/{userId}/integrations/stripe
    const stripeIntegrationRef = doc(db, `users/${adminUserId}/integrations/stripe`);
    const stripeIntegrationSnap = await getDoc(stripeIntegrationRef);

    if (!stripeIntegrationSnap.exists()) {
      console.error('[Stripe Checkout] Admin has no Stripe integration:', adminUserId);
      return NextResponse.json(
        {
          success: false,
          error: 'Product owner has not configured Stripe payment processing. Please contact the store.',
        },
        { status: 400 }
      );
    }

    const integrationData = stripeIntegrationSnap.data();
    console.log('[Stripe Checkout] Integration data found:', integrationData.integrationId);

    // STEP 3: Extract Stripe credentials
    // The credentials are nested under: integrationData.credentials.secretKey
    let stripeSecretKey = null;

    // Try credentials.secretKey first (new format)
    if (integrationData.credentials && integrationData.credentials.secretKey) {
      stripeSecretKey = integrationData.credentials.secretKey;
      console.log('[Stripe Checkout] Found secretKey in credentials.secretKey');
    }
    // Try direct secretKey (old format)
    else if (integrationData.secretKey) {
      stripeSecretKey = integrationData.secretKey;
      console.log('[Stripe Checkout] Found secretKey directly on integration');
    }

    if (!stripeSecretKey) {
      console.error('[Stripe Checkout] No Stripe secret key found in integration data');
      console.log('[Stripe Checkout] Integration structure:', Object.keys(integrationData));
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe integration incomplete. Secret key not found.',
        },
        { status: 400 }
      );
    }

    console.log('[Stripe Checkout] ✅ Retrieved Stripe secret key');

    // STEP 4: Initialize Stripe
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecretKey);
    console.log('[Stripe Checkout] Stripe initialized');

    // STEP 5: Calculate totals in cents
    const unitPriceInCents = Math.round(parseFloat(productPrice) * 100);
    const subtotalInCents = unitPriceInCents * quantity;
    const shippingInCents = Math.round(parseFloat(shippingCost) * 100);
    const taxInCents = Math.round(parseFloat(tax) * 100);
    const totalInCents = subtotalInCents + shippingInCents + taxInCents;

    console.log('[Stripe Checkout] Totals:', {
      unitPrice: unitPriceInCents,
      subtotal: subtotalInCents,
      shipping: shippingInCents,
      tax: taxInCents,
      total: totalInCents,
    });

    // STEP 6: Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    console.log('[Stripe Checkout] Base URL:', baseUrl);

    // STEP 7: Create Stripe checkout session
    console.log('[Stripe Checkout] Creating Stripe session...');
    
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

    console.log('[Stripe Checkout] ✅ Session created:', session.id);
    console.log('[Stripe Checkout] Checkout URL:', session.url);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      adminId: adminUserId,
    });

  } catch (error) {
    console.error('[Stripe Checkout] Error:', error.message);
    console.error('[Stripe Checkout] Stack:', error.stack);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
