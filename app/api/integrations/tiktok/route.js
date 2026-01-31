import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { clientKey, clientSecret } = body;

    console.log('[TikTok Validator] Testing Credentials...');

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Client Key and Client Secret are required' 
        },
        { status: 400 }
      );
    }

    if (clientKey.length < 10 || clientSecret.length < 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid credentials format' 
        },
        { status: 400 }
      );
    }

    console.log('[TikTok Validator] ✅ Credentials format valid!');

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'TikTok Shop',
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[TikTok Validator] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
