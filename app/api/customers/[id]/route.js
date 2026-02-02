import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const customerDoc = await getDoc(doc(db, 'customers', id));

    if (!customerDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: customerDoc.data()
    }, { status: 200 });

  } catch (error) {
    console.error('[Get Customer] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
