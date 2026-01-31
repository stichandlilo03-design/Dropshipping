export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    const integrationsParam = request.headers.get('x-integrations');
    
    if (!userId) {
      console.log('[Trending API] ❌ No user ID');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        products: [],
        connectedApis: [],
      }, { status: 401 });
    }

    if (!integrationsParam) {
      return NextResponse.json({
        success: false,
        error: 'No integrations data',
        products: [],
        connectedApis: [],
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
      }, { status: 400 });
    }

    const connectedApis = Object.keys(integrations).filter(
      key => integrations[key]?.status === 'connected'
    );

    console.log('[Trending API] ✅ Connected APIs:', connectedApis);

    let allProducts = [];

    // ============================================================================
    // FETCH FROM SHOPIFY - REST API (UPDATED TO 2025-01)
    // ============================================================================
    if (
      connectedApis.includes('shopify') &&
      integrations.shopify?.credentials?.storeUrl &&
      integrations.shopify?.credentials?.accessToken
    ) {
      console.log('[Trending API] 🔄 Fetching Shopify products...');
      try {
        const storeUrl = integrations.shopify.credentials.storeUrl;
        const token = integrations.shopify.credentials.accessToken;

        console.log('[Trending API] 📍 Store URL:', storeUrl);
        console.log('[Trending API] 🔐 Token exists:', !!token);

        // ✅ UPDATED: 2024-01 → 2025-01
        const response = await fetch(
          `https://${storeUrl}/admin/api/2025-01/products.json?limit=20&fields=id,title,handle,description,vendor,product_type,images,variants,published_at,status`,
          {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('[Trending API] 📊 Shopify response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          const shopifyProducts = (data.products || []).filter(p => p.status === 'active');

          console.log('[Trending API] 📦 API returned:', data.products?.length || 0, 'products');
          console.log('[Trending API] ✅ Active products:', shopifyProducts.length);

          const products = shopifyProducts.map(p => {
            const firstVariant = p.variants?.[0];
            const firstImage = p.images?.[0];

            return {
              id: `shopify_${p.id}`,
              title: p.title,
              supplier: 'Shopify (Your Store)',
              image: firstImage?.src,
              handle: p.handle,
              price: firstVariant?.price,
              currency: 'USD',
              description: p.description ? p.description.substring(0, 150) : null,
              availability_status: firstVariant ? 'in_stock' : 'out_of_stock',
              product_type: p.product_type,
              brand: p.vendor,
              variants: p.variants?.length || 0,
              store_url: `https://${storeUrl}/products/${p.handle}`,
              source: 'shopify_store'
            };
          });

          allProducts = allProducts.concat(products);
          console.log('[Trending API] ✅ Shopify: Loaded', products.length, 'products');
        } else {
          const errorText = await response.text();
          console.error('[Trending API] ❌ Shopify returned:', response.status);
          console.error('[Trending API] ❌ Error:', errorText);
        }
      } catch (err) {
        console.error('[Trending API] ❌ Shopify error:', err.message);
      }
    }

    // ============================================================================
    // FETCH FROM SHOPIFY - GRAPHQL (UPDATED TO 2025-01)
    // ============================================================================
    if (
      connectedApis.includes('shopify') &&
      integrations.shopify?.credentials?.storeUrl &&
      integrations.shopify?.credentials?.accessToken &&
      allProducts.length === 0
    ) {
      console.log('[Trending API] 🔄 Trying GraphQL with updated API version...');
      try {
        const storeUrl = integrations.shopify.credentials.storeUrl;
        const token = integrations.shopify.credentials.accessToken;

        // ✅ UPDATED: 2024-01 → 2025-01
        const response = await fetch(
          `https://${storeUrl}/admin/api/2025-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `{
                products(first: 20, sortKey: CREATED, reverse: true) {
                  edges {
                    node {
                      id
                      title
                      description
                      productType
                      vendor
                      totalInventory
                      availableForSale
                      onlineStoreUrl
                      featuredImage { url }
                      priceRange { minVariantPrice { amount } }
                      variants(first: 5) {
                        edges {
                          node {
                            title
                            availableForSale
                          }
                        }
                      }
                    }
                  }
                }
              }`,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.errors) {
            console.warn('[Trending API] ⚠️ GraphQL error:', data.errors[0]?.message);
          } else if (data.data?.products?.edges?.length > 0) {
            const products = data.data.products.edges.map(edge => {
              const p = edge.node;
              return {
                id: `shopify_${p.id}`,
                title: p.title,
                supplier: 'Shopify (Your Store)',
                image: p.featuredImage?.url,
                price: p.priceRange?.minVariantPrice?.amount,
                currency: 'USD',
                description: p.description ? p.description.substring(0, 150) : null,
                availability_status: p.availableForSale ? 'in_stock' : 'out_of_stock',
                product_type: p.productType,
                brand: p.vendor,
                stock_count: p.totalInventory,
                variants: p.variants?.edges?.length || 0,
                store_url: p.onlineStoreUrl,
                source: 'shopify_store'
              };
            });

            allProducts = allProducts.concat(products);
            console.log('[Trending API] ✅ Shopify GraphQL: Loaded', products.length, 'products');
          }
        }
      } catch (err) {
        console.error('[Trending API] ❌ GraphQL error:', err.message);
      }
    }

    // ============================================================================
    // FETCH FROM PRINTFUL
    // ============================================================================
    if (connectedApis.includes('printful') && integrations.printful?.credentials?.apiToken) {
      console.log('[Trending API] 🔄 Fetching Printful products...');
      try {
        const token = integrations.printful.credentials.apiToken;

        // Popular Printful product IDs
        const bestsellerIds = [
          71,    // Bella + Canvas T-Shirt
          172,   // Framed Poster
          23,    // Hoodie
          49,    // Dad Hat
          85,    // Mug
        ];

        for (const productId of bestsellerIds) {
          try {
            const response = await fetch(
              `https://api.v2.printful.com/products/${productId}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              const details = data.result;
              const productInfo = details.product || {};
              const firstVariant = details.variants?.[0];

              if (productInfo && firstVariant) {
                allProducts.push({
                  id: `printful_${productInfo.id}`,
                  title: productInfo.title,
                  supplier: 'Printful Bestseller',
                  image: productInfo.image,
                  price: parseFloat(firstVariant.price).toFixed(2),
                  currency: productInfo.currency,
                  description: productInfo.description?.substring(0, 150),
                  availability_status: 'in_stock',
                  brand: productInfo.brand,
                  badge: '🏆 Bestseller',
                  source: 'printful_bestseller'
                });
              }
            }
          } catch (err) {
            console.warn('[Trending API] ⚠️ Printful product error:', err.message);
          }
        }

        console.log('[Trending API] ✅ Printful: Added bestsellers');
      } catch (err) {
        console.error('[Trending API] ❌ Printful error:', err.message);
      }
    }

    // Sort by source
    const sorted = allProducts.sort((a, b) => {
      const sourceOrder = { 'shopify_store': 1, 'printful_bestseller': 2 };
      return (sourceOrder[a.source] || 99) - (sourceOrder[b.source] || 99);
    });

    console.log('[Trending API] 📦 Total products loaded:', sorted.length);

    return NextResponse.json({
      success: true,
      products: sorted,
      connectedApis: connectedApis,
      message: `Loaded ${sorted.length} products from ${connectedApis.join(', ')}`,
    });

  } catch (error) {
    console.error('[Trending API] 💥 Error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        products: [],
      },
      { status: 500 }
    );
  }
}
