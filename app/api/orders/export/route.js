import { NextResponse } from 'next/server';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Papa from 'papaparse';

export async function GET(request) {
  try {
    const q = query(
      collection(db, 'orders'),
      orderBy('created_at', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      orders.push({
        'Order ID': doc.id,
        'Customer ID': data.customerId,
        'Date': new Date(data.created_at).toLocaleDateString(),
        'Status': data.status,
        'Items': data.items.length,
        'Subtotal': data.subtotal,
        'Shipping': data.shipping,
        'Tax': data.tax,
        'Total': data.total,
        'Tracking': data.tracking_number || 'N/A'
      });
    });

    // Convert to CSV
    const csv = Papa.unparse(orders);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="orders.csv"'
      }
    });

  } catch (error) {
    console.error('[Export Orders] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
