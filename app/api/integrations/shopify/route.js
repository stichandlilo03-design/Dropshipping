import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { storeUrl, accessToken } = body;

    console.log('[Shopify] Validating credentials...');

    if (!storeUrl || !accessToken) {
      console.error('[Shopify] ❌ Missing storeUrl or accessToken');
      return NextResponse.json(
        { success: false, error: 'Store URL and Access Token are required' },
        { status: 400 }
      );
    }

    // Normalize store URL
    let normalizedUrl = storeUrl;
    if (!normalizedUrl.includes('myshopify.com')) {
      normalizedUrl = `${storeUrl}.myshopify.com`;
    }
    if (normalizedUrl.includes('https://')) {
      normalizedUrl = normalizedUrl.replace('https://', '');
    }
    if (normalizedUrl.includes('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', '');
    }

    console.log('[Shopify] Store URL:', normalizedUrl);

    // Test Shopify Admin API
    const apiUrl = `https://${normalizedUrl}/admin/api/2024-01/shop.json`;
    console.log('[Shopify] Testing API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Shopify] Response status:', response.status);

    if (!response.ok) {
      console.error('[Shopify] ❌ API validation failed:', response.status);
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid Access Token or Store URL. Make sure you\'re using an Admin API access token from your Shopify App.' 
          },
          { status: 401 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Store not found. Check your store URL.' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `Shopify API error: ${response.status}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const shopName = data.shop?.name || 'Unknown Store';

    console.log('[Shopify] ✅ Valid! Shop:', shopName);

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Shopify',
        shopName: shopName,
        storeUrl: normalizedUrl,
        status: 'active',
      },
    });

  } catch (error) {
    console.error('[Shopify] ❌ Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
