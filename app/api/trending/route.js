export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let db = null;
let auth = null;

function initializeFirebase() {
  if (app && db && auth) return { app, db, auth };
  
  try {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('[Trending API] ✅ Firebase initialized');
    return { app, db, auth };
  } catch (error) {
    console.error('[Trending API] ❌ Firebase init error:', error.message);
    return { app: null, db: null, auth: null };
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

    const { db } = initializeFirebase();
    
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database error',
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
      }, { status: 500 });
    }

    // Query integrations - same way dashboard does it
    console.log('[Trending API] 🔍 Querying integrations for user:', userId);
    
    const integrationsRef = collection(db, 'users', userId, 'integrations');
    const snapshot = await getDocs(integrationsRef);
    
    console.log('[Trending API] 📊 Found', snapshot.size, 'integration documents');

    const connectedApis = [];
    const integrations = {};

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('[Trending API] 📄', doc.id, '- Status:', data?.status, '- Credentials:', !!data?.credentials);
      
      if (data?.status === 'connected' && data?.credentials) {
        connectedApis.push(doc.id);
        integrations[doc.id] = data;
      }
    });

    console.log('[Trending API] ✅ Connected APIs:', connectedApis);

    const requiredApis = ['printful', 'shopify', 'tiktok'].filter(
      api => !connectedApis.includes(api)
    );

    let allProducts = [];

    // Fetch from Printful
    if (connectedApis.includes('printful')) {
      console.log('[Trending API] 🔄 Fetching Printful...');
      try {
        const creds = integrations.printful?.credentials;
        const token = creds?.apiToken;
        
        console.log('[Trending API] Printful token exists:', !!token);
        
        if (token) {
          const response = await fetch('https://api.v2.printful.com/products', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('[Trending API] Printful response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            const products = (data.result || []).slice(0, 10).map(p => ({
              id: `printful_${p.id}`,
              title: p.title,
              supplier: 'Printful',
              image: p.image,
              type: p.type_name,
              url: `https://www.printful.com/products/${p.id}`,
            }));
            allProducts = allProducts.concat(products);
            console.log('[Trending API] ✅ Printful: +', products.length, 'products');
          } else {
            console.log('[Trending API] ❌ Printful returned:', response.status);
          }
        }
      } catch (err) {
        console.error('[Trending API] ❌ Printful error:', err.message);
      }
    }

    // Fetch from Shopify
    if (connectedApis.includes('shopify')) {
      console.log('[Trending API] 🔄 Fetching Shopify...');
      try {
        const creds = integrations.shopify?.credentials;
        const storeUrl = creds?.storeUrl;
        const token = creds?.accessToken;
        
        console.log('[Trending API] Shopify store:', storeUrl, 'token exists:', !!token);
        
        if (storeUrl && token) {
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

          console.log('[Trending API] Shopify response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            
            if (data.errors) {
              console.error('[Trending API] Shopify GraphQL error:', data.errors[0]?.message);
            } else {
              const products = (data.data?.products?.edges || []).map(edge => {
                const p = edge.node;
                return {
                  id: `shopify_${p.id}`,
                  title: p.title,
                  supplier: 'Shopify',
                  image: p.featuredImage?.url,
                  price: p.priceRange?.minVariantPrice?.amount,
                  description: p.description?.substring(0, 100),
                  url: `https://${storeUrl}/products/${p.title?.toLowerCase().replace(/\s+/g, '-')}`,
                };
              });
              allProducts = allProducts.concat(products);
              console.log('[Trending API] ✅ Shopify: +', products.length, 'products');
            }
          } else {
            console.log('[Trending API] ❌ Shopify returned:', response.status);
          }
        }
      } catch (err) {
        console.error('[Trending API] ❌ Shopify error:', err.message);
      }
    }

    console.log('[Trending API] 📦 Total:', allProducts.length, 'products');
    console.log('[Trending API] 🎯 Connected:', connectedApis, 'Required:', requiredApis);

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
    console.error('[Trending API] 💥 Fatal error:', error.message);
    console.error('[Trending API] Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      products: [],
      connectedApis: [],
      requiredApis: ['printful', 'shopify', 'tiktok'],
    }, { status: 500 });
  }
}
