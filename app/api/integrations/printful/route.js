import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { apiToken } = await request.json();

    console.log('[Printful Validator] Testing API Token...');

    if (!apiToken || typeof apiToken !== 'string') {
      console.error('[Printful Validator] ❌ Invalid API Token format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'API Token is required and must be a string' 
        },
        { status: 400 }
      );
    }

    // Test Printful API v2
    console.log('[Printful Validator] Making test request to Printful API...');
    
    const response = await fetch('https://api.v2.printful.com/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.text();
    console.log('[Printful Validator] Response status:', response.status);

    if (!response.ok) {
      console.error('[Printful Validator] ❌ API validation failed:', responseData.substring(0, 200));
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid API Token. Please check your Printful API Token.' 
          },
          { status: 401 }
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

    // Return success with credentials info
    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Printful',
        status: 'active',
        apiVersion: 'v2',
        testedAt: new Date().toISOString(),
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
