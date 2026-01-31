import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { publishableKey, secretKey } = await request.json();

    console.log('[Stripe Validator] Testing Publishable and Secret Keys...');

    if (!publishableKey || !secretKey) {
      console.error('[Stripe Validator] ❌ Missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Publishable Key and Secret Key are required' 
        },
        { status: 400 }
      );
    }

    // Validate key formats
    if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) {
      console.error('[Stripe Validator] ❌ Invalid key format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid key format. Publishable Key should start with "pk_" and Secret Key should start with "sk_"' 
        },
        { status: 400 }
      );
    }

    console.log('[Stripe Validator] Testing with Stripe API...');

    // Test Stripe API with secret key
    const response = await fetch('https://api.stripe.com/v1/customers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const responseData = await response.text();
    console.log('[Stripe Validator] Response status:', response.status);

    if (!response.ok) {
      console.error('[Stripe Validator] ❌ API validation failed:', responseData.substring(0, 200));
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid Secret Key. Please check your Stripe Secret Key.' 
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `Stripe API error: ${response.status}` 
        },
        { status: response.status }
      );
    }

    let stripeData;
    try {
      stripeData = JSON.parse(responseData);
    } catch (e) {
      console.error('[Stripe Validator] ❌ Failed to parse response');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid response from Stripe' 
        },
        { status: 500 }
      );
    }

    console.log('[Stripe Validator] ✅ Keys are valid!');

    // Return success with account info
    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Stripe',
        keyType: secretKey.includes('_live_') ? 'Live' : 'Test',
        status: 'active',
        apiVersion: '2023-10-16',
        testedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Stripe Validator] ❌ Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
