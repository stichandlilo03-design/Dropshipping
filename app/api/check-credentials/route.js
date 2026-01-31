export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request) {
  // Get credentials from query params (for testing)
  const storeUrl = request.nextUrl.searchParams.get('storeUrl');
  const token = request.nextUrl.searchParams.get('token');

  if (!storeUrl || !token) {
    return NextResponse.json({
      error: 'Missing storeUrl or token',
      example: '/api/check-credentials?storeUrl=dropshipwithmonk.myshopify.com&token=shpat_...'
    });
  }

  // Clean URL
  const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();

  console.log('\n========== CREDENTIAL CHECK ==========');
  console.log('Original URL:', storeUrl);
  console.log('Clean URL:', cleanUrl);
  console.log('Token length:', token.length);
  console.log('Token starts with shpat_:', token.startsWith('shpat_'));

  // Test API call
  const apiUrl = `https://${cleanUrl}/admin/api/2025-01/products.json?limit=1`;
  console.log('Testing URL:', apiUrl);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ SUCCESS! Products found:', data.products?.length);
      
      return NextResponse.json({
        success: true,
        status: 200,
        message: '✅ Credentials are CORRECT!',
        productsFound: data.products?.length,
        storeUrl: cleanUrl,
      });
    } else if (response.status === 401) {
      console.log('❌ ERROR: Invalid token (401)');
      return NextResponse.json({
        success: false,
        status: 401,
        message: '❌ Token is INVALID or EXPIRED. Reconnect Shopify to get a new token.',
        storeUrl: cleanUrl,
      });
    } else if (response.status === 404) {
      console.log('❌ ERROR: Store URL not found (404)');
      return NextResponse.json({
        success: false,
        status: 404,
        message: '❌ Store URL is WRONG. Should be: dropshipwithmonk.myshopify.com (no https://, no trailing /)',
        storeUrl: cleanUrl,
      });
    } else {
      const text = await response.text();
      console.log('❌ ERROR:', text.substring(0, 200));
      return NextResponse.json({
        success: false,
        status: response.status,
        message: `HTTP ${response.status} Error`,
        error: text.substring(0, 200),
        storeUrl: cleanUrl,
      });
    }
  } catch (err) {
    console.error('❌ EXCEPTION:', err.message);
    return NextResponse.json({
      success: false,
      message: 'Connection failed',
      error: err.message,
    });
  }
}
