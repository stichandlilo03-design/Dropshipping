import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { storeUrl, accessToken } = body;

    console.log('[Shopify Validator] Testing Store URL and Access Token...');

    if (!storeUrl || !accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Store URL and Access Token are required' 
        },
        { status: 400 }
      );
    }

    const normalizedUrl = storeUrl.includes('myshopify.com') 
      ? storeUrl 
      : `${storeUrl}.myshopify.com`;

    console.log('[Shopify Validator] Testing:', normalizedUrl);

    const response = await fetch(
      `https://${normalizedUrl}/admin/api/2024-01/shop.json`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    console.log('[Shopify Validator] Response:', response.status);

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Access Token or Store URL' 
        },
        { status: 401 }
      );
    }

    const data = await response.json();

    console.log('[Shopify Validator] ✅ Valid! Shop:', data.shop?.name);

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Shopify',
        shopName: data.shop?.name || 'Unknown',
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[Shopify Validator] Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
