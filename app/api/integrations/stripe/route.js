import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { publishableKey, secretKey } = body;

    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { success: false, error: 'Both keys required' },
        { status: 400 }
      );
    }

    if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid key format' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid Secret Key' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Stripe',
        keyType: secretKey.includes('_live_') ? 'Live' : 'Test',
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
