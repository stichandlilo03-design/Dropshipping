import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    console.log('Printful validation request received');

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client ID or Client Secret' },
        { status: 400 }
      );
    }

    // Create Basic Auth header
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    console.log('Calling Printful API with Basic Auth');

    const response = await fetch('https://api.printful.com/stores', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DropBoard/1.0',
      },
    });

    console.log('Printful response status:', response.status);

    const responseText = await response.text();

    if (!responseText || responseText.trim().length === 0) {
      console.error('Empty response from Printful');
      return NextResponse.json(
        { error: 'Empty response from Printful. Check your credentials.' },
        { status: 401 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Response parsed as JSON');
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from Printful' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('API returned error:', result);
      return NextResponse.json(
        { error: result.error || result.result || 'Authentication failed' },
        { status: response.status }
      );
    }

    if (result.code !== 200) {
      return NextResponse.json(
        { error: result.result || 'Printful error' },
        { status: 400 }
      );
    }

    if (!result.result || !Array.isArray(result.result) || result.result.length === 0) {
      return NextResponse.json(
        { error: 'No stores found in your Printful account' },
        { status: 400 }
      );
    }

    const store = result.result[0];
    console.log('✅ Store found:', store.name);

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to Printful store: ${store.name}!`,
      credentials: {
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

// Handle OPTIONS for CORS
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
