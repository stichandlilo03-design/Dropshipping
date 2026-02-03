// /api/orders/create/route.js
// Enhanced order creation with automatic shipping and notification

import { NextResponse } from 'next/server';
import { addDoc, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShippingAutomation } from '@/lib/shipping-automation';
import { EmailAutomation } from '@/lib/integrations';

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

    // Validate required fields
    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[Order] ===== ORDER CREATION STARTED =====');
    console.log('[Order] Customer:', customerEmail);
    console.log('[Order] Items:', items.length);

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
    await updateDoc(doc(db, 'customers', customerId), {
      orders: increment(1),
      order_count: increment(1),
      last_order_date: new Date().toISOString(),
    });
    console.log('[Order] ✅ Customer updated');

    // ✅ STEP 3: Send order confirmation email
    console.log('[Order] Step 3: Sending order confirmation email...');
    try {
      const emailApi = new EmailAutomation(process.env.SENDGRID_API_KEY);
      await emailApi.sendOrderConfirmation(customerEmail, {
        orderNumber: orderId,
        amount: total,
        items: items,
        customer: customerName,
      });
      console.log('[Order] ✅ Confirmation email sent');
    } catch (emailError) {
      console.error('[Order] Email error (non-blocking):', emailError);
    }

    let printfulResult = { success: false };

    // ✅ STEP 4: Auto-sync to Printful (if payment confirmed)
    if (paymentIntentId) {
      console.log('[Order] Step 4: Auto-syncing to Printful...');
      try {
        const shipping = new ShippingAutomation(process.env.PRINTFUL_API_KEY);
        printfulResult = await shipping.syncOrderToPrintful(orderId, {
          items,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
        });

        if (printfulResult.success) {
          console.log('[Order] ✅ Synced to Printful:', printfulResult.printfulOrderId);
        } else {
          console.error('[Order] Printful sync failed:', printfulResult.error);
        }
      } catch (printfulError) {
        console.error('[Order] Printful error (non-blocking):', printfulError);
      }
    }

    console.log('[Order] ===== ORDER CREATION COMPLETE =====');

    return NextResponse.json({
      success: true,
      orderId: orderId,
      printful: printfulResult,
      message: 'Order created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Order] ❌ Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
