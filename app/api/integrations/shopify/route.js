import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { storeUrl, accessToken } = await request.json();

    console.log('[Shopify Validator] Testing Store URL and Access Token...');

    if (!storeUrl || !accessToken) {
      console.error('[Shopify Validator] ❌ Missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Store URL and Access Token are required' 
        },
        { status: 400 }
      );
    }

    // Normalize store URL
    const normalizedUrl = storeUrl.includes('myshopify.com') 
      ? storeUrl 
      : `${storeUrl}.myshopify.com`;

    console.log('[Shopify Validator] Testing with store:', normalizedUrl);

    // Test Shopify API
    const response = await fetch(
      `https://${normalizedUrl}/admin/api/2024-01/shop.json`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const responseData = await response.text();
    console.log('[Shopify Validator] Response status:', response.status);

    if (!response.ok) {
      console.error('[Shopify Validator] ❌ API validation failed:', responseData.substring(0, 200));
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid Access Token or Store URL. Please check your Shopify credentials.' 
          },
          { status: 401 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Store not found. Please check your Store URL.' 
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

    let shopData;
    try {
      shopData = JSON.parse(responseData);
    } catch (e) {
      console.error('[Shopify Validator] ❌ Failed to parse response');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid response from Shopify' 
        },
        { status: 500 }
      );
    }

    console.log('[Shopify Validator] ✅ Credentials are valid!');
    console.log('[Shopify Validator] Shop name:', shopData.shop?.name);

    // Return success with shop info
    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Shopify',
        shopName: shopData.shop?.name || 'Unknown',
        storeUrl: normalizedUrl,
        status: 'active',
        apiVersion: '2024-01',
        testedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Shopify Validator] ❌ Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
