import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    console.log('Printful token validation request received');

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client ID or Client Secret' },
        { status: 400 }
      );
    }

    console.log('Using Bearer token authentication...');

    // Printful expects the SECRET as the Bearer token directly
    // The clientId is just metadata, the clientSecret is the actual token
    const token = clientSecret; // This IS the API token!

    console.log('Calling Printful API with Bearer token...');

    const response = await fetch('https://api.printful.com/stores', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Printful response status:', response.status);

    const responseText = await response.text();
    console.log('Response length:', responseText.length);
    console.log('Response first 200 chars:', responseText.substring(0, 200));

    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Printful. Check your token.' },
        { status: 401 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Response parsed as JSON');
    } catch (e) {
      console.error('Failed to parse response:', e);
      return NextResponse.json(
        { error: 'Invalid response from Printful' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('API returned error:', result);
      const errorMsg = result?.error?.message || result?.error?.reason || result?.result || 'Authentication failed';
      return NextResponse.json(
        { error: `Printful Error: ${errorMsg}` },
        { status: response.status }
      );
    }

    // Printful returns { code, result }
    if (result.code !== 200) {
      console.error('Non-200 code:', result.code);
      return NextResponse.json(
        { error: result.result || `Error code ${result.code}` },
        { status: 400 }
      );
    }

    if (!result.result || !Array.isArray(result.result) || result.result.length === 0) {
      console.error('No stores in response');
      return NextResponse.json(
        { error: 'No stores found. Create a store in Printful first.' },
        { status: 400 }
      );
    }

    const store = result.result[0];
    console.log('✅ Store found:', store.name);
    console.log('===== PRINTFUL VALIDATION SUCCESS =====');

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to Printful store: ${store.name}!`,
      credentials: {
        clientId,
        token: token.substring(0, 10) + '...' + token.substring(-5),
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
