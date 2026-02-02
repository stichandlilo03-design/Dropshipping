import { NextResponse } from 'next/server';
import { addDoc, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customerId,
      items,
      subtotal,
      shipping,
      tax,
      discount,
      coupon_code,
      total,
      paymentIntentId
    } = body;

    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order
    const orderRef = await addDoc(collection(db, 'orders'), {
      customerId: customerId,
      items: items,
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      discount: discount || 0,
      coupon_code: coupon_code || '',
      total: total,
      status: 'pending',
      tracking_number: '',
      shipping_carrier: '',
      payment_intent_id: paymentIntentId || '',
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      paid_at: null,
      shipped_at: null,
      delivered_at: null
    });

    // Update customer
    await updateDoc(doc(db, 'customers', customerId), {
      orders: increment(1),
      order_count: increment(1)
    });

    console.log('✅ Order created:', orderRef.id);

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      message: 'Order created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Create Order] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
