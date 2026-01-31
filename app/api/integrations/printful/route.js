import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { apiToken } = body;

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'API Token is required' },
        { status: 400 }
      );
    }

    // Test with Printful API
    const response = await fetch('https://api.v2.printful.com/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: response.status === 401 
            ? 'Invalid API Token' 
            : `API Error: ${response.status}`
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Printful',
        status: 'active',
      },
    });

  } catch (error) {
    console.error('Printful validator error:', error);
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
