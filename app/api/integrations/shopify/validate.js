// app/api/integrations/shopify/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { storeUrl, accessToken } = data;

    if (!storeUrl || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    // Normalize store URL
    let normalizedUrl = storeUrl.trim();
    if (!normalizedUrl.endsWith('.myshopify.com')) {
      normalizedUrl = `${normalizedUrl.replace(/\.myshopify\.com.*/, '')}.myshopify.com`;
    }

    // Validate with Shopify GraphQL API
    try {
      const response = await fetch(
        `https://${normalizedUrl}/admin/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            query: `
              query {
                shop {
                  id
                  name
                  email
                  plan {
                    displayName
                  }
                }
              }
            `,
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid Shopify credentials' },
          { status: 401 }
        );
      }

      const result = await response.json();

      if (result.errors) {
        return NextResponse.json(
          { error: result.errors[0]?.message || 'Invalid access token' },
          { status: 401 }
        );
      }

      const shop = result.data?.shop;

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
        planName: shop.plan?.displayName,
        connectedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Shopify connected successfully',
        credentials,
      });
    } catch (error) {
      console.error('Shopify validation error:', error);
      return NextResponse.json(
        { error: 'Failed to connect to Shopify store' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
