// app/api/customers/check-email/route.js
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase();

    console.log('[Check Email] Checking email:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email required' },
        { status: 400 }
      );
    }

    // Query Firestore for customer with this email
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('email', '==', email));
    
    const querySnapshot = await getDocs(q);
    const exists = !querySnapshot.empty;

    console.log('[Check Email] Found:', exists, 'Documents:', querySnapshot.size);

    if (exists) {
      const customerData = querySnapshot.docs[0].data();
      console.log('[Check Email] Customer found:', customerData.email);
    }

    return NextResponse.json({
      success: true,
      exists: exists,
      email: email
    });

  } catch (error) {
    console.error('[Check Email API] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
