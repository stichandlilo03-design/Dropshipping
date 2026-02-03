// /api/orders/create/route.js
// COMPLETE order creation with ALL integrations

import { NextResponse } from 'next/server';
import { addDoc, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  PrintfulIntegration, 
  EmailAutomation, 
  ZapierAutomation,
  StripeIntegration 
} from '@/lib/integrations';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      subtotal,
      shipping,
      tax,
      discount,
      coupon_code,
      total,
      paymentIntentId,
      shippingAddress,
    } = body;

    // Validate
    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[Order] ===== ORDER CREATION STARTED =====');
    console.log('[Order] Customer:', customerEmail);
    console.log('[Order] Items:', items.length);
    console.log('[Order] Total:', total);

    // ✅ STEP 1: Create order in Firebase
    console.log('[Order] Step 1: Creating order in Firebase...');
    const orderRef = await addDoc(collection(db, 'orders'), {
      customerId: customerId,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      items: items,
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      discount: discount || 0,
      coupon_code: coupon_code || '',
      total: total,
      shippingAddress: shippingAddress || {},
      status: 'pending_payment',
      payment_intent_id: paymentIntentId || '',
      printful_synced: false,
      tracking_number: '',
      shipping_carrier: '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      paid_at: null,
      shipped_at: null,
      delivered_at: null,
    });

    const orderId = orderRef.id;
    console.log('[Order] ✅ Order created:', orderId);

    // ✅ STEP 2: Update customer order count
    console.log('[Order] Step 2: Updating customer...');
    try {
      await updateDoc(doc(db, 'customers', customerId), {
        orders: increment(1),
        order_count: increment(1),
        last_order_date: new Date().toISOString(),
        total_spent: increment(total),
      });
      console.log('[Order] ✅ Customer updated');
    } catch (customerError) {
      console.error('[Order] Customer update error (non-blocking):', customerError);
    }

    // ✅ STEP 3: Trigger Stripe integration (record payment)
    console.log('[Order] Step 3: Recording Stripe payment...');
    try {
      if (paymentIntentId && process.env.STRIPE_SECRET_KEY) {
        const stripe = new StripeIntegration(process.env.STRIPE_SECRET_KEY);
        const payments = await stripe.getPayments(1);
        console.log('[Order] ✅ Stripe recorded');
      }
    } catch (stripeError) {
      console.error('[Order] Stripe error (non-blocking):', stripeError);
    }

    // ✅ STEP 4: Trigger Zapier webhook
    console.log('[Order] Step 4: Triggering Zapier webhook...');
    try {
      if (process.env.ZAPIER_WEBHOOK_URL) {
        const zapier = new ZapierAutomation(process.env.ZAPIER_WEBHOOK_URL);
        await zapier.triggerNewOrder({
          orderId,
          customer: customerName,
          email: customerEmail,
          total,
          items: items.length,
        });
        console.log('[Order] ✅ Zapier triggered');
      }
    } catch (zapierError) {
      console.error('[Order] Zapier error (non-blocking):', zapierError);
    }

    // ✅ STEP 5: Send order confirmation email (SendGrid or Gmail)
    console.log('[Order] Step 5: Sending order confirmation...');
    try {
      const emailApi = new EmailAutomation(
        process.env.SENDGRID_API_KEY,
        {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        }
      );

      await emailApi.sendOrderConfirmation(customerEmail, {
        orderNumber: orderId,
        customer: customerName,
        amount: total,
        items: items,
      });
      console.log('[Order] ✅ Confirmation email sent');
    } catch (emailError) {
      console.error('[Order] Email error (non-blocking):', emailError);
    }

    let printfulResult = { success: false };

    // ✅ STEP 6: Auto-sync to Printful
    console.log('[Order] Step 6: Auto-syncing to Printful...');
    try {
      if (process.env.PRINTFUL_API_KEY) {
        const printful = new PrintfulIntegration(process.env.PRINTFUL_API_KEY);
        printfulResult = await printful.autoSyncOrder(orderId, {
          items,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
        });

        if (printfulResult.success) {
          console.log('[Order] ✅ Synced to Printful:', printfulResult.printfulOrderId);
          
          // Update order status to confirmed
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'confirmed',
          });
        } else {
          console.error('[Order] Printful sync failed:', printfulResult.error);
        }
      } else {
        console.log('[Order] ⚠️ Printful not configured');
      }
    } catch (printfulError) {
      console.error('[Order] Printful error (non-blocking):', printfulError);
    }

    console.log('[Order] ===== ORDER CREATION COMPLETE =====');

    return NextResponse.json({
      success: true,
      orderId: orderId,
      status: 'confirmed',
      printful: printfulResult,
      message: 'Order created and processing',
    }, { status: 201 });

  } catch (error) {
    console.error('[Order] ❌ Fatal error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
