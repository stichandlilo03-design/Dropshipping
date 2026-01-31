import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    console.log('💳 Stripe webhook received');

    // Verify webhook is from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log('✅ Stripe signature verified');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Event type:', event.type);

    // ========================
    // PAYMENT SUCCEEDED
    // ========================
    if (event.type === 'payment_intent.succeeded') {
      return handlePaymentSucceeded(event);
    }

    // ========================
    // PAYMENT FAILED
    // ========================
    if (event.type === 'payment_intent.payment_failed') {
      return handlePaymentFailed(event);
    }

    // ========================
    // CHARGE REFUNDED
    // ========================
    if (event.type === 'charge.refunded') {
      return handleChargeRefunded(event);
    }

    // ========================
    // PAYMENT PROCESSING COMPLETED
    // ========================
    if (event.type === 'charge.captured') {
      return handleChargeCaptured(event);
    }

    console.log('Event type not handled:', event.type);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('\n❌ STRIPE WEBHOOK ERROR:', error);
    console.error('Stack:', error.stack);

    // Always return 200 to Stripe so it doesn't retry with unhelpful errors
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: PAYMENT SUCCEEDED
// ========================
async function handlePaymentSucceeded(event) {
  try {
    console.log('\n✅ PAYMENT SUCCEEDED');

    const paymentIntent = event.data.object;
    const paymentId = paymentIntent.id;
    const amount = (paymentIntent.amount / 100).toFixed(2);
    const shopifyOrderId = paymentIntent.metadata?.shopify_order_id;
    const customerEmail = paymentIntent.metadata?.customer_email;

    console.log('Payment ID:', paymentId);
    console.log('Amount:', `$${amount}`);
    console.log('Shopify Order ID:', shopifyOrderId);

    if (!shopifyOrderId) {
      console.warn('No shopify_order_id in metadata');
      return NextResponse.json({ 
        success: true, 
        warning: 'No order ID found' 
      });
    }

    // Update order in database
    const orderRef = doc(db, 'orders', shopifyOrderId.toString());
    const orderSnap = await getDoc(orderRef);

    if (orderSnap.exists()) {
      await updateDoc(orderRef, {
        paymentStatus: 'succeeded',
        paymentAmount: parseFloat(amount),
        paymentIntentId: paymentId,
        paymentSucceededAt: new Date(),
        lastUpdated: new Date(),
      });

      console.log('✅ Order payment status updated in database');
    } else {
      console.warn('Order not found in database:', shopifyOrderId);
    }

    // Send payment confirmation email
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        to: customerEmail,
        subject: 'Payment Confirmed ✅',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #28a745;">Payment Confirmed!</h2>
            <p>We have successfully received your payment of <strong>$${amount}</strong>.</p>
            <p>Your order is being prepared for shipment and you'll receive tracking information soon.</p>
            <p>Thank you!</p>
          </div>
        `,
      });

      console.log('✅ Payment confirmation email sent');
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError.message);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: PAYMENT FAILED
// ========================
async function handlePaymentFailed(event) {
  try {
    console.log('\n❌ PAYMENT FAILED');

    const paymentIntent = event.data.object;
    const paymentId = paymentIntent.id;
    const shopifyOrderId = paymentIntent.metadata?.shopify_order_id;
    const customerEmail = paymentIntent.metadata?.customer_email;
    const lastError = paymentIntent.last_payment_error?.message;

    console.log('Payment ID:', paymentId);
    console.log('Error:', lastError);

    if (shopifyOrderId) {
      const orderRef = doc(db, 'orders', shopifyOrderId.toString());
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        await updateDoc(orderRef, {
          paymentStatus: 'failed',
          paymentError: lastError,
          paymentFailedAt: new Date(),
          lastUpdated: new Date(),
        });

        console.log('✅ Payment failure recorded in database');
      }
    }

    // Send payment failed email
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        to: customerEmail,
        subject: 'Payment Issue - Please Review ⚠️',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #dc3545;">Payment Issue</h2>
            <p>We encountered an issue processing your payment:</p>
            <p><strong>${lastError}</strong></p>
            <p>Please try again or contact us for assistance.</p>
            <p>Your order is on hold until payment is successful.</p>
          </div>
        `,
      });

      console.log('✅ Payment failure email sent');
    } catch (emailError) {
      console.error('Failed to send failure email:', emailError.message);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: CHARGE CAPTURED
// ========================
async function handleChargeCaptured(event) {
  try {
    console.log('\n💳 CHARGE CAPTURED');

    const charge = event.data.object;
    const chargeId = charge.id;
    const amount = (charge.amount / 100).toFixed(2);
    const shopifyOrderId = charge.metadata?.shopify_order_id;

    console.log('Charge ID:', chargeId);
    console.log('Amount captured:', `$${amount}`);

    if (shopifyOrderId) {
      const orderRef = doc(db, 'orders', shopifyOrderId.toString());
      
      await updateDoc(orderRef, {
        paymentCapturedAt: new Date(),
        chargeId: chargeId,
      });

      console.log('✅ Charge capture recorded');
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in handleChargeCaptured:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: REFUND
// ========================
async function handleChargeRefunded(event) {
  try {
    console.log('\n🔄 CHARGE REFUNDED');

    const charge = event.data.object;
    const chargeId = charge.id;
    const refundAmount = (charge.amount_refunded / 100).toFixed(2);
    const shopifyOrderId = charge.metadata?.shopify_order_id;

    console.log('Charge ID:', chargeId);
    console.log('Refund amount:', `$${refundAmount}`);

    if (shopifyOrderId) {
      const orderRef = doc(db, 'orders', shopifyOrderId.toString());
      
      await updateDoc(orderRef, {
        status: 'refunded',
        refundAmount: parseFloat(refundAmount),
        refundedAt: new Date(),
        lastUpdated: new Date(),
      });

      console.log('✅ Refund recorded in database');

      // Send refund notification email
      try {
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const order = orderSnap.data();
          
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD,
            },
          });

          await transporter.sendMail({
            to: order.customerEmail,
            subject: `Refund Processed - $${refundAmount}`,
            html: `
              <div style="font-family: Arial, sans-serif;">
                <h2>Refund Processed</h2>
                <p>We have processed a refund of <strong>$${refundAmount}</strong>.</p>
                <p>The refund should appear in your account within 3-5 business days.</p>
                <p>Thank you!</p>
              </div>
            `,
          });

          console.log('✅ Refund email sent');
        }
      } catch (emailError) {
        console.error('Failed to send refund email:', emailError.message);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in handleChargeRefunded:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}
