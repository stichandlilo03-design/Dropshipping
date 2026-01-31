import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { publishableKey, secretKey } = body;

    console.log('[Stripe Validator] Testing Keys...');

    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Publishable Key and Secret Key are required' 
        },
        { status: 400 }
      );
    }

    if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid key format (pk_ and sk_)' 
        },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    console.log('[Stripe Validator] Response:', response.status);

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Secret Key' 
        },
        { status: 401 }
      );
    }

    const keyType = secretKey.includes('_live_') ? 'Live' : 'Test';

    console.log('[Stripe Validator] ✅ Valid! Key type:', keyType);

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Stripe',
        keyType: keyType,
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[Stripe Validator] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
