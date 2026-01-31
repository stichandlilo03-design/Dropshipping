import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    console.log('Printful OAuth 2.0 validation request received');

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client ID or Client Secret' },
        { status: 400 }
      );
    }

    console.log('Exchanging credentials for OAuth 2.0 token...');

    // Step 1: Get OAuth 2.0 token
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('grant_type', 'client_credentials');

    const tokenResponse = await fetch('https://www.printful.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    console.log('OAuth token response status:', tokenResponse.status);

    const tokenText = await tokenResponse.text();

    if (!tokenText || tokenText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Printful OAuth endpoint' },
        { status: 401 }
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
      console.log('OAuth token response parsed');
    } catch (e) {
      console.error('Failed to parse token response:', e);
      return NextResponse.json(
        { error: 'Invalid response from Printful OAuth' },
        { status: 500 }
      );
    }

    if (!tokenResponse.ok) {
      console.error('OAuth failed:', tokenData);
      return NextResponse.json(
        { error: tokenData.error_description || tokenData.error || 'OAuth authentication failed' },
        { status: 401 }
      );
    }

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return NextResponse.json(
        { error: 'No access token received from Printful' },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;
    console.log('✅ OAuth token acquired:', accessToken.substring(0, 10) + '...');

    // Step 2: Use token to get stores
    console.log('Fetching stores with OAuth token...');

    const storesResponse = await fetch('https://api.printful.com/stores', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Stores response status:', storesResponse.status);

    const storesText = await storesResponse.text();

    if (!storesText || storesText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from stores endpoint' },
        { status: 401 }
      );
    }

    let storesData;
    try {
      storesData = JSON.parse(storesText);
      console.log('Stores response parsed');
    } catch (e) {
      console.error('Failed to parse stores response:', e);
      return NextResponse.json(
        { error: 'Invalid response from stores endpoint' },
        { status: 500 }
      );
    }

    if (!storesResponse.ok) {
      console.error('Stores API failed:', storesData);
      return NextResponse.json(
        { error: storesData.error || storesData.result || 'Failed to fetch stores' },
        { status: storesResponse.status }
      );
    }

    if (storesData.code !== 200) {
      return NextResponse.json(
        { error: storesData.result || 'API error' },
        { status: 400 }
      );
    }

    if (!storesData.result || !Array.isArray(storesData.result) || storesData.result.length === 0) {
      console.error('No stores found:', storesData);
      return NextResponse.json(
        { error: 'No stores found in your Printful account. Create a store first.' },
        { status: 400 }
      );
    }

    const store = storesData.result[0];
    console.log('✅ Store found:', store.name);
    console.log('===== PRINTFUL OAUTH SUCCESS =====');

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to Printful store: ${store.name}!`,
      credentials: {
        clientId,
        clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5),
        accessToken: accessToken.substring(0, 10) + '...',
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
