import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { apiToken } = body;

    console.log('[Printful Validator] Testing API Token...');

    if (!apiToken || typeof apiToken !== 'string') {
      console.error('[Printful Validator] ❌ Invalid API Token');
      return NextResponse.json(
        { 
          success: false, 
          error: 'API Token is required' 
        },
        { status: 400 }
      );
    }

    // Try Printful API v2 first (newer)
    console.log('[Printful Validator] Attempting API v2...');
    
    let response = await fetch('https://api.v2.printful.com/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Printful-Integration/1.0',
      },
    });

    console.log('[Printful Validator] Response status:', response.status);

    // If v2 fails, try v1 API
    if (!response.ok && response.status === 401) {
      console.log('[Printful Validator] v2 failed, trying v1 API...');
      response = await fetch('https://api.printful.com/orders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[Printful Validator] v1 Response status:', response.status);
    }

    if (!response.ok) {
      console.error('[Printful Validator] ❌ API returned:', response.status);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid API Token. Please check your Printful API Token.' 
          },
          { status: 401 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limited. Please try again later.' 
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `Printful API error: ${response.status}` 
        },
        { status: response.status }
      );
    }

    console.log('[Printful Validator] ✅ API Token is valid!');

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Printful',
        status: 'active',
        apiVersion: 'v2',
      },
    });

  } catch (error) {
    console.error('[Printful Validator] ❌ Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
