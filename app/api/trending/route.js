import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

let adminApp = null;
let adminDb = null;

function initializeFirebaseAdmin() {
  if (adminApp) return adminDb;

  try {
    const adminSdkKey = process.env.FIREBASE_ADMIN_SDK_KEY;
    
    if (!adminSdkKey) {
      console.error('[Trending API] ❌ FIREBASE_ADMIN_SDK_KEY not set');
      return null;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(adminSdkKey);
      console.log('[Trending API] ✅ Parsed Firebase Admin key');
    } catch (parseError) {
      console.error('[Trending API] ❌ Failed to parse key:', parseError.message);
      return null;
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    adminDb = admin.firestore();
    console.log('[Trending API] ✅ Firebase Admin initialized');
    return adminDb;
  } catch (error) {
    console.error('[Trending API] ❌ Error initializing Firebase:', error.message);
    return null;
  }
}

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.log('[Trending API] ❌ No user ID');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated', 
          products: [], 
          requiredApis: [],
          connectedApis: []
        },
        { status: 401 }
      );
    }

    console.log('[Trending API] 📥 User ID:', userId);

    const db = initializeFirebaseAdmin();
    
    if (!db) {
      console.log('[Trending API] ⚠️ Firebase not initialized, returning empty');
      return NextResponse.json({
        success: true,
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
        message: 'Firebase Admin not initialized',
      });
    }

    console.log('[Trending API] 🔍 Querying integrations for user:', userId);

    // Get integrations
    const integrationsRef = db.collection('users').doc(userId).collection('integrations');
    const integrationsSnapshot = await integrationsRef.get();
    
    console.log('[Trending API] 📊 Found', integrationsSnapshot.size, 'integration documents');

    const connectedApis = [];
    const integrations = {};
    
    integrationsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('[Trending API] 📄 Document:', doc.id, 'Status:', data.status);
      
      if (data.status === 'connected') {
        connectedApis.push(doc.id);
        integrations[doc.id] = data;
        console.log('[Trending API] ✅ Connected:', doc.id);
      }
    });

    console.log('[Trending API] 🎯 Connected APIs found:', connectedApis);

    const availableApis = ['printful', 'shopify', 'tiktok'];
    const requiredApis = availableApis.filter(api => !connectedApis.includes(api));

    let allProducts = [];

    // Fetch from Printful
    if (connectedApis.includes('printful') && integrations.printful?.credentials?.apiToken) {
      console.log('[Trending API] 🔄 Fetching Printful...');
      try {
        const printfulProducts = await fetchPrintfulTrending(integrations.printful);
        allProducts = allProducts.concat(printfulProducts);
        console.log('[Trending API] ✅ Printful:', printfulProducts.length, 'products');
      } catch (error) {
        console.error('[Trending API] ❌ Printful error:', error.message);
      }
    }

    // Fetch from Shopify
    if (connectedApis.includes('shopify') && integrations.shopify?.credentials?.storeUrl && integrations.shopify?.credentials?.accessToken) {
      console.log('[Trending API] 🔄 Fetching Shopify...');
      try {
        const shopifyProducts = await fetchShopifyTrending(integrations.shopify);
        allProducts = allProducts.concat(shopifyProducts);
        console.log('[Trending API] ✅ Shopify:', shopifyProducts.length, 'products');
      } catch (error) {
        console.error('[Trending API] ❌ Shopify error:', error.message);
      }
    }

    console.log('[Trending API] 📦 Total products:', allProducts.length);
    console.log('[Trending API] 🎯 Connected APIs:', connectedApis);
    console.log('[Trending API] ❓ Required APIs:', requiredApis);

    return NextResponse.json({
      success: true,
      products: allProducts,
      connectedApis: connectedApis,
      requiredApis: requiredApis,
      message: requiredApis.length > 0 
        ? `Connect ${requiredApis.join(', ')} to see more trending products`
        : 'All trending sources connected!',
    });

  } catch (error) {
    console.error('[Trending API] ❌ Fatal error:', error.message);
    console.error('[Trending API] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        products: [], 
        requiredApis: [],
        connectedApis: []
      },
      { status: 500 }
    );
  }
}

async function fetchPrintfulTrending(printfulIntegration) {
  const apiToken = printfulIntegration.credentials?.apiToken;

  if (!apiToken) {
    throw new Error('No Printful API token');
  }

  try {
    console.log('[Printful] Calling API...');
    const response = await fetch('https://api.v2.printful.com/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Printful API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('[Printful] Got response with', data.result?.length || 0, 'products');
    
    return (data.result || []).slice(0, 10).map(product => ({
      id: `printful_${product.id}`,
      title: product.title,
      type: product.type_name,
      image: product.image,
      supplier: 'Printful',
      category: product.main_category_id,
      url: `https://www.printful.com/products/${product.id}`,
    }));
  } catch (err) {
    console.error('[Printful] Error:', err.message);
    return [];
  }
}

async function fetchShopifyTrending(shopifyIntegration) {
  const storeUrl = shopifyIntegration.credentials?.storeUrl;
  const accessToken = shopifyIntegration.credentials?.accessToken;

  if (!storeUrl || !accessToken) {
    throw new Error('Missing Shopify credentials');
  }

  try {
    console.log('[Shopify] Calling API for store:', storeUrl);
    
    const query = `
      {
        products(first: 10, sortKey: CREATED, reverse: true) {
          edges {
            node {
              id
              title
              description
              featuredImage {
                url
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(
      `https://${storeUrl}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Shopify error: ${data.errors[0].message}`);
    }

    const products = data.data?.products?.edges || [];
    console.log('[Shopify] Got response with', products.length, 'products');

    return products.map(edge => {
      const product = edge.node;
      return {
        id: `shopify_${product.id}`,
        title: product.title,
        description: product.description?.substring(0, 100),
        image: product.featuredImage?.url,
        price: product.priceRange?.minVariantPrice?.amount,
        currency: product.priceRange?.minVariantPrice?.currencyCode,
        supplier: 'Shopify',
        url: `https://${storeUrl}/products/${product.title.toLowerCase().replace(/\s+/g, '-')}`,
      };
    });
  } catch (err) {
    console.error('[Shopify] Error:', err.message);
    return [];
  }
}
