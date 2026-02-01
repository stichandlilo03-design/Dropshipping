export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('\n========== [API] 🚀 STARTING TRENDING REQUEST ==========\n');
    
    const userId = request.headers.get('x-user-id');
    const integrationsParam = request.headers.get('x-integrations');
    
    console.log('[API] User ID:', userId);
    console.log('[API] Integrations param length:', integrationsParam?.length);

    if (!userId) {
      console.log('[API] ❌ NO USER ID!');
      return NextResponse.json({ success: false, error: 'No user ID', products: [] }, { status: 401 });
    }

    if (!integrationsParam) {
      console.log('[API] ❌ NO INTEGRATIONS PARAM!');
      return NextResponse.json({ success: false, error: 'No integrations', products: [] }, { status: 400 });
    }

    let integrations = {};
    try {
      integrations = JSON.parse(integrationsParam);
      console.log('[API] ✅ Parsed integrations:', Object.keys(integrations));
    } catch (e) {
      console.log('[API] ❌ PARSE ERROR:', e.message);
      return NextResponse.json({ success: false, error: 'Parse error', products: [] }, { status: 400 });
    }

    let allProducts = [];

    // ============================================================================
    // SHOPIFY
    // ============================================================================
    console.log('\n[API] ========== SHOPIFY ==========');
    
    if (integrations.shopify?.status === 'connected') {
      console.log('[API] ✅ Shopify connected');
      
      const storeUrl = integrations.shopify?.credentials?.storeUrl;
      const token = integrations.shopify?.credentials?.accessToken;

      console.log('[API] Store URL:', storeUrl);
      console.log('[API] Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');

      if (!storeUrl || !token) {
        console.log('[API] ❌ MISSING CREDENTIALS');
      } else {
        try {
          const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const apiUrl = `https://${cleanUrl}/admin/api/2025-01/products.json?limit=20&status=active`;
          
          console.log('[API] 📡 Fetching from:', apiUrl);

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json',
            },
          });

          console.log('[API] Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            const products = data.products || [];
            console.log('[API] ✅ Shopify returned:', products.length, 'products');

            const mappedProducts = products.map(p => ({
              id: `shopify_${p.id}`,
              title: p.title,
              supplier: 'Shopify',
              image: p.images?.[0]?.src,
              price: p.variants?.[0]?.price,
              description: p.description?.substring(0, 150),
              source: 'shopify'
            }));

            allProducts = allProducts.concat(mappedProducts);
            console.log('[API] ✅ Added', mappedProducts.length, 'Shopify products');
          } else {
            const errorText = await response.text();
            console.log('[API] ❌ Shopify error:', response.status);
            console.log('[API] Error:', errorText.substring(0, 300));
          }
        } catch (err) {
          console.error('[API] ❌ Shopify exception:', err.message);
        }
      }
    } else {
      console.log('[API] ⚠️ Shopify NOT connected');
    }

    // ============================================================================
    // PRINTFUL - NOW WITH STORE ID HEADER
    // ============================================================================
    console.log('\n[API] ========== PRINTFUL ==========');
    
    if (integrations.printful?.status === 'connected') {
      console.log('[API] ✅ Printful connected');
      
      const token = integrations.printful?.credentials?.apiToken;
      const storeId = integrations.printful?.credentials?.storeId;
      
      console.log('[API] Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
      console.log('[API] Store ID:', storeId);

      if (token) {
        // STEP 1: Get store info if no store ID is available
        let finalStoreId = storeId;
        
        if (!finalStoreId) {
          console.log('[API] 📍 No store ID found, fetching store info...');
          try {
            const storeInfoResponse = await fetch(
              'https://api.printful.com/stores',
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (storeInfoResponse.ok) {
              const storeData = await storeInfoResponse.json();
              const stores = storeData.result || [];
              
              if (stores.length > 0) {
                finalStoreId = stores[0].id;
                console.log('[API] ✅ Found store ID:', finalStoreId);
              } else {
                console.log('[API] ⚠️ No stores found in account');
              }
            }
          } catch (err) {
            console.warn('[API] ⚠️ Could not fetch store info:', err.message);
          }
        }

        // STEP 2: Try to fetch YOUR custom products
        console.log('[API] 📋 Fetching YOUR custom products...');
        
        try {
          const customHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          };
          
          // Add store ID header if available
          if (finalStoreId) {
            customHeaders['X-PF-Store-Id'] = finalStoreId;
            console.log('[API] Using Store ID header:', finalStoreId);
          }

          const customResponse = await fetch(
            'https://api.printful.com/store/products?limit=50',
            {
              method: 'GET',
              headers: customHeaders,
            }
          );

          console.log('[API] Custom products response:', customResponse.status);

          if (customResponse.ok) {
            const customData = await customResponse.json();
            const customProducts = customData.result || [];
            
            console.log('[API] ✅ Found', customProducts.length, 'custom products');

            // Get details for each custom product
            for (const cp of customProducts.slice(0, 10)) {
              try {
                const detailHeaders = {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                };
                
                if (finalStoreId) {
                  detailHeaders['X-PF-Store-Id'] = finalStoreId;
                }

                const detailResponse = await fetch(
                  `https://api.printful.com/store/products/${cp.id}`,
                  {
                    method: 'GET',
                    headers: detailHeaders,
                  }
                );

                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  const syncProduct = detailData.result?.sync_product;
                  const syncVariants = detailData.result?.sync_variants || [];
                  const firstVariant = syncVariants[0];
                  
                  if (syncProduct && firstVariant) {
                    console.log('[API] ✅ Adding custom product:', syncProduct.name);
                    allProducts.push({
                      id: `printful_custom_${syncProduct.id}`,
                      title: syncProduct.name,
                      supplier: 'Printful (Your Product)',
                      image: syncProduct.thumbnail_url,
                      price: firstVariant.retail_price,
                      description: syncProduct.description?.substring(0, 150),
                      source: 'printful_custom'
                    });
                  }
                }
              } catch (err) {
                console.warn('[API] ⚠️ Custom product detail error:', err.message);
              }
            }
          } else {
            const errorText = await customResponse.text();
            console.log('[API] ⚠️ Custom products fetch failed:', customResponse.status);
            console.log('[API] Error:', errorText.substring(0, 200));
          }
        } catch (err) {
          console.warn('[API] ⚠️ Custom products error:', err.message);
        }

        // STEP 3: Add Printful bestsellers (public catalog - no store ID needed)
        console.log('[API] 🏆 Fetching bestsellers...');
        
        const bestsellers = [71, 172, 23, 49, 85];
        let addedBestsellers = 0;

        for (const id of bestsellers) {
          try {
            const response = await fetch(
              `https://api.printful.com/products/${id}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            console.log(`[API] Bestseller ${id}: status ${response.status}`);

            if (response.ok) {
              const data = await response.json();
              const productInfo = data.result?.product;
              const firstVariant = data.result?.variants?.[0];
              
              if (productInfo && firstVariant) {
                console.log('[API] ✅ Added bestseller:', productInfo.title);
                allProducts.push({
                  id: `printful_bestseller_${productInfo.id}`,
                  title: productInfo.title,
                  supplier: 'Printful Bestseller',
                  image: productInfo.image,
                  price: parseFloat(firstVariant.price).toFixed(2),
                  description: productInfo.description?.substring(0, 150),
                  source: 'printful_bestseller'
                });
                addedBestsellers++;
              }
            }
          } catch (err) {
            console.warn('[API] ⚠️ Bestseller', id, 'error:', err.message);
          }
        }

        console.log('[API] Added', addedBestsellers, 'bestsellers');
      } else {
        console.log('[API] ❌ No Printful token!');
      }
    } else {
      console.log('[API] ⚠️ Printful NOT connected');
    }

    console.log('\n[API] ========== FINAL RESULT ==========');
    console.log('[API] Total products:', allProducts.length);
    console.log('[API] Breakdown:');
    console.log('  - Shopify:', allProducts.filter(p => p.source === 'shopify').length);
    console.log('  - Printful Custom:', allProducts.filter(p => p.source === 'printful_custom').length);
    console.log('  - Printful Bestsellers:', allProducts.filter(p => p.source === 'printful_bestseller').length);
    console.log('[API] 🎉 Sending response...\n');

    return NextResponse.json({
      success: true,
      products: allProducts,
      message: `Loaded ${allProducts.length} products`,
    });

  } catch (error) {
    console.error('[API] 💥 FATAL ERROR:', error.message);
    console.error('[API] Stack:', error.stack);

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
