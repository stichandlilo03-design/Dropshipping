import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
    
    // Your webhook signing key from Shopify
    const webhookSecret = 'e177d03c0ea91f95c7e0480bab1b044e862edebd55ab0c9fd803424a10e30d03';
    
    // Verify webhook is authentic from Shopify
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(body, 'utf8')
      .digest('base64');
    
    if (hash !== hmacHeader) {
      console.error('❌ Invalid Shopify webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = JSON.parse(body);
    const shopifyOrderId = order.id;
    const shopifyOrderNumber = order.order_number;
    
    console.log('📦 New Shopify order webhook received');
    console.log('Order ID:', shopifyOrderId);
    console.log('Order Number:', shopifyOrderNumber);
    console.log('Total:', order.total_price);
    console.log('Email:', order.email);

    // Get integration credentials from database
    // For now, we'll use environment variables (update to get from user's Firestore later)
    const printfulToken = process.env.PRINTFUL_API_TOKEN;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!printfulToken || !stripeSecretKey) {
      console.error('Missing API credentials in environment');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // WEBHOOK LOG: Record webhook receipt
    console.log('💾 Logging webhook to database...');
    
    try {
      await setDoc(doc(db, 'webhooks', `shopify_${shopifyOrderId}`), {
        webhookType: 'shopify.order.created',
        shopifyOrderId,
        shopifyOrderNumber,
        status: 'received',
        receivedAt: new Date(),
        body: {
          email: order.email,
          totalPrice: order.total_price,
          lineItemsCount: order.line_items.length,
        },
      });
      console.log('✅ Webhook logged');
    } catch (logError) {
      console.error('Failed to log webhook:', logError);
      // Continue anyway - don't fail if logging fails
    }

    // ========================
    // AUTOMATION STEP 1: Create Printful Order
    // ========================
    console.log('\n🔄 STEP 1: Creating Printful order...');
    
    // Build Printful order items
    const printfulItems = order.line_items.map(item => {
      console.log(`  Adding item: ${item.title} (qty: ${item.quantity})`);
      return {
        variant_id: item.variant_id,
        quantity: item.quantity,
        retail_price: item.price,
      };
    });

    // Build shipping address
    const shippingAddress = order.shipping_address || order.billing_address;
    
    const printfulOrderPayload = {
      external_id: shopifyOrderId.toString(),
      label: `Shopify #${shopifyOrderNumber}`,
      items: printfulItems,
      recipient: {
        name: shippingAddress?.name || 'Customer',
        address1: shippingAddress?.address1 || '',
        address2: shippingAddress?.address2 || '',
        city: shippingAddress?.city || '',
        state_code: shippingAddress?.province_code || '',
        zip_code: shippingAddress?.zip || '',
        country_code: shippingAddress?.country_code || 'US',
        phone: order.phone || '',
        email: order.email || '',
      },
    };

    console.log('Sending to Printful:', JSON.stringify(printfulOrderPayload, null, 2));

    const printfulResponse = await fetch('https://api.v2.printful.com/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printfulToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printfulOrderPayload),
    });

    const printfulResponseText = await printfulResponse.text();
    console.log('Printful response status:', printfulResponse.status);
    console.log('Printful response:', printfulResponseText.substring(0, 300));

    if (!printfulResponse.ok) {
      console.error('❌ Failed to create Printful order');
      console.error('Error:', printfulResponseText);
      
      // Update webhook log with error
      await updateDoc(doc(db, 'webhooks', `shopify_${shopifyOrderId}`), {
        status: 'error_printful',
        printfulError: printfulResponseText.substring(0, 500),
        errorAt: new Date(),
      });

      // Still return 200 so Shopify doesn't retry
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create Printful order',
        printfulError: printfulResponseText.substring(0, 200),
      }, { status: 200 });
    }

    let printfulData;
    try {
      printfulData = JSON.parse(printfulResponseText);
    } catch (e) {
      console.error('Failed to parse Printful response');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid Printful response',
      }, { status: 200 });
    }

    const printfulOrderId = printfulData.result?.id;
    console.log('✅ Printful order created:', printfulOrderId);

    // ========================
    // AUTOMATION STEP 2: Capture Payment with Stripe
    // ========================
    console.log('\n💳 STEP 2: Processing Stripe payment...');
    
    const stripeAmount = Math.round(parseFloat(order.total_price) * 100);
    
    const stripePayload = new URLSearchParams({
      'amount': stripeAmount.toString(),
      'currency': order.currency || 'USD',
      'description': `Shopify Order #${shopifyOrderNumber}`,
      'metadata[shopify_order_id]': shopifyOrderId.toString(),
      'metadata[shopify_order_number]': shopifyOrderNumber.toString(),
      'metadata[customer_email]': order.email,
    });

    console.log(`Charging $${(stripeAmount / 100).toFixed(2)} via Stripe...`);

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripePayload,
    });

    const stripeResponseText = await stripeResponse.text();
    console.log('Stripe response status:', stripeResponse.status);

    if (!stripeResponse.ok) {
      console.error('❌ Stripe payment failed');
      console.error('Error:', stripeResponseText);
      
      await updateDoc(doc(db, 'webhooks', `shopify_${shopifyOrderId}`), {
        status: 'error_stripe',
        stripeError: stripeResponseText.substring(0, 500),
        errorAt: new Date(),
      });

      return NextResponse.json({ 
        success: false, 
        error: 'Payment processing failed',
      }, { status: 200 });
    }

    let stripeData;
    try {
      stripeData = JSON.parse(stripeResponseText);
    } catch (e) {
      console.error('Failed to parse Stripe response');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid Stripe response',
      }, { status: 200 });
    }

    const stripePaymentId = stripeData.id;
    console.log('✅ Stripe payment processed:', stripePaymentId);

    // ========================
    // AUTOMATION STEP 3: Send Confirmation Email
    // ========================
    console.log('\n📧 STEP 3: Sending confirmation email...');
    
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword,
        },
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Order Confirmation</h2>
          <p>Thank you for your order!</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> #${shopifyOrderNumber}</p>
            <p><strong>Total:</strong> $${order.total_price}</p>
            <p><strong>Items:</strong> ${order.line_items.length} item(s)</p>
          </div>

          <p>We've received your order and submitted it to our fulfillment partner.</p>
          <p>You'll receive a tracking number via email as soon as your items ship (usually within 1-2 business days).</p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>Questions? Reply to this email or contact support.</p>
            <p>Thank you for shopping with us!</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        to: order.email,
        subject: `Order Confirmation #${shopifyOrderNumber}`,
        html: emailHtml,
      });

      console.log('✅ Confirmation email sent to:', order.email);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError.message);
      // Don't fail the webhook for email issues
    }

    // ========================
    // AUTOMATION STEP 4: Update Shopify Order with Note
    // ========================
    console.log('\n🔄 STEP 4: Adding order note to Shopify...');
    
    try {
      const shopifyStore = process.env.SHOPIFY_STORE;
      const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

      const notePayload = {
        note: `✅ Automated: Order sent to fulfillment partner (Printful Order #${printfulOrderId}). Payment captured with Stripe (ID: ${stripePaymentId.substring(0, 20)}...).`,
      };

      const shopifyNoteResponse = await fetch(
        `https://${shopifyStore}/admin/api/2024-01/orders/${shopifyOrderId}/notes.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notePayload),
        }
      );

      if (shopifyNoteResponse.ok) {
        console.log('✅ Order note added to Shopify');
      } else {
        console.error('Failed to add note to Shopify:', await shopifyNoteResponse.text());
      }
    } catch (noteError) {
      console.error('Error adding note:', noteError.message);
    }

    // ========================
    // AUTOMATION STEP 5: Save Order to Database
    // ========================
    console.log('\n💾 STEP 5: Saving order to database...');
    
    try {
      await setDoc(doc(db, 'orders', shopifyOrderId.toString()), {
        shopifyOrderId,
        shopifyOrderNumber,
        printfulOrderId,
        stripePaymentId,
        customerEmail: order.email,
        customerName: shippingAddress?.name,
        total: parseFloat(order.total_price),
        currency: order.currency,
        itemCount: order.line_items.length,
        status: 'processing',
        automatedAt: new Date(),
        lastUpdated: new Date(),
        // Store full order for reference
        shopifyOrder: {
          email: order.email,
          phone: order.phone,
          shippingAddress: shippingAddress,
          lineItems: order.line_items.map(item => ({
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      });

      console.log('✅ Order saved to database');
    } catch (dbError) {
      console.error('Failed to save order:', dbError);
    }

    // ========================
    // SUCCESS RESPONSE
    // ========================
    console.log('\n✅ WEBHOOK COMPLETE - All automations executed successfully!\n');

    // Update webhook log with success
    await updateDoc(doc(db, 'webhooks', `shopify_${shopifyOrderId}`), {
      status: 'completed',
      printfulOrderId,
      stripePaymentId,
      completedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Order processed automatically',
      orderId: shopifyOrderId,
      printfulOrderId,
      stripePaymentId,
    });

  } catch (error) {
    console.error('\n❌ WEBHOOK ERROR:', error);
    console.error('Stack:', error.stack);

    // Always return 200 to Shopify so it doesn't retry
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 200 });
  }
}
