import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-printful-signature');
    
    // Your Printful webhook secret
    const webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET;
    
    // Verify webhook is authentic from Printful v2
    // Printful v2 uses HMAC-SHA256
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    if (hash !== signature) {
      console.error('❌ Invalid Printful webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventType = event.type;
    const timestamp = event.timestamp;
    
    console.log('📦 Printful v2 webhook received');
    console.log('Event type:', eventType);
    console.log('Timestamp:', timestamp);

    // ========================
    // HANDLE DIFFERENT EVENT TYPES
    // ========================

    // ORDER STATUS CHANGED
    if (eventType === 'order:updated') {
      return handleOrderUpdated(event);
    }

    // ORDER SHIPPED
    if (eventType === 'order:shipped') {
      return handleOrderShipped(event);
    }

    // ORDER DELIVERED
    if (eventType === 'order:delivered') {
      return handleOrderDelivered(event);
    }

    // PRICE CHANGE (new in v2)
    if (eventType === 'product:price_changed') {
      return handlePriceChanged(event);
    }

    // INVENTORY/STOCK UPDATE (new in v2)
    if (eventType === 'product:stock_changed') {
      return handleStockChanged(event);
    }

    console.log('Event type not handled:', eventType);
    return NextResponse.json({ success: true, message: 'Event received' });

  } catch (error) {
    console.error('\n❌ PRINTFUL WEBHOOK ERROR:', error);
    console.error('Stack:', error.stack);

    // Always return 200 to Printful so it doesn't retry
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: ORDER SHIPPED
// ========================
async function handleOrderShipped(event) {
  try {
    console.log('\n🚚 ORDER SHIPPED EVENT');

    const printfulOrderId = event.data.id;
    const externalId = event.data.external_id;
    const shipments = event.data.shipments || [];

    console.log('Printful Order ID:', printfulOrderId);
    console.log('External ID:', externalId);
    console.log('Shipments:', shipments.length);

    // Get order from database using external_id (Shopify order ID)
    const orderRef = doc(db, 'orders', externalId.toString());
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      console.warn('Order not found in database:', externalId);
      return NextResponse.json({ warning: 'Order not found' }, { status: 200 });
    }

    const order = orderSnap.data();
    console.log('Found order in database:', order.shopifyOrderNumber);

    // Extract tracking information
    const firstShipment = shipments[0];
    const trackingNumber = firstShipment?.tracking_number;
    const trackingUrl = firstShipment?.tracking_url;
    const carrier = firstShipment?.carrier;
    const estimatedDelivery = firstShipment?.estimated_delivery_date; // New in v2!

    console.log('Tracking:', trackingNumber);
    console.log('Carrier:', carrier);
    console.log('Est. Delivery:', estimatedDelivery);

    // AUTOMATION STEP 1: Update Shopify order
    console.log('\n🔄 Updating Shopify...');
    
    try {
      const shopifyStore = process.env.SHOPIFY_STORE;
      const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

      const fulfillmentPayload = {
        fulfillment: {
          line_items_by_fulfillment_order: [
            {
              fulfillment_order_line_item_id: 1, // Simplified - you'd get real IDs
              quantity: order.itemCount,
            },
          ],
          tracking_info: {
            number: trackingNumber,
            company: carrier?.toUpperCase(),
            url: trackingUrl,
          },
          notify_customer: true,
        },
      };

      const shopifyResponse = await fetch(
        `https://${shopifyStore}/admin/api/2024-01/orders/${order.shopifyOrderId}/fulfillments.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fulfillmentPayload),
        }
      );

      if (shopifyResponse.ok) {
        console.log('✅ Shopify order fulfilled with tracking');
      } else {
        const errorText = await shopifyResponse.text();
        console.error('Failed to update Shopify:', errorText);
      }
    } catch (shopifyError) {
      console.error('Error updating Shopify:', shopifyError.message);
    }

    // AUTOMATION STEP 2: Send tracking email to customer
    console.log('\n📧 Sending tracking email...');
    
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Order Has Shipped! 🚚</h2>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> #${order.shopifyOrderNumber}</p>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            <p><strong>Carrier:</strong> ${carrier}</p>
            ${estimatedDelivery ? `<p><strong>Est. Delivery:</strong> ${estimatedDelivery}</p>` : ''}
          </div>

          <p><a href="${trackingUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Track Your Package</a></p>

          <p style="margin-top: 20px;">Your package is on its way! Click the link above to track your shipment in real-time.</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>Questions? Reply to this email or contact support.</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        to: order.customerEmail,
        subject: `Your Order #${order.shopifyOrderNumber} Has Shipped!`,
        html: emailHtml,
      });

      console.log('✅ Tracking email sent to:', order.customerEmail);
    } catch (emailError) {
      console.error('Failed to send tracking email:', emailError.message);
    }

    // AUTOMATION STEP 3: Update order in database
    console.log('\n💾 Updating database...');
    
    await updateDoc(orderRef, {
      status: 'shipped',
      trackingNumber,
      trackingUrl,
      carrier,
      estimatedDelivery: estimatedDelivery || null,
      shippedAt: new Date(),
      lastUpdated: new Date(),
    });

    console.log('✅ Order updated in database');

    console.log('\n✅ PRINTFUL SHIPPED EVENT COMPLETE\n');

    return NextResponse.json({
      success: true,
      message: 'Order shipping information updated',
      trackingNumber,
    });

  } catch (error) {
    console.error('Error in handleOrderShipped:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: ORDER DELIVERED
// ========================
async function handleOrderDelivered(event) {
  try {
    console.log('\n📦 ORDER DELIVERED EVENT');

    const externalId = event.data.external_id;
    
    const orderRef = doc(db, 'orders', externalId.toString());
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ warning: 'Order not found' }, { status: 200 });
    }

    const order = orderSnap.data();

    // Send delivery confirmation email
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
        to: order.customerEmail,
        subject: `Order #${order.shopifyOrderNumber} Delivered! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Your Order Has Been Delivered!</h2>
            <p>Order #${order.shopifyOrderNumber} was successfully delivered.</p>
            <p>Thank you for your purchase! We hope you love your items.</p>
            <p>If you have any issues, please let us know!</p>
          </div>
        `,
      });

      console.log('✅ Delivery confirmation sent');
    } catch (emailError) {
      console.error('Failed to send delivery email:', emailError.message);
    }

    // Update database
    await updateDoc(orderRef, {
      status: 'delivered',
      deliveredAt: new Date(),
      lastUpdated: new Date(),
    });

    console.log('✅ Order marked as delivered\n');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in handleOrderDelivered:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
}

