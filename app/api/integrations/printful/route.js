import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { apiToken } = data;

    console.log('Printful API Token validation received');
    console.log('Token length:', apiToken?.length);

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
    console.log('Response:', responseText);

    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Printful. Token may be invalid or expired.' },
        { status: 401 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Response parsed successfully');
      console.log('Result:', result);
    } catch (e) {
      console.error('Parse error:', e);
      return NextResponse.json(
        { error: 'Invalid response from Printful' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Response not OK:', response.status);
      console.error('Result object:', JSON.stringify(result));
      
      // Extract error message from various possible formats
      let errorMsg = 'Authentication failed';
      
      if (result.error) {
        if (typeof result.error === 'string') {
          errorMsg = result.error;
        } else if (typeof result.error === 'object') {
          if (result.error.message) {
            errorMsg = result.error.message;
          } else if (result.error.reason) {
            errorMsg = result.error.reason;
          } else {
            errorMsg = 'Invalid token or access denied';
          }
        }
      } else if (result.result && typeof result.result === 'string') {
        errorMsg = result.result;
      }
      
      console.log('Final error message:', errorMsg);
      
      return NextResponse.json(
        { error: `Printful Error: ${errorMsg}` },
        { status: response.status }
      );
    }

    // Check Printful response code
    if (result.code && result.code !== 200) {
      console.error('Printful code not 200:', result.code);
      const msg = result.result || result.message || 'Unknown error';
      return NextResponse.json(
        { error: `Printful Error: ${msg}` },
        { status: 400 }
      );
    }

    // Check if we have stores
    if (!result.result || !Array.isArray(result.result) || result.result.length === 0) {
      console.error('No stores in response');
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
    console.error('Error message:', error.message);
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
