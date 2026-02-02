import { NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { sign } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get customer details
    const customerDoc = await getDoc(doc(db, 'customers', user.uid));
    
    if (!customerDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();

    // Generate JWT token
    const token = await sign(
      {
        id: user.uid,
        email: user.email,
        type: 'customer'
      },
      JWT_SECRET,
      { algorithm: 'HS256' }
    );

    console.log('✅ Customer logged in:', user.uid);

    return NextResponse.json({
      success: true,
      token: token,
      customer: {
        id: user.uid,
        email: user.email,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[Customer Login] Error:', error.message);

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
