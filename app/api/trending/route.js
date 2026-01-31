export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.log('[Trending API] ❌ No user ID');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
      }, { status: 401 });
    }

    console.log('[Trending API] 📥 User:', userId);

    // Get integrations from header
    const integrationsParam = request.headers.get('x-integrations');
    
    if (!integrationsParam) {
      console.log('[Trending API] ❌ No integrations data');
      return NextResponse.json({
        success: false,
        error: 'No integrations data',
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
      }, { status: 400 });
    }

    let integrations = {};
    try {
      integrations = JSON.parse(integrationsParam);
    } catch (e) {
      console.error('[Trending API] ❌ Failed to parse integrations:', e);
      return NextResponse.json({
        success: false,
        error: 'Invalid integrations data',
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
      }, { status: 400 });
    }

    console.log('[Trending API] 📊 Integrations received:', Object.keys(integrations));
    
    // Debug: Log what we have
    Object.keys(integrations).forEach(key => {
      const integ = integrations[key];
      console.log(`[Trending API] 🔍 ${key}:`, {
        status: integ?.status,
        hasCredentials: !!integ?.credentials,
        credentialKeys: integ?.credentials ? Object.keys(integ.credentials) : [],
      });
    });

    const connectedApis = Object.keys(integrations).filter(
      key => integrations[key]?.status === 'connected'
    );

    console.log('[Trending API] ✅ Connected APIs:', connectedApis);

    const requiredApis = ['printful', 'shopify', 'tiktok'].filter(
      api => !connectedApis.includes(api)
    );

    let allProducts = [];

    // Fetch from Printful
    if (connectedApis.includes('printful')) {
      console.log('[Trending API] 🔍 Printful check:');
      const printfulInteg = integrations.printful;
      console.log('[Trending API]   - Has printful integration:', !!printfulInteg);
      console.log('[Trending API]   - Status:', printfulInteg?.status);
      console.log('[Trending API]   - Has credentials:', !!printfulInteg?.credentials);
      console.log('[Trending API]   - Credential keys:', Object.keys(printfulInteg?.credentials || {}));
      
      const token = printfulInteg?.credentials?.apiToken;
      console.log('[Trending API]   - Has apiToken:', !!token);
      console.log('[Trending API]   - Token length:', token?.length);
      console.log('[Trending API]   - Token starts with:', token?.substring(0, 10) + '...');

      if (token) {
        console.log('[Trending API] 🔄 Fetching Printful...');
        try {
          const response = await fetch('https://api.v2.printful.com/products', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('[Trending API]   - Response status:', response.status);
          console.log('[Trending API]   - Response OK:', response.ok);

          if (response.ok) {
            const data = await response.json();
            console.log('[Trending API]   - Response has result:', !!data.result);
            console.log('[Trending API]   - Result length:', data.result?.length || 0);
            
            const products = (data.result || []).slice(0, 10).map(p => ({
              id: `printful_${p.id}`,
              title: p.title,
              supplier: 'Printful',
              image: p.image,
              type: p.type_name,
            }));
            allProducts = allProducts.concat(products);
            console.log('[Trending API] ✅ Printful:', products.length, 'products');
          } else {
            const errorText = await response.text();
            console.error('[Trending API]   - Error response:', errorText.substring(0, 200));
          }
        } catch (err) {
          console.error('[Trending API] ❌ Printful fetch error:', err.message);
        }
      } else {
        console.log('[Trending API] ❌ No Printful token found!');
      }
    } else {
      console.log('[Trending API] ⏭️ Printful not in connected APIs');
    }

    // Fetch from Shopify
    if (connectedApis.includes('shopify')) {
      console.log('[Trending API] 🔍 Shopify check:');
      const shopifyInteg = integrations.shopify;
      console.log('[Trending API]   - Has shopify integration:', !!shopifyInteg);
      console.log('[Trending API]   - Status:', shopifyInteg?.status);
      console.log('[Trending API]   - Has credentials:', !!shopifyInteg?.credentials);
      console.log('[Trending API]   - Credential keys:', Object.keys(shopifyInteg?.credentials || {}));
      
      const storeUrl = shopifyInteg?.credentials?.storeUrl;
      const token = shopifyInteg?.credentials?.accessToken;
      
      console.log('[Trending API]   - Has storeUrl:', !!storeUrl);
      console.log('[Trending API]   - StoreUrl value:', storeUrl);
      console.log('[Trending API]   - Has accessToken:', !!token);
      console.log('[Trending API]   - Token length:', token?.length);

      if (storeUrl && token) {
        console.log('[Trending API] 🔄 Fetching Shopify...');
        try {
          const response = await fetch(
            `https://${storeUrl}/admin/api/2024-01/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: `{
                  products(first: 10, sortKey: CREATED, reverse: true) {
                    edges {
                      node {
                        id
                        title
                        description
                        featuredImage { url }
                        priceRange { minVariantPrice { amount } }
                      }
                    }
                  }
                }`,
              }),
            }
          );

          console.log('[Trending API]   - Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[Trending API]   - Has errors:', !!data.errors);
            if (data.errors) {
              console.error('[Trending API]   - GraphQL error:', data.errors[0]?.message);
            } else {
              const edges = data.data?.products?.edges || [];
              console.log('[Trending API]   - Product edges:', edges.length);
              
              const products = edges.map(edge => {
                const p = edge.node;
                return {
                  id: `shopify_${p.id}`,
                  title: p.title,
                  supplier: 'Shopify',
                  image: p.featuredImage?.url,
                  price: p.priceRange?.minVariantPrice?.amount,
                  description: p.description?.substring(0, 100),
                };
              });
              allProducts = allProducts.concat(products);
              console.log('[Trending API] ✅ Shopify:', products.length, 'products');
            }
          } else {
            const errorText = await response.text();
            console.error('[Trending API]   - Error response:', errorText.substring(0, 200));
          }
        } catch (err) {
          console.error('[Trending API] ❌ Shopify fetch error:', err.message);
        }
      } else {
        console.log('[Trending API] ❌ Missing Shopify credentials!');
        console.log('[Trending API]    storeUrl:', storeUrl);
        console.log('[Trending API]    token:', token ? 'yes' : 'no');
      }
    } else {
      console.log('[Trending API] ⏭️ Shopify not in connected APIs');
    }

    console.log('[Trending API] 📦 Final count:', allProducts.length, 'products');

    return NextResponse.json({
      success: true,
      products: allProducts,
      connectedApis: connectedApis,
      requiredApis: requiredApis,
      message:
        connectedApis.length > 0
          ? `${allProducts.length} products from ${connectedApis.join(', ')}`
          : 'Connect APIs to see products',
      debug: {
        integrationsReceived: Object.keys(integrations),
        connectedApis,
        printfulHasToken: !!integrations.printful?.credentials?.apiToken,
        shopifyHasCredentials: !!(integrations.shopify?.credentials?.storeUrl && integrations.shopify?.credentials?.accessToken),
      },
    });
  } catch (error) {
    console.error('[Trending API] 💥 Fatal error:', error.message);
    console.error('[Trending API] Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
      },
      { status: 500 }
    );
  }
}
