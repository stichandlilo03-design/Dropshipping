// app/api/auth/customer/login/route.js
import { NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import jwt from 'jsonwebtoken';

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

    // Get customer details from Firestore
    const customerDoc = await getDoc(doc(db, 'customers', user.uid));
    
    if (!customerDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();

    // Generate JWT token using jsonwebtoken
    const token = jwt.sign(
      {
        id: user.uid,
        email: user.email,
        type: 'customer'
      },
      process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long',
      { expiresIn: '7d' }
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
        phone: customerData.phone,
        clv: customerData.clv || 0,
        order_count: customerData.order_count || 0
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

    if (error.code === 'auth/user-disabled') {
      return NextResponse.json(
        { success: false, error: 'This account has been disabled' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
