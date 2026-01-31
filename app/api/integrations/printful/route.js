import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { apiToken } = body;

    console.log('[Printful Validator] Testing API Token...');

    if (!apiToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API Token is required' 
        },
        { status: 400 }
      );
    }

    // Test Printful API
    const response = await fetch('https://api.v2.printful.com/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    console.log('[Printful Validator] Response:', response.status);

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid API Token. Please check your Printful API Token.' 
        },
        { status: 401 }
      );
    }

    console.log('[Printful Validator] ✅ API Token valid!');

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Printful',
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[Printful Validator] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
