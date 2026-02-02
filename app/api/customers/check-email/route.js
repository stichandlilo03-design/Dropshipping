// app/api/customers/check-email/route.js
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email required' },
        { status: 400 }
      );
    }

    console.log('[Check Email] Checking:', email);

    // Query Firestore for customer with this email
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    const exists = !querySnapshot.empty;
    const customer = exists ? querySnapshot.docs[0].data() : null;

    console.log('[Check Email] Email exists:', exists);

    return NextResponse.json({
      success: true,
      exists: exists,
      customer: customer ? {
        id: querySnapshot.docs[0].id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      } : null
    });

  } catch (error) {
    console.error('[Check Email] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
