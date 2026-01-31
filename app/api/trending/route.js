export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let db = null;

function getDb() {
  if (db) return db;
  
  try {
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('[Trending API] ✅ Firestore initialized');
    return db;
  } catch (error) {
    console.error('[Trending API] ❌ Firestore init error:', error.message);
    return null;
  }
}

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

    const db = getDb();
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database error',
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
      }, { status: 500 });
    }

    // Get integrations
    const integrationsRef = collection(db, 'users', userId, 'integrations');
    const snapshot = await getDocs(integrationsRef);
    
    console.log('[Trending API] 📊 Found', snapshot.size, 'integrations');

    const connectedApis = [];
    const integrations = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('[Trending API] 📄', doc.id, 'Status:', data.status);
      
      if (data.status === 'connected') {
        connectedApis.push(doc.id);
        integrations[doc.id] = data;
      }
    });

    console.log('[Trending API] ✅ Connected:', connectedApis);

    const requiredApis = ['printful', 'shopify', 'tiktok'].filter(
      api => !connectedApis.includes(api)
    );

    let allProducts = [];

    // Fetch Printful
    if (connectedApis.includes('printful') && integrations.printful?.credentials?.apiToken) {
      console.log('[Trending API] 🔄 Printful...');
      try {
        const token = integrations.printful.credentials.apiToken;
        const response = await fetch('https://api.v2.printful.com/products', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const products = (data.result || []).slice(0, 10).map(p => ({
            id: `printful_${p.id}`,
            title: p.title,
            supplier: 'Printful',
            image: p.image,
            type: p.type_name,
          }));
          allProducts = allProducts.concat(products);
          console.log('[Trending API] ✅ Printful:', products.length);
        }
      } catch (err) {
        console.error('[Trending API] ❌ Printful error:', err.message);
      }
    }

    // Fetch Shopify
    if (connectedApis.includes('shopify') && integrations.shopify?.credentials?.storeUrl && integrations.shopify?.credentials?.accessToken) {
      console.log('[Trending API] 🔄 Shopify...');
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
                      featuredImage { url }
                      priceRange { minVariantPrice { amount } }
                    }
                  }
                }
              }`
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (!data.errors) {
            const products = (data.data?.products?.edges || []).map(edge => {
              const p = edge.node;
              return {
                id: `shopify_${p.id}`,
                title: p.title,
                supplier: 'Shopify',
                image: p.featuredImage?.url,
                price: p.priceRange?.minVariantPrice?.amount,
              };
            });
            allProducts = allProducts.concat(products);
            console.log('[Trending API] ✅ Shopify:', products.length);
          }
        }
      } catch (err) {
        console.error('[Trending API] ❌ Shopify error:', err.message);
      }
    }

    console.log('[Trending API] 📦 Total:', allProducts.length, 'Connected:', connectedApis);

    return NextResponse.json({
      success: true,
      products: allProducts,
      connectedApis: connectedApis,
      requiredApis: requiredApis,
      message: connectedApis.length > 0
        ? `${allProducts.length} products from ${connectedApis.join(', ')}`
        : 'Connect APIs to see products',
    });

  } catch (error) {
    console.error('[Trending API] 💥 Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      products: [],
      connectedApis: [],
      requiredApis: ['printful', 'shopify', 'tiktok'],
    }, { status: 500 });
  }
}
