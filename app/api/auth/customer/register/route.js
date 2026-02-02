import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer document
    await setDoc(doc(db, 'customers', user.uid), {
      id: user.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      phone: phone || '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: ''
      },
      profile: {
        avatar: '',
        preferences: {
          emailNotifications: true,
          promotions: true
        }
      },
      wishlist: [],
      orders: [],
      clv: 0,
      total_spent: 0,
      order_count: 0,
      created_at: new Date().toISOString(),
      last_purchase: null,
      verified: false
    });

    console.log('✅ Customer registered:', user.uid);

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.uid,
        email: email,
        firstName: firstName,
        lastName: lastName
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[Customer Register] Error:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
