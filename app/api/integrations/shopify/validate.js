// app/api/integrations/shopify/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { storeUrl, accessToken } = data;

    if (!storeUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing Store URL or Access Token' },
        { status: 400 }
      );
    }

    // Normalize store URL
    let normalizedUrl = storeUrl.trim();
    if (!normalizedUrl.includes('.myshopify.com')) {
      normalizedUrl = `${normalizedUrl}.myshopify.com`;
    }
    // Remove protocol if present
    normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

    console.log('Shopify validation:', { normalizedUrl, tokenExists: !!accessToken });

    // Validate with Shopify REST API (more reliable)
    try {
      const response = await fetch(
        `https://${normalizedUrl}/admin/api/2024-01/shop.json`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      console.log('Shopify response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Shopify error:', errorData);
        
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid access token. Check your token in Shopify Admin → Settings → Apps → Develop apps' },
            { status: 401 }
          );
        }
        
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'Store not found. Check your store URL (e.g., dropshipwithmonk.myshopify.com)' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: `Shopify API error: ${response.statusText}` },
          { status: response.status }
        );
      }

      const result = await response.json();
      const shop = result.shop;

      if (!shop) {
        return NextResponse.json(
          { error: 'Could not retrieve shop information' },
          { status: 401 }
        );
      }

      const credentials = {
        storeUrl: normalizedUrl,
        accessToken,
        shopId: shop.id,
        shopName: shop.name,
        shopEmail: shop.email,
        shopCurrency: shop.currency,
        shopPlan: shop.plan_display_name,
        createdAt: shop.created_at,
        connectedAt: new Date().toISOString(),
      };

      console.log('Shopify connection successful:', { shopName: shop.name });

      return NextResponse.json({
        success: true,
        message: `Successfully connected to ${shop.name}!`,
        credentials,
      });
    } catch (apiError) {
      console.error('Shopify API validation error:', apiError);
      return NextResponse.json(
        { 
          error: `Failed to connect to Shopify: ${apiError.message}. Make sure the store URL is correct (dropshipwithmonk.myshopify.com) and access token is valid.` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
