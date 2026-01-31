import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { storeUrl, accessToken } = body;

    if (!storeUrl || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Store URL and Access Token required' },
        { status: 400 }
      );
    }

    const url = storeUrl.includes('myshopify.com') 
      ? storeUrl 
      : `${storeUrl}.myshopify.com`;

    const response = await fetch(
      `https://${url}/admin/api/2024-01/shop.json`,
      {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      credentials: {
        provider: 'Shopify',
        shopName: data.shop?.name || 'Unknown',
        status: 'active',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
