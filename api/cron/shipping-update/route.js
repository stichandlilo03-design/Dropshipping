// /api/cron/shipping-update/route.js
// Automated shipping status checker (run via cron job)

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

    console.log('[Cron] ===== SHIPPING UPDATE CRON STARTED =====');
    console.log('[Cron] Time:', new Date().toISOString());

    // ✅ STEP 1: Find all shipped orders with Printful IDs
    console.log('[Cron] Step 1: Finding shipped orders...');
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('status', '==', 'shipped'),
      where('printful_synced', '==', true)
    );

    const snapshot = await getDocs(q);
    console.log('[Cron] Found', snapshot.docs.length, 'shipped orders');

    if (snapshot.docs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to update',
        updated: 0,
      });
    }

    // ✅ STEP 2: Check Printful for updates
    console.log('[Cron] Step 2: Checking Printful for updates...');
    let updated = 0;
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

    for (const docSnapshot of snapshot.docs) {
      try {
        const orderId = docSnapshot.id;
        const orderData = docSnapshot.data();
        const printfulOrderId = orderData.printful_order_id;

        if (!printfulOrderId) {
          console.log('[Cron] Skipping', orderId, '- no printful ID');
          continue;
        }

        console.log('[Cron] Checking order:', orderId);

        // ✅ STEP 3: Get shipping label and tracking
        const labelResult = await printful.getShippingLabelAndUpdate(printfulOrderId, orderId);

        if (labelResult.success) {
          console.log('[Cron] ✅ Updated tracking for:', orderId);

          // ✅ STEP 4: Send tracking email to customer
          try {
            await emailApi.sendShippingNotification(orderData.customerEmail, {
              trackingNumber: labelResult.trackingNumber,
              carrier: labelResult.carrier,
              estimatedDelivery: labelResult.estimatedDelivery,
            });
            console.log('[Cron] ✅ Sent tracking email to:', orderData.customerEmail);
          } catch (emailError) {
            console.error('[Cron] Email error (non-blocking):', emailError);
          }

          updated++;
        } else {
          console.error('[Cron] Failed to get label for:', orderId, labelResult.error);
          failed++;
        }

        // Rate limiting - Printful API is rate limited
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (orderError) {
        console.error('[Cron] Error processing order:', orderError);
        failed++;
      }
    }

    console.log('[Cron] ===== SHIPPING UPDATE CRON COMPLETE =====');
    console.log('[Cron] Updated:', updated, 'Failed:', failed);

    return NextResponse.json({
      success: true,
      message: 'Shipping updates completed',
      updated,
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

// POST version for webhook triggers
export async function POST(request) {
  return GET(request);
}
