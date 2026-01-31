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
        requiredApis: ['printful', 'shopify', 'tiktok'],
      }, { status: 401 });
    }

    if (!integrationsParam) {
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

    const connectedApis = Object.keys(integrations).filter(
      key => integrations[key]?.status === 'connected'
    );

    console.log('[Trending API] ✅ Connected APIs:', connectedApis);

    const requiredApis = ['printful', 'shopify', 'tiktok'].filter(
      api => !connectedApis.includes(api)
    );

    let allProducts = [];

    // ============================================================================
    // FETCH FROM PRINTFUL
    // ============================================================================
    if (connectedApis.includes('printful') && integrations.printful?.credentials?.apiToken) {
      console.log('[Trending API] 🔄 Fetching Printful products...');
      try {
        const token = integrations.printful.credentials.apiToken;
        const response = await fetch('https://api.v2.printful.com/products', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const basicProducts = (data.result || []).slice(0, 10);
          
          console.log('[Trending API] 📋 Got', basicProducts.length, 'basic products, fetching details...');

          // TIER 1: Get full details for each product
          const enhancedProducts = [];

          for (const basicProduct of basicProducts) {
            try {
              console.log('[Trending API] 📥 Fetching details for product', basicProduct.id);
              
              // Call GET /products/{id} to get FULL details
              const detailResponse = await fetch(
                `https://api.v2.printful.com/products/${basicProduct.id}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                const details = detailData.result;
                const productInfo = details.product || {};
                const variants = details.variants || [];
                const firstVariant = variants[0];

                // Build enhanced product
                const enhanced = {
                  id: `printful_${productInfo.id || basicProduct.id}`,
                  title: productInfo.title || basicProduct.title,
                  supplier: 'Printful',
                  image: basicProduct.image || productInfo.image,
                  type: productInfo.type_name,
                  
                  // TIER 1: Essential details
                  description: productInfo.description ? productInfo.description.substring(0, 150) : null,
                  price: firstVariant?.price ? parseFloat(firstVariant.price).toFixed(2) : null,
                  currency: productInfo.currency,
                  availability_status: firstVariant?.availability_status?.[0]?.status || 'unknown',
                  fulfillment_time: productInfo.avg_fulfillment_time,
                  brand: productInfo.brand,
                  
                  // TIER 1: Options available
                  colors: [...new Set(variants.map(v => v.color).filter(Boolean))].slice(0, 5),
                  sizes: [...new Set(variants.map(v => v.size).filter(Boolean))].slice(0, 5),
                  variant_count: variants.length,
                };

                console.log('[Trending API] ✅ Enhanced product:', enhanced.title);
                enhancedProducts.push(enhanced);
              } else {
                console.warn('[Trending API] ⚠️ Failed to get details for product', basicProduct.id);
                // Fallback to basic info
                enhancedProducts.push({
                  id: `printful_${basicProduct.id}`,
                  title: basicProduct.title,
                  supplier: 'Printful',
                  image: basicProduct.image,
                  type: basicProduct.type_name,
                });
              }
            } catch (err) {
              console.error('[Trending API] ❌ Error fetching product details:', err.message);
              // Still include basic product
              enhancedProducts.push({
                id: `printful_${basicProduct.id}`,
                title: basicProduct.title,
                supplier: 'Printful',
                image: basicProduct.image,
                type: basicProduct.type_name,
              });
            }
          }

          allProducts = allProducts.concat(enhancedProducts);
          console.log('[Trending API] ✅ Printful:', enhancedProducts.length, 'products with details');
        } else {
          console.error('[Trending API] ❌ Printful returned:', response.status);
        }
      } catch (err) {
        console.error('[Trending API] ❌ Printful error:', err.message);
      }
    }

    // ============================================================================
    // FETCH FROM SHOPIFY (Enhanced query)
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
            console.error('[Trending API] ❌ Shopify GraphQL error:', data.errors[0]?.message);
          } else {
            const products = (data.data?.products?.edges || []).map(edge => {
              const p = edge.node;
              const variantTitles = p.variants?.edges?.map(v => v.node.title) || [];
              
              return {
                id: `shopify_${p.id}`,
                title: p.title,
                supplier: 'Shopify',
                image: p.featuredImage?.url,
                price: p.priceRange?.minVariantPrice?.amount,
                currency: 'USD',
                
                // TIER 1: Essential details
                description: p.description ? p.description.substring(0, 150) : null,
                availability_status: p.availableForSale ? 'in_stock' : 'out_of_stock',
                product_type: p.productType,
                brand: p.vendor,
                stock_count: p.totalInventory,
                variants: variantTitles.slice(0, 5),
                variant_count: variantTitles.length,
                store_url: p.onlineStoreUrl,
              };
            });

            allProducts = allProducts.concat(products);
            console.log('[Trending API] ✅ Shopify:', products.length, 'products with details');
          }
        } else {
          console.error('[Trending API] ❌ Shopify returned:', response.status);
        }
      } catch (err) {
        console.error('[Trending API] ❌ Shopify error:', err.message);
      }
    }

    console.log('[Trending API] 📦 Total products:', allProducts.length);

    return NextResponse.json({
      success: true,
      products: allProducts,
      connectedApis: connectedApis,
      requiredApis: requiredApis,
      message:
        connectedApis.length > 0
          ? `${allProducts.length} detailed products from ${connectedApis.join(', ')}`
          : 'Connect APIs to see products',
    });
  } catch (error) {
    console.error('[Trending API] 💥 Error:', error.message);

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
