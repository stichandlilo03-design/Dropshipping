import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { publishableKey, secretKey } = data;

    console.log('Stripe validation request received');

    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { error: 'Missing Publishable Key or Secret Key' },
        { status: 400 }
      );
    }

    // Validate key formats
    if (!publishableKey.startsWith('pk_')) {
      return NextResponse.json(
        { error: 'Invalid Publishable Key format (should start with pk_)' },
        { status: 400 }
      );
    }

    if (!secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Invalid Secret Key format (should start with sk_)' },
        { status: 400 }
      );
    }

    console.log('Verifying Stripe Secret Key...');

    // Verify secret key by calling Stripe API
    const response = await fetch('https://api.stripe.com/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Stripe response status:', response.status);

    const responseText = await response.text();

    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Stripe' },
        { status: 401 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid response from Stripe' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      let errorMsg = 'Authentication failed';
      if (result.error) {
        if (typeof result.error === 'string') {
          errorMsg = result.error;
        } else if (result.error.message) {
          errorMsg = result.error.message;
        }
      }
      return NextResponse.json(
        { error: `Stripe Error: ${errorMsg}` },
        { status: response.status }
      );
    }

    if (!result.id) {
      return NextResponse.json(
        { error: 'Could not verify Stripe account' },
        { status: 400 }
      );
    }

    console.log('✅ Stripe account verified:', result.id);

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to Stripe account!`,
      credentials: {
        publishableKey,
        secretKey: secretKey.substring(0, 10) + '...',
        accountId: result.id,
        accountEmail: result.email,
        businessType: result.business_type,
        connectedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
