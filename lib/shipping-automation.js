// /lib/shipping-automation.js
// Complete shipping automation system with Printful integration

import { db } from './firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export class ShippingAutomation {
  constructor(printfulApiKey) {
    this.printfulApiKey = printfulApiKey;
    this.printfulBaseUrl = 'https://api.printful.com';
  }

  // ✅ STEP 1: Auto-sync order to Printful
  async syncOrderToPrintful(orderId, orderData) {
    try {
      console.log('[Shipping] Step 1: Syncing order to Printful:', orderId);

      const printfulOrderPayload = {
        external_id: orderId,
        label: `Order #${orderId}`,
        items: orderData.items.map(item => ({
          external_id: item.id,
          variant_id: item.variantId || item.id,
          quantity: item.quantity,
          retail_price: parseFloat(item.price),
        })),
        recipient: {
          name: orderData.customerName,
          address1: orderData.shippingAddress?.street || '',
          address2: orderData.shippingAddress?.apt || '',
          city: orderData.shippingAddress?.city || '',
          state_code: orderData.shippingAddress?.state || '',
          country_code: orderData.shippingAddress?.country || 'US',
          zip: orderData.shippingAddress?.zip || '',
          email: orderData.customerEmail,
          phone: orderData.customerPhone || '',
        },
      };

      const response = await fetch(`${this.printfulBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.printfulApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printfulOrderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[Shipping] Printful sync failed:', result);
        return { success: false, error: result.message };
      }

      console.log('[Shipping] ✅ Order synced to Printful:', result.data?.id);

      // ✅ STEP 2: Update Firebase with Printful ID
      await updateDoc(doc(db, 'orders', orderId), {
        printful_order_id: result.data?.id,
        printful_synced: true,
        printful_synced_at: new Date().toISOString(),
        status: 'confirmed',
      });

      return { success: true, printfulOrderId: result.data?.id };
    } catch (error) {
      console.error('[Shipping] Error syncing to Printful:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ STEP 2: Get shipping label from Printful
  async getShippingLabel(printfulOrderId) {
    try {
      console.log('[Shipping] Getting shipping label from Printful:', printfulOrderId);

      const response = await fetch(`${this.printfulBaseUrl}/orders/${printfulOrderId}/shipments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.printfulApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[Shipping] Failed to get label:', result);
        return { success: false, error: result.message };
      }

      const shipmentData = result.data?.[0];

      if (!shipmentData) {
        console.log('[Shipping] No shipment data yet, order still processing');
        return { success: false, error: 'Order not ready for shipping' };
      }

      console.log('[Shipping] ✅ Got shipment data:', shipmentData);

      return {
        success: true,
        trackingNumber: shipmentData.tracking_number,
        carrier: shipmentData.carrier,
        labelUrl: shipmentData.label_url || null,
        estimatedDelivery: shipmentData.estimated_delivery_date,
      };
    } catch (error) {
      console.error('[Shipping] Error getting label:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ STEP 3: Auto-update tracking in Firebase
  async updateTrackingInfo(orderId, trackingData) {
    try {
      console.log('[Shipping] Updating tracking info:', orderId);

      await updateDoc(doc(db, 'orders', orderId), {
        tracking_number: trackingData.trackingNumber,
        shipping_carrier: trackingData.carrier,
        label_url: trackingData.labelUrl,
        estimated_delivery: trackingData.estimatedDelivery,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log('[Shipping] ✅ Tracking updated');
      return { success: true };
    } catch (error) {
      console.error('[Shipping] Error updating tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ STEP 4: Track shipment status
  async trackShipment(printfulOrderId) {
    try {
      console.log('[Shipping] Tracking shipment:', printfulOrderId);

      const response = await fetch(`${this.printfulBaseUrl}/orders/${printfulOrderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.printfulApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.message };
      }

      const order = result.data;

      console.log('[Shipping] ✅ Shipment status:', order.status);

      return {
        success: true,
        status: order.status,
        shipments: order.shipments || [],
      };
    } catch (error) {
      console.error('[Shipping] Error tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ STEP 5: Auto-sync multiple pending orders
  async syncPendingOrders() {
    try {
      console.log('[Shipping] Syncing all pending orders...');

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('status', '==', 'paid'),
        where('printful_synced', '==', false)
      );

      const snapshot = await getDocs(q);
      const results = [];

      for (const docSnapshot of snapshot.docs) {
        const orderId = docSnapshot.id;
        const orderData = docSnapshot.data();

        console.log('[Shipping] Syncing order:', orderId);

        const syncResult = await this.syncOrderToPrintful(orderId, orderData);
        results.push({ orderId, ...syncResult });

        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('[Shipping] ✅ Synced', results.length, 'orders');
      return { success: true, synced: results.length, results };
    } catch (error) {
      console.error('[Shipping] Error syncing pending orders:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ STEP 6: Check for shipping updates and update Firebase
  async checkAndUpdateShippingStatus() {
    try {
      console.log('[Shipping] Checking for shipping updates...');

      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('printful_synced', '==', true),
        where('status', '==', 'shipped')
      );

      const snapshot = await getDocs(q);
      const updated = [];

      for (const docSnapshot of snapshot.docs) {
        const orderId = docSnapshot.id;
        const orderData = docSnapshot.data();
        const printfulOrderId = orderData.printful_order_id;

        if (!printfulOrderId) continue;

        const shipmentData = await this.getShippingLabel(printfulOrderId);

        if (shipmentData.success) {
          await this.updateTrackingInfo(orderId, shipmentData);
          updated.push(orderId);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('[Shipping] ✅ Updated', updated.length, 'shipments');
      return { success: true, updated };
    } catch (error) {
      console.error('[Shipping] Error checking updates:', error);
      return { success: false, error: error.message };
    }
  }
}

// ✅ Auto-sync on order creation
export async function autoSyncNewOrder(orderId, orderData, printfulApiKey) {
  const shipping = new ShippingAutomation(printfulApiKey);
  return await shipping.syncOrderToPrintful(orderId, orderData);
}

// ✅ Auto-update tracking periodically (run via cron job)
export async function autoUpdateTracking(printfulApiKey) {
  const shipping = new ShippingAutomation(printfulApiKey);
  return await shipping.checkAndUpdateShippingStatus();
}
