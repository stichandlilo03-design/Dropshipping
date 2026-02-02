import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, orderTotal, productIds } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Coupon code required' },
        { status: 400 }
      );
    }

    // Find coupon
    const q = query(
      collection(db, 'coupons'),
      where('code', '==', code.toUpperCase())
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = couponDoc.data();

    // Validate coupon
    const now = new Date();
    const startDate = new Date(coupon.start_date);
    const endDate = new Date(coupon.end_date);

    if (coupon.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Coupon is not active' },
        { status: 400 }
      );
    }

    if (now < startDate || now > endDate) {
      return NextResponse.json(
        { success: false, error: 'Coupon is expired' },
        { status: 400 }
      );
    }

    if (coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json(
        { success: false, error: 'Coupon usage limit reached' },
        { status: 400 }
      );
    }

    if (orderTotal && orderTotal < coupon.min_purchase) {
      return NextResponse.json(
        { success: false, error: `Minimum purchase of $${coupon.min_purchase} required` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      discountAmount = (orderTotal * coupon.value) / 100;
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'free_shipping') {
      discountAmount = 10; // Assuming standard shipping
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: discountAmount
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[Validate Coupon] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
