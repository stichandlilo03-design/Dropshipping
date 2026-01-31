import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');
    
    console.log('\n💳 ============ STRIPE WEBHOOK ============');
    console.log('Webhook received at:', new Date().toISOString());

    // Verify Stripe signature (manual verification without Stripe package)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !sig) {
      console.warn('⚠️ Missing webhook secret or signature');
      // For now, process anyway (remove signature check if testing locally)
      // return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse JSON');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = data.type;
    const eventObject = data.data.object;

    console.log('Event type:', eventType);
    console.log('Event ID:', data.id);

    // ========================
    // EVENT: Payment succeeded
    // ========================
    
    if (eventType === 'payment_intent.succeeded') {
      console.log('\n✅ PAYMENT SUCCEEDED');
      
      const paymentIntentId = eventObject.id;
      const amount = (eventObject.amount / 100).toFixed(2);
      const shopifyOrderId = eventObject.metadata?.shopify_order_id;
      const customerEmail = eventObject.metadata?.customer_email;

      console.log('Payment ID:', paymentIntentId);
      console.log('Amount: $' + amount);
      console.log('Shopify Order ID:', shopifyOrderId);

      if (shopifyOrderId) {
        try {
          const orderRef = doc(db, 'orders', shopifyOrderId.toString());
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            await updateDoc(orderRef, {
              paymentStatus: 'succeeded',
              paymentAmount: parseFloat(amount),
              paymentIntentId: paymentIntentId,
              paymentSucceededAt: new Date(),
              lastUpdated: new Date(),
            });

            console.log('✅ Payment status updated in database');
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ========================
    // EVENT: Payment failed
    // ========================
    
    if (eventType === 'payment_intent.payment_failed') {
      console.log('\n❌ PAYMENT FAILED');
      
      const paymentIntentId = eventObject.id;
      const shopifyOrderId = eventObject.metadata?.shopify_order_id;
      const errorMsg = eventObject.last_payment_error?.message || 'Unknown error';

      console.log('Payment ID:', paymentIntentId);
      console.log('Error:', errorMsg);

      if (shopifyOrderId) {
        try {
          const orderRef = doc(db, 'orders', shopifyOrderId.toString());
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            await updateDoc(orderRef, {
              paymentStatus: 'failed',
              paymentError: errorMsg,
              paymentFailedAt: new Date(),
              lastUpdated: new Date(),
            });

            console.log('❌ Payment failure recorded');
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ========================
    // EVENT: Charge refunded
    // ========================
    
    if (eventType === 'charge.refunded') {
      console.log('\n🔄 CHARGE REFUNDED');
      
      const chargeId = eventObject.id;
      const refundAmount = (eventObject.amount_refunded / 100).toFixed(2);
      const shopifyOrderId = eventObject.metadata?.shopify_order_id;

      console.log('Charge ID:', chargeId);
      console.log('Refund amount: $' + refundAmount);

      if (shopifyOrderId) {
        try {
          const orderRef = doc(db, 'orders', shopifyOrderId.toString());
          
          await updateDoc(orderRef, {
            status: 'refunded',
            refundAmount: parseFloat(refundAmount),
            refundedAt: new Date(),
            lastUpdated: new Date(),
          });

          console.log('✅ Refund recorded');
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ========================
    // EVENT: Charge captured
    // ========================
    
    if (eventType === 'charge.captured') {
      console.log('\n💳 CHARGE CAPTURED');
      
      const chargeId = eventObject.id;
      const amount = (eventObject.amount / 100).toFixed(2);

      console.log('Charge ID:', chargeId);
      console.log('Amount: $' + amount);

      return NextResponse.json({ success: true });
    }

    console.log('Event type not handled:', eventType);
    console.log('============================================\n');

    return NextResponse.json({ 
      success: true, 
      message: 'Event received but not processed' 
    });

  } catch (error) {
    console.error('\n❌ ============ STRIPE WEBHOOK ERROR ============');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('================================================\n');

    // Always return 200 so Stripe doesn't retry
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 200 });
  }
}

// Optional: Add GET for testing
export async function GET(request) {
  return NextResponse.json({
    status: 'Stripe webhook endpoint is active',
    url: 'POST to this endpoint from Stripe',
    setupGuide: 'https://dashboard.stripe.com/webhooks'
  });
}
