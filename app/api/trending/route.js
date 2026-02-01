export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('\n====== [API] 🚀 TRENDING - START ======\n');
    
    const userId = request.headers.get('x-user-id');
    const integrationsParam = request.headers.get('x-integrations');

    if (!userId || !integrationsParam) {
      return NextResponse.json({ success: false, error: 'Missing auth', products: [] }, { status: 401 });
    }

    let integrations = JSON.parse(integrationsParam);
    const allProducts = [];
    const stats = { shopify: 0, printful_custom: 0, printful_bestseller: 0 };

    // PARALLEL FETCH
    const tasks = [];

    // SHOPIFY
    if (integrations.shopify?.status === 'connected') {
      tasks.push((async () => {
        try {
          const { storeUrl, accessToken } = integrations.shopify.credentials;
          const url = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const response = await fetch(
            `https://${url}/admin/api/2025-01/products.json?limit=50&status=active`,
            { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
          );
          
          if (!response.ok) return { products: [], type: 'shopify' };
          
          const { products } = await response.json();
          return {
            products: (products || []).map(p => ({
              id: `shopify_${p.id}`,
              title: p.title,
              supplier: '🛍️ Shopify Store',
              image: p.images?.[0]?.src,
              price: p.variants?.[0]?.price || '0',
              description: p.body_html?.replace(/<[^>]*>/g, '').substring(0, 150),
              variants: p.variants?.length || 0,
              source: 'shopify',
              rating: 4.5,
              reviews: Math.floor(Math.random() * 500),
              badge: '⭐ Store Product',
            })),
            type: 'shopify'
          };
        } catch (e) {
          console.warn('[API] Shopify error:', e.message);
          return { products: [], type: 'shopify' };
        }
      })());
    }

    // PRINTFUL
    if (integrations.printful?.status === 'connected') {
      tasks.push((async () => {
        try {
          const { apiToken, storeId } = integrations.printful.credentials;
          const products = [];

          let sId = storeId;
          if (!sId) {
            try {
              const r = await fetch('https://api.printful.com/stores', {
                headers: { 'Authorization': `Bearer ${apiToken}` }
              });
              if (r.ok) sId = (await r.json()).result?.[0]?.id;
            } catch (e) { }
          }

          const headers = { 'Authorization': `Bearer ${apiToken}` };
          if (sId) headers['X-PF-Store-Id'] = sId;

          // Custom products
          try {
            const r = await fetch('https://api.printful.com/store/products?limit=50', { headers });
            if (r.ok) {
              const items = (await r.json()).result || [];
              for (const item of items.slice(0, 10)) {
                try {
                  const dr = await fetch(`https://api.printful.com/store/products/${item.id}`, { headers });
                  if (dr.ok) {
                    const d = await dr.json();
                    const sp = d.result?.sync_product;
                    const sv = d.result?.sync_variants?.[0];
                    if (sp && sv) {
                      products.push({
                        id: `printful_custom_${sp.id}`,
                        title: sp.name,
                        supplier: '📦 Printful (Custom)',
                        image: sp.thumbnail_url,
                        price: sv.retail_price || '0',
                        description: sp.description?.substring(0, 150),
                        source: 'printful_custom',
                        rating: 4.8,
                        reviews: Math.floor(Math.random() * 200),
                        badge: '📦 Your Product',
                      });
                    }
                  }
                } catch (e) { }
              }
            }
          } catch (e) { }

          // Bestsellers
          for (const id of [71, 172, 23, 49, 85]) {
            try {
              const r = await fetch(`https://api.printful.com/products/${id}`, {
                headers: { 'Authorization': `Bearer ${apiToken}` }
              });
              if (r.ok) {
                const d = await r.json();
                const p = d.result?.product;
                const v = d.result?.variants?.[0];
                if (p && v) {
                  products.push({
                    id: `printful_bestseller_${p.id}`,
                    title: p.title,
                    supplier: '🏆 Printful Bestseller',
                    image: p.image,
                    price: v.price || '0',
                    description: p.description?.substring(0, 150),
                    source: 'printful_bestseller',
                    rating: 4.7,
                    reviews: Math.floor(Math.random() * 1000),
                    badge: '🏆 Bestseller',
                  });
                }
              }
            } catch (e) { }
          }

          return { products, type: 'printful' };
        } catch (e) {
          console.warn('[API] Printful error:', e.message);
          return { products: [], type: 'printful' };
        }
      })());
    }

    // WAIT FOR ALL
    const results = await Promise.all(tasks);
    results.forEach(r => {
      allProducts.push(...r.products);
      if (r.type === 'shopify') stats.shopify = r.products.length;
      else {
        stats.printful_custom = r.products.filter(p => p.source === 'printful_custom').length;
        stats.printful_bestseller = r.products.filter(p => p.source === 'printful_bestseller').length;
      }
    });

    // DEDUPE
    const unique = [];
    const seen = new Set();
    allProducts.forEach(p => {
      const key = `${p.title.toLowerCase()}|${p.price}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    });

    console.log('[API] ✅ Total:', unique.length, 'Products | Stats:', stats);

    return NextResponse.json({
      success: true,
      products: unique,
      stats,
      message: `Loaded ${unique.length} trending products`,
    });

  } catch (err) {
    console.error('[API] ERROR:', err.message);
    return NextResponse.json({
      success: false,
      error: err.message,
      products: []
    }, { status: 500 });
  }
}
