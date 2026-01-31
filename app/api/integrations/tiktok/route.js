import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { clientKey, clientSecret } = body;

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Client Key and Secret required' },
        { status: 400 }
      );
    }

    if (clientKey.length < 10 || clientSecret.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'TikTok Shop',
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
