import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    
    // Verify webhook is authentic
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('base64');
    
    if (hash !== hmacHeader) {
      console.error('Invalid Shopify webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = JSON.parse(body);
    const shopifyOrderId = order.id;
    
    console.log('📦 New Shopify order:', shopifyOrderId);

    // Get user's integrations from database
    const userId = order.user_id || 'default'; // You might get this from order metadata
    
    // AUTOMATION STEP 1: Create Printful order
    console.log('Creating Printful order...');
    
    const printfulResponse = await fetch('https://api.printful.com/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: shopifyOrderId.toString(),
        items: order.line_items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        recipient: {
          name: order.shipping_address?.name || 'Customer',
          address1: order.shipping_address?.address1,
          address2: order.shipping_address?.address2,
          city: order.shipping_address?.city,
          state_code: order.shipping_address?.province_code,
          zip_code: order.shipping_address?.zip,
          country_code: order.shipping_address?.country_code,
          phone: order.phone,
          email: order.email,
        },
      }),
    });

    if (!printfulResponse.ok) {
      throw new Error('Failed to create Printful order');
    }

    const printfulData = await printfulResponse.json();
    console.log('✅ Printful order created:', printfulData.result.id);

    // AUTOMATION STEP 2: Capture payment with Stripe
    console.log('Processing Stripe payment...');
    
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'amount': Math.round(parseFloat(order.total_price) * 100),
        'currency': order.currency,
        'description': `Shopify Order #${shopifyOrderId}`,
        'metadata[shopify_order_id]': shopifyOrderId.toString(),
      }),
    });

    const stripeData = await stripeResponse.json();
    console.log('✅ Stripe payment processed:', stripeData.id);

    // AUTOMATION STEP 3: Send confirmation email
    console.log('Sending confirmation email...');
    
    // You already have Gmail credentials from integrations
    // Send email to customer
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      to: order.email,
      subject: `Order Confirmation #${shopifyOrderId}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Order Number: #${shopifyOrderId}</p>
        <p>Total: $${order.total_price}</p>
        <p>Items: ${order.line_items.length}</p>
        <p>We've submitted your order to our fulfillment partner and will send you tracking information within 24 hours.</p>
        <p>Track your order at: https://tracking.example.com/${shopifyOrderId}</p>
      `,
    });

    console.log('✅ Confirmation email sent');

    // AUTOMATION STEP 4: Log everything in database
    console.log('Saving order to database...');
    
    await setDoc(doc(db, 'orders', shopifyOrderId.toString()), {
      shopifyOrderId,
      printfulOrderId: printfulData.result.id,
      stripePaymentId: stripeData.id,
      customerEmail: order.email,
      total: parseFloat(order.total_price),
      status: 'processing',
      itemCount: order.line_items.length,
      createdAt: new Date(),
      automatedAt: new Date(),
    });

    console.log('✅ Order saved to database');

    // AUTOMATION STEP 5: Update Shopify with processing note
    console.log('Adding note to Shopify order...');
    
    await fetch(`https://${process.env.SHOPIFY_STORE}/admin/api/2024-01/orders/${shopifyOrderId}/notes.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        note: `Automated: Order sent to Printful (ID: ${printfulData.result.id}). Payment captured with Stripe.`,
      }),
    });

    console.log('✅ Shopify order updated');

    return NextResponse.json({ 
      success: true, 
      message: 'Order processed automatically',
      printfulOrderId: printfulData.result.id,
      stripePaymentId: stripeData.id,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Even on error, acknowledge the webhook (so Shopify doesn't retry infinitely)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 }); // Always return 200 to Shopify
  }
}
