export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

let adminDb = null;

async function initializeFirebaseAdmin() {
  if (adminDb) return adminDb;

  try {
    const adminSdkKey = process.env.FIREBASE_ADMIN_SDK_KEY;
    
    console.log('[Trending API] 🔍 Checking FIREBASE_ADMIN_SDK_KEY...');
    
    if (!adminSdkKey) {
      console.error('[Trending API] ❌ FIREBASE_ADMIN_SDK_KEY not found in env');
      return null;
    }

    console.log('[Trending API] ✅ Found FIREBASE_ADMIN_SDK_KEY');

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(adminSdkKey);
      console.log('[Trending API] ✅ Parsed JSON successfully');
      console.log('[Trending API] Project:', serviceAccount.project_id);
    } catch (parseError) {
      console.error('[Trending API] ❌ JSON parse error:', parseError.message);
      return null;
    }

    // Dynamically import firebase-admin
    const admin = await import('firebase-admin');
    
    // Check if already initialized
    if (admin.apps && admin.apps.length > 0) {
      console.log('[Trending API] ✅ Firebase already initialized');
      adminDb = admin.firestore();
      return adminDb;
    }

    // Initialize
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    adminDb = admin.firestore();
    console.log('[Trending API] ✅ Firebase Admin initialized successfully');
    return adminDb;

  } catch (error) {
    console.error('[Trending API] ❌ Init error:', error.message);
    return null;
  }
}

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.log('[Trending API] ❌ No user ID in header');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated', 
          products: [], 
          requiredApis: ['printful', 'shopify', 'tiktok'],
          connectedApis: [],
          message: 'User not authenticated'
        },
        { status: 401 }
      );
    }

    console.log('[Trending API] 📥 Request for user:', userId);

    // Initialize Firebase
    const db = await initializeFirebaseAdmin();
    
    if (!db) {
      console.error('[Trending API] ⚠️ Could not initialize Firebase Admin');
      return NextResponse.json({
        success: true,
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
        message: 'Firebase Admin SDK not initialized',
      });
    }

    console.log('[Trending API] 🔍 Querying Firestore for user:', userId);

    // Query integrations
    const integrationsRef = db.collection('users').doc(userId).collection('integrations');
    const snapshot = await integrationsRef.get();
    
    console.log('[Trending API] 📊 Found', snapshot.size, 'integration documents');

    const connectedApis = [];
    const integrations = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('[Trending API] 📄', doc.id, '- Status:', data.status);
      
      if (data.status === 'connected') {
        connectedApis.push(doc.id);
        integrations[doc.id] = data;
      }
    });

    console.log('[Trending API] ✅ Connected APIs:', connectedApis);

    const requiredApis = ['printful', 'shopify', 'tiktok'].filter(
      api => !connectedApis.includes(api)
    );

    let allProducts = [];

    // Fetch Printful
    if (connectedApis.includes('printful')) {
      console.log('[Trending API] 🔄 Fetching Printful...');
      try {
        const token = integrations.printful?.credentials?.apiToken;
        if (token) {
          const products = await fetchPrintfulTrending(token);
          allProducts = allProducts.concat(products);
          console.log('[Trending API] ✅ Printful: +', products.length, 'products');
        }
      } catch (err) {
        console.error('[Trending API] ❌ Printful error:', err.message);
      }
    }

    // Fetch Shopify
    if (connectedApis.includes('shopify')) {
      console.log('[Trending API] 🔄 Fetching Shopify...');
      try {
        const store = integrations.shopify?.credentials?.storeUrl;
        const token = integrations.shopify?.credentials?.accessToken;
        if (store && token) {
          const products = await fetchShopifyTrending(store, token);
          allProducts = allProducts.concat(products);
          console.log('[Trending API] ✅ Shopify: +', products.length, 'products');
        }
      } catch (err) {
        console.error('[Trending API] ❌ Shopify error:', err.message);
      }
    }

    console.log('[Trending API] 🎯 Final response:');
    console.log('  Connected:', connectedApis);
    console.log('  Required:', requiredApis);
    console.log('  Products:', allProducts.length);

    return NextResponse.json({
      success: true,
      products: allProducts,
      connectedApis: connectedApis,
      requiredApis: requiredApis,
      message: connectedApis.length > 0 
        ? `Showing ${allProducts.length} products from ${connectedApis.join(', ')}`
        : 'Connect Printful, Shopify, or TikTok to see trending products',
    });

  } catch (error) {
    console.error('[Trending API] 💥 Fatal error:', error.message);
    console.error('[Trending API] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        products: [], 
        requiredApis: ['printful', 'shopify', 'tiktok'],
        connectedApis: [],
        message: 'Server error: ' + error.message
      },
      { status: 500 }
    );
  }
}

async function fetchPrintfulTrending(token) {
  try {
    const response = await fetch('https://api.v2.printful.com/products', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const data = await response.json();
    return (data.result || []).slice(0, 10).map(p => ({
      id: `printful_${p.id}`,
      title: p.title,
      supplier: 'Printful',
      image: p.image,
      type: p.type_name,
    }));
  } catch (err) {
    console.error('[Printful] Error:', err.message);
    return [];
  }
}

async function fetchShopifyTrending(storeUrl, token) {
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
                  priceRange {
                    minVariantPrice { amount currencyCode }
                  }
                }
              }
            }
          }`
        }),
      }
    );

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);

    return (data.data?.products?.edges || []).map(edge => {
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
  } catch (err) {
    console.error('[Shopify] Error:', err.message);
    return [];
  }
}
