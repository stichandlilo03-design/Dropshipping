import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { apiToken } = data;

    console.log('Printful API Token validation received');

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Missing API Token. Get from Printful Dashboard → Settings → API Tokens' },
        { status: 400 }
      );
    }

    if (apiToken.length < 20) {
      return NextResponse.json(
        { error: 'API Token appears invalid (too short or incomplete)' },
        { status: 400 }
      );
    }

    console.log('Calling Printful API with Bearer token');

    const response = await fetch('https://api.printful.com/stores', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    const responseText = await response.text();
    console.log('Response length:', responseText.length);

    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Printful. Token may be invalid.' },
        { status: 401 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Response parsed successfully');
    } catch (e) {
      console.error('Parse error:', e);
      return NextResponse.json(
        { error: 'Invalid response from Printful' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorMsg = result?.error || result?.result || 'Authentication failed';
      console.error('API error:', errorMsg);
      return NextResponse.json(
        { error: `Printful Error: ${errorMsg}` },
        { status: response.status }
      );
    }

    if (result.code !== 200) {
      return NextResponse.json(
        { error: result.result || `Error code ${result.code}` },
        { status: 400 }
      );
    }

    if (!result.result || !Array.isArray(result.result) || result.result.length === 0) {
      return NextResponse.json(
        { error: 'No stores found. Create a store in Printful Dashboard first.' },
        { status: 400 }
      );
    }

    const store = result.result[0];
    console.log('✅ Store found:', store.name);

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to Printful store: ${store.name}!`,
      credentials: {
        token: apiToken.substring(0, 10) + '...' + apiToken.substring(-5),
        storeId: store.id,
        storeName: store.name,
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
