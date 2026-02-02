import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const orderDoc = await getDoc(doc(db, 'orders', id));

    if (!orderDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: { id: orderDoc.id, ...orderDoc.data() }
    }, { status: 200 });

  } catch (error) {
    console.error('[Get Order] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const orderRef = doc(db, 'orders', id);
    
    await updateDoc(orderRef, {
      ...body,
      updated_at: new Date().toISOString()
    });

    console.log('✅ Order updated:', id);

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[Update Order] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
