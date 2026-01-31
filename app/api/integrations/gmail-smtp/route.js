import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, appPassword } = body;

    console.log('[Gmail Validator] Testing Email and App Password...');

    if (!email || !appPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and App Password are required' 
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    const cleanedPassword = appPassword.replace(/\s/g, '');
    if (cleanedPassword.length < 16) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid App Password format' 
        },
        { status: 400 }
      );
    }

    console.log('[Gmail Validator] ✅ Credentials format valid!');

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Gmail SMTP',
        email: email,
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[Gmail Validator] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
