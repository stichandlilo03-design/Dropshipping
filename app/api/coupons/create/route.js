import { NextResponse } from 'next/server';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const userId = authHeader.split(' ')[1];
    const {
      code,
      type,
      value,
      max_uses,
      min_purchase,
      start_date,
      end_date,
      applicable_products,
      applicable_categories
    } = body;

    // Validation
    if (!code || !type || !value) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed', 'free_shipping'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon type' },
        { status: 400 }
      );
    }

    // Create coupon
    const couponRef = await addDoc(collection(db, 'coupons'), {
      code: code.toUpperCase(),
      type: type,
      value: value,
      max_uses: max_uses || 999,
      current_uses: 0,
      min_purchase: min_purchase || 0,
      start_date: start_date,
      end_date: end_date,
      status: 'active',
      applicable_products: applicable_products || [],
      applicable_categories: applicable_categories || [],
      created_by: userId,
      created_at: new Date().toISOString()
    });

    console.log('✅ Coupon created:', couponRef.id);

    return NextResponse.json({
      success: true,
      couponId: couponRef.id,
      message: 'Coupon created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Create Coupon] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
