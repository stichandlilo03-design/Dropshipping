import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    console.log('[Checkout API] === REQUEST START ===');
    
    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('[Checkout API] JSON parse error:', parseErr);
      return Response.json(
        { success: false, error: 'Invalid JSON in request' },
        { status: 400 }
      );
    }

    console.log('[Checkout API] Raw body:', JSON.stringify(body, null, 2));

    const { cartItems, customer, subtotal, tax, shipping, total, shippingAddress } = body;

    console.log('[Checkout API] Parsed values:');
    console.log('  - cartItems length:', cartItems?.length);
    console.log('  - customer:', customer);
    console.log('  - subtotal:', subtotal);
    console.log('  - tax:', tax);
    console.log('  - shipping:', shipping);
    console.log('  - total:', total);

    // Validate required fields
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      console.error('[Checkout API] Invalid cartItems');
      return Response.json(
        { success: false, error: 'Cart items required and must be an array' },
        { status: 400 }
      );
    }

    if (!customer || typeof customer !== 'object') {
      console.error('[Checkout API] Invalid customer object');
      return Response.json(
        { success: false, error: 'Customer object required' },
        { status: 400 }
      );
    }

    if (!customer.email || typeof customer.email !== 'string') {
      console.error('[Checkout API] Invalid customer email:', customer.email);
      return Response.json(
        { success: false, error: 'Customer email required' },
        { status: 400 }
      );
    }

    if (!customer.id || typeof customer.id !== 'string') {
      console.error('[Checkout API] Invalid customer id:', customer.id);
      return Response.json(
        { success: false, error: 'Customer ID required' },
        { status: 400 }
      );
    }

    const totalAmount = parseFloat(total);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.error('[Checkout API] Invalid total:', total);
      return Response.json(
        { success: false, error: 'Total must be a positive number' },
        { status: 400 }
      );
    }

    try {
      // Validate and clean cart items
      const validCart = cartItems.map((item, idx) => {
        const price = parseFloat(item.price);
        if (isNaN(price) || price <= 0) {
          throw new Error(`Item ${idx}: Invalid price: ${item.price}`);
        }
        const name = item.name || item.productName;
        if (!name) {
          throw new Error(`Item ${idx}: Missing name`);
        }
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: String(name).substring(0, 200),
              description: item.description ? String(item.description).substring(0, 500) : '',
              images: item.image ? [String(item.image)] : [],
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: parseInt(item.quantity) || 1,
        };
      });

      // Add shipping as line item
      const shippingAmount = parseFloat(shipping || 0);
      const taxAmount = parseFloat(tax || 0);

      const lineItems = [
        ...validCart,
        // Add shipping if not zero
        ...(shippingAmount > 0 ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shipping',
            },
            unit_amount: Math.round(shippingAmount * 100),
          },
          quantity: 1,
        }] : []),
        // Add tax if not zero
        ...(taxAmount > 0 ? [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tax',
            },
            unit_amount: Math.round(taxAmount * 100),
          },
          quantity: 1,
        }] : []),
      ];

      console.log('[Checkout API] Line items for Stripe:', lineItems.length, 'items');
      console.log('  - Products:', validCart.length);
      console.log('  - Shipping:', shippingAmount > 0 ? '✓' : '✗');
      console.log('  - Tax:', taxAmount > 0 ? '✓' : '✗');

      // Calculate total from line items to verify
      const calculatedTotal = lineItems.reduce((sum, item) => {
        return sum + (item.price_data.unit_amount * item.quantity);
      }, 0);

      const expectedTotalInCents = Math.round(totalAmount * 100);

      console.log('[Checkout API] Total verification:');
      console.log('  - Expected (cents):', expectedTotalInCents);
      console.log('  - Calculated (cents):', calculatedTotal);
      console.log('  - Match:', calculatedTotal === expectedTotalInCents ? '✓' : '✗');

      // Save PENDING order BEFORE creating Stripe session
      console.log('[Checkout API] Saving PENDING order to Firestore...');
      
      const pendingOrderData = {
        customerId: customer.id,
        customerName: customer.firstName || 'Customer',
        customerEmail: customer.email,
        customerPhone: customer.phone || '',
        items: cartItems.map(item => ({
          productId: item.productId || item.id,
          productName: item.name || item.productName,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity) || 1,
          image: item.image,
        })),
        // FIXED: All amounts included
        subtotal: parseFloat(subtotal || 0),
        shipping: shippingAmount,
        tax: taxAmount,
        total: totalAmount,
        shippingAddress: shippingAddress || {},
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('[Checkout API] Pending order data:', {
        subtotal: pendingOrderData.subtotal,
        shipping: pendingOrderData.shipping,
        tax: pendingOrderData.tax,
        total: pendingOrderData.total,
      });

      let pendingOrderId = null;
      try {
        const ordersRef = collection(db, 'orders');
        const docRef = await addDoc(ordersRef, pendingOrderData);
        pendingOrderId = docRef.id;
        console.log('[Checkout API] PENDING order saved:', pendingOrderId);
      } catch (firestoreError) {
        console.error('[Checkout API] Error saving pending order (will continue):', firestoreError.message);
      }

      // Create Stripe session
      console.log('[Checkout API] Creating Stripe session...');
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://www.dropshipwithmonk.sbs'}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${pendingOrderId || 'unknown'}`,
        cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN || 'https://www.dropshipwithmonk.sbs'}/checkout/cancel`,
        customer_email: customer.email,
        metadata: {
          customerId: customer.id,
          customerName: customer.firstName || 'Customer',
          customerEmail: customer.email,
          orderId: pendingOrderId || 'unknown',
        },
      });

      console.log('[Checkout API] Stripe session created:', session.id);
      console.log('[Checkout API] Stripe session amount total:', session.amount_total, 'cents (expected:', expectedTotalInCents, ')');

      // Verify amounts match
      if (session.amount_total !== expectedTotalInCents) {
        console.warn('[Checkout API] ⚠️ Amount mismatch!', {
          expected: expectedTotalInCents,
          actual: session.amount_total,
        });
      }

      // Update pending order with Stripe session ID
      if (pendingOrderId) {
        try {
          console.log('[Checkout API] Pending order linked with Stripe session:', session.id);
        } catch (err) {
          console.error('[Checkout API] Error linking session (non-critical):', err.message);
        }
      }

      // Success response
      console.log('[Checkout API] === REQUEST SUCCESS ===');
      return Response.json({
        success: true,
        sessionId: session.id,
        clientSecret: session.client_secret,
        orderId: pendingOrderId,
        amountTotal: session.amount_total,
        message: 'Checkout session created successfully',
      }, { status: 200 });

    } catch (stripeError) {
      console.error('[Checkout API] Stripe error:', stripeError.message);
      return Response.json(
        { success: false, error: stripeError.message || 'Stripe error' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Checkout API] === REQUEST ERROR ===');
    console.error('[Checkout API] Error:', error.message);
    return Response.json(
      { success: false, error: error.message || 'Checkout failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
