import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId required' },
        { status: 400 }
      );
    }

    // Build query
    let constraints = [where('customerId', '==', customerId)];
    
    if (status) {
      constraints.push(where('status', '==', status));
    }

    const q = query(
      collection(db, 'orders'),
      ...constraints,
      orderBy('created_at', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const orders = [];

    querySnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders: orders
    }, { status: 200 });

  } catch (error) {
    console.error('[List Orders] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
