import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { storeUrl, accessToken } = data;

    console.log('Shopify validation request received');

    if (!storeUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing Store URL or Access Token' },
        { status: 400 }
      );
    }

    // Normalize store URL (remove https://, ensure .myshopify.com)
    let normalizedUrl = storeUrl.toLowerCase().trim();
    if (normalizedUrl.includes('https://')) {
      normalizedUrl = normalizedUrl.replace('https://', '');
    }
    if (normalizedUrl.includes('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', '');
    }
    if (!normalizedUrl.includes('.myshopify.com')) {
      normalizedUrl = normalizedUrl.replace('.myshopify.com', '');
      normalizedUrl += '.myshopify.com';
    }

    console.log('Calling Shopify API:', normalizedUrl);

    const response = await fetch(`https://${normalizedUrl}/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    const responseText = await response.text();

    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Shopify. Check your credentials.' },
        { status: 401 }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Parse error:', e);
      return NextResponse.json(
        { error: 'Invalid response from Shopify' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Shopify error:', result);
      
      let errorMsg = 'Authentication failed';
      if (result.errors) {
        errorMsg = Object.values(result.errors).flat().join(', ');
      } else if (result.message) {
        errorMsg = result.message;
      }

      return NextResponse.json(
        { error: `Shopify Error: ${errorMsg}` },
        { status: response.status }
      );
    }

    if (!result.shop) {
      return NextResponse.json(
        { error: 'No shop data returned' },
        { status: 400 }
      );
    }

    const shop = result.shop;
    console.log('✅ Shop found:', shop.name);

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to Shopify store: ${shop.name}!`,
      credentials: {
        storeName: shop.name,
        storeUrl: normalizedUrl,
        shopId: shop.id,
        email: shop.email,
        country: shop.country_code,
        currency: shop.currency,
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
