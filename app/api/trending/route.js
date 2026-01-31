export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('\n========== [API] Starting trending request ==========');
    
    const userId = request.headers.get('x-user-id');
    const integrationsParam = request.headers.get('x-integrations');
    
    console.log('[API] User ID:', userId);
    console.log('[API] Has integrations:', !!integrationsParam);

    if (!userId) {
      console.log('[API] ❌ No user ID provided');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        products: [],
        debug: 'No user ID'
      }, { status: 401 });
    }

    if (!integrationsParam) {
      console.log('[API] ❌ No integrations provided');
      return NextResponse.json({
        success: false,
        error: 'No integrations data',
        products: [],
        debug: 'No integrations header'
      }, { status: 400 });
    }

    let integrations = {};
    try {
      integrations = JSON.parse(integrationsParam);
      console.log('[API] ✅ Parsed integrations keys:', Object.keys(integrations));
    } catch (e) {
      console.log('[API] ❌ Failed to parse integrations:', e.message);
      return NextResponse.json({
        success: false,
        error: 'Invalid integrations data',
        products: [],
        debug: 'Parse error: ' + e.message
      }, { status: 400 });
    }

    let allProducts = [];

    // ============================================================================
    // SHOPIFY - SIMPLE REST API ONLY
    // ============================================================================
    console.log('[API] ========== SHOPIFY ==========');
    
    if (integrations.shopify?.status === 'connected') {
      console.log('[API] ✅ Shopify is connected');
      
      const storeUrl = integrations.shopify?.credentials?.storeUrl;
      const token = integrations.shopify?.credentials?.accessToken;

      console.log('[API] Store URL:', storeUrl);
      console.log('[API] Token exists:', !!token);
      console.log('[API] Token length:', token?.length);

      if (!storeUrl || !token) {
        console.log('[API] ❌ Missing Shopify credentials');
        return NextResponse.json({
          success: false,
          error: 'Missing Shopify credentials',
          products: [],
          debug: `storeUrl: ${storeUrl}, token: ${!!token}`
        });
      }

      try {
        // Clean up store URL
        const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        console.log('[API] Clean URL:', cleanUrl);

        const apiUrl = `https://${cleanUrl}/admin/api/2025-01/products.json?limit=20&status=active`;
        console.log('[API] API URL:', apiUrl);

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
          
          console.log('[API] Total products from Shopify:', products.length);

          const mappedProducts = products.map(p => {
            const firstVariant = p.variants?.[0];
            const firstImage = p.images?.[0];

            return {
              id: `shopify_${p.id}`,
              title: p.title,
              supplier: 'Shopify',
              image: firstImage?.src,
              handle: p.handle,
              price: firstVariant?.price,
              currency: 'USD',
              description: p.description?.substring(0, 150) || null,
              availability_status: 'in_stock',
              product_type: p.product_type,
              brand: p.vendor,
              variants: p.variants?.length || 0,
              store_url: `https://${cleanUrl}/products/${p.handle}`,
              source: 'shopify'
            };
          });

          allProducts = allProducts.concat(mappedProducts);
          console.log('[API] ✅ Added', mappedProducts.length, 'Shopify products');
        } else {
          const errorText = await response.text();
          console.log('[API] ❌ Shopify error status:', response.status);
          console.log('[API] ❌ Error body:', errorText.substring(0, 200));
        }
      } catch (err) {
        console.error('[API] ❌ Shopify exception:', err.message);
      }
    } else {
      console.log('[API] ⚠️ Shopify not connected');
    }

    // ============================================================================
    // PRINTFUL - ADD BESTSELLERS
    // ============================================================================
    console.log('[API] ========== PRINTFUL ==========');
    
    if (integrations.printful?.status === 'connected') {
      console.log('[API] ✅ Printful is connected');
      
      const token = integrations.printful?.credentials?.apiToken;
      console.log('[API] Printful token exists:', !!token);
      console.log('[API] Token length:', token?.length);

      if (token) {
        // Just add 3 bestsellers to always have products
        const bestsellers = [
          { id: 71, name: 'Bella + Canvas T-Shirt', type: 'T-Shirt' },
          { id: 172, name: 'Framed Poster', type: 'Poster' },
          { id: 23, name: 'Hoodie', type: 'Hoodie' },
        ];

        for (const item of bestsellers) {
          try {
            const response = await fetch(
              `https://api.v2.printful.com/products/${item.id}`,
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
              const productInfo = details.product;
              const firstVariant = details.variants?.[0];

              if (productInfo && firstVariant) {
                allProducts.push({
                  id: `printful_${productInfo.id}`,
                  title: productInfo.title,
                  supplier: 'Printful',
                  image: productInfo.image,
                  price: parseFloat(firstVariant.price).toFixed(2),
                  currency: productInfo.currency,
                  description: productInfo.description?.substring(0, 150),
                  availability_status: 'in_stock',
                  badge: '🏆 Bestseller',
                  source: 'printful'
                });

                console.log('[API] ✅ Added Printful:', productInfo.title);
              }
            }
          } catch (err) {
            console.warn('[API] ⚠️ Printful error for', item.id, ':', err.message);
          }
        }
      }
    } else {
      console.log('[API] ⚠️ Printful not connected');
    }

    console.log('[API] ========== FINAL RESULT ==========');
    console.log('[API] Total products:', allProducts.length);
    console.log('[API] Breakdown:', {
      shopify: allProducts.filter(p => p.source === 'shopify').length,
      printful: allProducts.filter(p => p.source === 'printful').length
    });

    return NextResponse.json({
      success: true,
      products: allProducts,
      message: `Loaded ${allProducts.length} products`,
      debug: {
        shopifyConnected: !!integrations.shopify?.status,
        printfulConnected: !!integrations.printful?.status,
        totalLoaded: allProducts.length,
      }
    });

  } catch (error) {
    console.error('[API] 💥 FATAL ERROR:', error.message);
    console.error('[API] Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        products: [],
        debug: {
          error: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      },
      { status: 500 }
    );
  }
}
