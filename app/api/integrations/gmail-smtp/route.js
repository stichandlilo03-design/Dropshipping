import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, appPassword } = body;

    if (!email || !appPassword) {
      return NextResponse.json(
        { success: false, error: 'Email and App Password required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Must be a Gmail address' },
        { status: 400 }
      );
    }

    // Validate app password format (16 chars without spaces)
    const cleanPassword = appPassword.replace(/\s/g, '');
    if (cleanPassword.length !== 16) {
      return NextResponse.json(
        { success: false, error: 'App Password must be 16 characters' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Gmail SMTP',
        email: email,
        status: 'active',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
