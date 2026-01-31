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
    // FETCH FROM SHOPIFY FIRST (USER'S OWN PRODUCTS)
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
            console.error('[Trending API] ❌ Shopify GraphQL error:', data.errors[0]?.message);
          } else {
            const products = (data.data?.products?.edges || [])
              .filter(edge => edge.node) // Filter out null nodes
              .map(edge => {
                const p = edge.node;
                const variantTitles = p.variants?.edges?.map(v => v.node.title) || [];
                
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
                  variants: variantTitles.slice(0, 5),
                  variant_count: variantTitles.length,
                  store_url: p.onlineStoreUrl,
                  source: 'shopify_store'
                };
              });

            allProducts = allProducts.concat(products);
            console.log('[Trending API] ✅ Shopify Store:', products.length, 'products found');
          }
        } else {
          console.error('[Trending API] ❌ Shopify returned:', response.status);
        }
      } catch (err) {
        console.error('[Trending API] ❌ Shopify error:', err.message);
      }
    }

    // ============================================================================
    // FETCH FROM PRINTFUL - BESTSELLERS + CATALOG
    // ============================================================================
    if (connectedApis.includes('printful') && integrations.printful?.credentials?.apiToken) {
      console.log('[Trending API] 🔄 Fetching Printful products (Catalog + Bestsellers)...');
      try {
        const token = integrations.printful.credentials.apiToken;

        // OPTION 1: Get user's custom products (if any)
        console.log('[Trending API] 📋 Checking for custom Printful products...');
        try {
          const customResponse = await fetch('https://api.v2.printful.com/store/products', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (customResponse.ok) {
            const customData = await customResponse.json();
            const customProducts = (customData.result || []).slice(0, 5);
            
            if (customProducts.length > 0) {
              console.log('[Trending API] ✅ Found', customProducts.length, 'custom Printful products');
              
              // Get details for each custom product
              for (const customProduct of customProducts) {
                try {
                  const detailResponse = await fetch(
                    `https://api.v2.printful.com/store/products/${customProduct.id}`,
                    {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  if (detailResponse.ok) {
                    const detailData = detailResponse.json();
                    const syncProduct = detailData.sync_product;
                    const syncVariants = detailData.sync_variants || [];
                    const firstVariant = syncVariants[0];

                    if (syncProduct && firstVariant) {
                      const enhanced = {
                        id: `printful_custom_${syncProduct.id}`,
                        title: syncProduct.name,
                        supplier: 'Printful (Your Products)',
                        image: syncProduct.thumbnail_url,
                        price: firstVariant.retail_price,
                        currency: 'USD',
                        description: 'Custom product synced to Printful',
                        availability_status: 'in_stock',
                        variant_count: syncVariants.length,
                        source: 'printful_custom'
                      };
                      allProducts.push(enhanced);
                    }
                  }
                } catch (err) {
                  console.warn('[Trending API] ⚠️ Error fetching custom product details:', err.message);
                }
              }
            }
          }
        } catch (err) {
          console.warn('[Trending API] ⚠️ No custom products:', err.message);
        }

        // OPTION 2: Get BESTSELLERS from Printful Catalog
        console.log('[Trending API] 🏆 Fetching Printful Bestsellers...');
        
        // Bestseller product IDs (from Printful's most popular items)
        const bestsellerIds = [
          71,    // Bella + Canvas 3001 Unisex T-Shirt
          172,   // Framed Poster
          23,    // Hoodie
          49,    // Dad Hat
          85,    // Mug
          173,   // Canvas Print
          4,     // Sweatshirt
          12,    // Leggings
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
              const variants = details.variants || [];
              const firstVariant = variants[0];

              if (productInfo && firstVariant) {
                const enhanced = {
                  id: `printful_bestseller_${productInfo.id}`,
                  title: productInfo.title,
                  supplier: 'Printful Bestseller',
                  image: productInfo.image,
                  type: productInfo.type_name,
                  description: productInfo.description ? productInfo.description.substring(0, 150) : null,
                  price: firstVariant?.price ? parseFloat(firstVariant.price).toFixed(2) : null,
                  currency: productInfo.currency,
                  availability_status: firstVariant?.availability_status?.[0]?.status || 'in_stock',
                  fulfillment_time: productInfo.avg_fulfillment_time,
                  brand: productInfo.brand,
                  colors: [...new Set(variants.map(v => v.color).filter(Boolean))].slice(0, 5),
                  sizes: [...new Set(variants.map(v => v.size).filter(Boolean))].slice(0, 5),
                  variant_count: variants.length,
                  badge: '🏆 Bestseller',
                  source: 'printful_bestseller'
                };

                allProducts.push(enhanced);
                console.log('[Trending API] ✅ Added bestseller:', enhanced.title);
              }
            }
          } catch (err) {
            console.warn('[Trending API] ⚠️ Error fetching bestseller', productId, ':', err.message);
          }
        }

        console.log('[Trending API] ✅ Printful: Added bestsellers and custom products');
      } catch (err) {
        console.error('[Trending API] ❌ Printful error:', err.message);
      }
    }

    // Sort by source: Shopify first, then custom, then bestsellers
    const sorted = allProducts.sort((a, b) => {
      const sourceOrder = {
        'shopify_store': 1,
        'printful_custom': 2,
        'printful_bestseller': 3
      };
      return (sourceOrder[a.source] || 99) - (sourceOrder[b.source] || 99);
    });

    console.log('[Trending API] 📦 Total products:', sorted.length);
    console.log('[Trending API] 📊 Breakdown:', {
      shopify: sorted.filter(p => p.source === 'shopify_store').length,
      custom: sorted.filter(p => p.source === 'printful_custom').length,
      bestsellers: sorted.filter(p => p.source === 'printful_bestseller').length
    });

    return NextResponse.json({
      success: true,
      products: sorted,
      connectedApis: connectedApis,
      requiredApis: requiredApis,
      message:
        sorted.length > 0
          ? `${sorted.length} products from ${connectedApis.join(', ')}`
          : 'Connect APIs to see products',
    });
  } catch (error) {
    console.error('[Trending API] 💥 Error:', error.message);
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
