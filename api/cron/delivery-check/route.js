// /api/cron/delivery-check/route.js
// Check for delivered orders and send confirmation emails

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PrintfulIntegration, EmailAutomation } from '@/lib/integrations';

export const maxDuration = 300; // 5 minutes max

export async function GET(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] ===== DELIVERY CHECK CRON STARTED =====');
    console.log('[Cron] Time:', new Date().toISOString());

    // ✅ STEP 1: Find all shipped orders
    console.log('[Cron] Step 1: Finding shipped orders...');
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', '==', 'shipped'),
      where('printful_synced', '==', true)
    );

    const snapshot = await getDocs(q);
    console.log('[Cron] Found', snapshot.docs.length, 'shipped orders to check');

    if (snapshot.docs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to check',
        delivered: 0,
      });
    }

    let delivered = 0;
    let failed = 0;

    if (!process.env.PRINTFUL_API_KEY) {
      console.error('[Cron] Printful API key not configured');
      return NextResponse.json(
        { success: false, error: 'Printful not configured' },
        { status: 500 }
      );
    }

    const printful = new PrintfulIntegration(process.env.PRINTFUL_API_KEY);

    // Initialize email automation
    const emailApi = new EmailAutomation(
      process.env.SENDGRID_API_KEY,
      {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      }
    );

    // ✅ STEP 2: Check delivery status from Printful
    console.log('[Cron] Step 2: Checking delivery status...');

    for (const docSnapshot of snapshot.docs) {
      try {
        const orderId = docSnapshot.id;
        const orderData = docSnapshot.data();
        const printfulOrderId = orderData.printful_order_id;

        if (!printfulOrderId) continue;

        console.log('[Cron] Checking delivery status for:', orderId);

        // Get order status from Printful
        const response = await fetch(
          `https://api.printful.com/orders/${printfulOrderId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error('[Cron] Printful error for', orderId);
          failed++;
          continue;
        }

        const printfulOrder = result.data;
        const shipments = printfulOrder.shipments || [];

        // Check if all shipments are delivered
        const allDelivered = shipments.length > 0 && 
          shipments.every(s => s.status === 'delivered');

        if (allDelivered && orderData.status !== 'delivered') {
          console.log('[Cron] ✅ Order delivered:', orderId);

          // ✅ STEP 3: Update order status to delivered
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'delivered',
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // ✅ STEP 4: Send delivery confirmation email
          try {
            await emailApi.sendDeliveryConfirmation(
              orderData.customerEmail,
              orderId
            );
            console.log('[Cron] ✅ Sent delivery confirmation to:', orderData.customerEmail);
          } catch (emailError) {
            console.error('[Cron] Email error (non-blocking):', emailError);
          }

          delivered++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (orderError) {
        console.error('[Cron] Error checking order:', orderError);
        failed++;
      }
    }

    console.log('[Cron] ===== DELIVERY CHECK CRON COMPLETE =====');
    console.log('[Cron] Delivered:', delivered, 'Failed:', failed);

    return NextResponse.json({
      success: true,
      message: 'Delivery check completed',
      delivered,
      failed,
      total: snapshot.docs.length,
    });

  } catch (error) {
    console.error('[Cron] ❌ Fatal error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return GET(request);
}
