import { NextResponse } from 'next/server';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const data = await request.json();
    const printfulOrderId = data.data.id;
    const status = data.data.status;
    const trackingUrl = data.data.shipments?.[0]?.tracking_url;
    const trackingNumber = data.data.shipments?.[0]?.tracking_number;

    console.log('📦 Printful order update:', printfulOrderId, status);

    // Only process shipped orders
    if (status !== 'fulfilled') {
      return NextResponse.json({ success: true });
    }

    // Get order from database
    const orderRef = doc(db, 'orders', data.data.external_id);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      console.error('Order not found:', data.data.external_id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data();

    // AUTOMATION STEP 1: Update Shopify order
    console.log('Updating Shopify order...');
    
    await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/orders/${order.shopifyOrderId}/fulfillments.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fulfillment: {
            tracking_info: {
              number: trackingNumber,
              url: trackingUrl,
            },
          },
        }),
      }
    );

    console.log('✅ Shopify order fulfilled');

    // AUTOMATION STEP 2: Send shipping notification email
    console.log('Sending shipping notification...');
    
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
      subject: `Your order has shipped! Tracking #${trackingNumber}`,
      html: `
        <h2>Your order is on its way!</h2>
        <p>Tracking Number: ${trackingNumber}</p>
        <p><a href="${trackingUrl}">Track your package</a></p>
        <p>Expected delivery: 5-10 business days</p>
      `,
    });

    console.log('✅ Shipping email sent');

    // AUTOMATION STEP 3: Update database
    console.log('Updating order status...');
    
    await updateDoc(orderRef, {
      status: 'shipped',
      trackingNumber,
      trackingUrl,
      shippedAt: new Date(),
    });

    console.log('✅ Order updated in database');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
