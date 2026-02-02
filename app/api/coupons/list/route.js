import { NextResponse } from 'next/server';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const q = query(
      collection(db, 'coupons'),
      orderBy('created_at', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const coupons = [];

    querySnapshot.forEach(doc => {
      coupons.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({
      success: true,
      count: coupons.length,
      coupons: coupons
    }, { status: 200 });

  } catch (error) {
    console.error('[List Coupons] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
