import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { apiToken } = body;

    console.log('[Printful] Validating token format...');

    // Validate token exists and is a string
    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API Token is required' },
        { status: 400 }
      );
    }

    // Validate token length (Printful tokens are typically 50+ characters)
    if (apiToken.length < 20) {
      return NextResponse.json(
        { success: false, error: 'API Token appears too short' },
        { status: 400 }
      );
    }

    // Token looks valid
    console.log('[Printful] ✅ Token format valid');

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Printful',
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[Printful] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Validation error' },
      { status: 500 }
    );
  }
}
