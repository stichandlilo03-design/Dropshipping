import { NextResponse } from 'next/server';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function POST(request) {
  try {
    // Sign out from Firebase
    await signOut(auth);

    console.log('✅ Customer logged out');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[Customer Logout] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
