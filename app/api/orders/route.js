import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, customerEmail } = body;

    console.log('[API] Fetching orders for:', customerId, customerEmail);

    if (!customerId || !customerEmail) {
      return Response.json(
        { success: false, error: 'Missing customerId or customerEmail' },
        { status: 400 }
      );
    }

    // Get ALL orders from Firestore
    const ordersRef = collection(db, 'orders');
    const ordersSnap = await getDocs(ordersRef);

    // Filter orders by customer
    const customerOrders = [];
    ordersSnap.forEach(doc => {
      const orderData = doc.data();
      
      // Match by customerId OR customerEmail
      if (orderData.customerId === customerId || orderData.customerEmail === customerEmail) {
        customerOrders.push({
          id: doc.id,
          ...orderData,
        });
      }
    });

    console.log('[API] Found', customerOrders.length, 'orders');

    return Response.json({
      success: true,
      orders: customerOrders,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
