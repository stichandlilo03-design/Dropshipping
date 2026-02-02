import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

// Get order by ID
export async function getOrderById(orderId) {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (orderDoc.exists()) {
      return { id: orderDoc.id, ...orderDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting order:', error);
    return null;
  }
}

// Get customer orders
export async function getCustomerOrders(customerId, status = null) {
  try {
    let constraints = [where('customerId', '==', customerId)];
    
    if (status) {
      constraints.push(where('status', '==', status));
    }

    const q = query(collection(db, 'orders'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    return orders.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

// Update order status
export async function updateOrderStatus(orderId, status) {
  try {
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Set timestamp based on status
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    await updateDoc(doc(db, 'orders', orderId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: error.message };
  }
}

// Add tracking number
export async function addTrackingNumber(orderId, trackingNumber, carrier) {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      tracking_number: trackingNumber,
      shipping_carrier: carrier,
      status: 'shipped',
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding tracking number:', error);
    return { success: false, error: error.message };
  }
}

// Get total revenue
export async function getTotalRevenue() {
  try {
    const q = query(collection(db, 'orders'));
    const querySnapshot = await getDocs(q);
    
    let total = 0;
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'paid' || data.status === 'shipped' || data.status === 'delivered') {
        total += data.total || 0;
      }
    });

    return total;
  } catch (error) {
    console.error('Error getting revenue:', error);
    return 0;
  }
}

// Get order statistics
export async function getOrderStats() {
  try {
    const q = query(collection(db, 'orders'));
    const querySnapshot = await getDocs(q);
    
    const stats = {
      total_orders: 0,
      pending_orders: 0,
      paid_orders: 0,
      shipped_orders: 0,
      delivered_orders: 0,
      cancelled_orders: 0,
      total_revenue: 0,
      average_order_value: 0
    };

    let revenues = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      stats.total_orders++;

      if (data.status === 'pending') stats.pending_orders++;
      else if (data.status === 'paid') {
        stats.paid_orders++;
        revenues.push(data.total);
      } else if (data.status === 'shipped') {
        stats.shipped_orders++;
        revenues.push(data.total);
      } else if (data.status === 'delivered') {
        stats.delivered_orders++;
        revenues.push(data.total);
      } else if (data.status === 'cancelled') stats.cancelled_orders++;

      stats.total_revenue += data.total || 0;
    });

    stats.average_order_value = revenues.length > 0 
      ? revenues.reduce((a, b) => a + b, 0) / revenues.length 
      : 0;

    return stats;
  } catch (error) {
    console.error('Error getting order stats:', error);
    return null;
  }
}

// Get recent orders
export async function getRecentOrders(limit = 10) {
  try {
    const q = query(collection(db, 'orders'));
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    return orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting recent orders:', error);
    return [];
  }
}