// ========================
// EVENT HANDLER: ORDER UPDATED
// ========================
async function handleOrderUpdated(event) {
  console.log('\n🔄 ORDER UPDATED EVENT');
  
  const printfulOrderId = event.data.id;
  const status = event.data.status;
  const externalId = event.data.external_id;

  console.log('Printful Order:', printfulOrderId);
  console.log('Status:', status);

  // Update order status in database
  try {
    const orderRef = doc(db, 'orders', externalId.toString());
    const orderSnap = await getDoc(orderRef);

    if (orderSnap.exists()) {
      await updateDoc(orderRef, {
        printfulStatus: status,
        lastUpdated: new Date(),
      });

      console.log('✅ Order status updated:', status);
    }
  } catch (error) {
    console.error('Error updating order:', error);
  }

  return NextResponse.json({ success: true });
}

// ========================
// EVENT HANDLER: PRICE CHANGED (NEW IN V2!)
// ========================
async function handlePriceChanged(event) {
  console.log('\n💰 PRICE CHANGED EVENT (v2 feature!)');
  
  const productId = event.data.id;
  const oldPrice = event.data.old_price;
  const newPrice = event.data.new_price;

  console.log('Product:', productId);
  console.log(`Price changed: $${oldPrice} → $${newPrice}`);

  // You could update product prices in Shopify here
  // Or notify admin of price changes

  return NextResponse.json({ success: true });
}

// ========================
// EVENT HANDLER: STOCK CHANGED (NEW IN V2!)
// ========================
async function handleStockChanged(event) {
  console.log('\n📊 STOCK CHANGED EVENT (v2 feature!)');
  
  const productId = event.data.id;
  const variantId = event.data.variant_id;
  const quantity = event.data.quantity;

  console.log('Product:', productId);
  console.log('Variant:', variantId);
  console.log('New Stock:', quantity);

  // Sync inventory to Shopify
  // This is the key to keeping inventory in sync!

  return NextResponse.json({ success: true });
}
