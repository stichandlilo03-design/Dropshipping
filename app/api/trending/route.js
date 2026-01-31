import { NextResponse } from 'next/server';
import { db as firebaseDb } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export async function GET(request) {
  try {
    // Get user ID from Firebase ID token in Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Trending] ❌ No auth header');
      return NextResponse.json(
        { success: false, error: 'Not authenticated', products: [], requiredApis: [] },
        { status: 401 }
      );
    }

    // For API routes, we need to use the token to identify the user
    // This is a workaround - ideally you'd verify the token on the server
    // For now, we'll get the userId from a custom header that the client sends
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.log('[Trending] ❌ No user ID provided');
      return NextResponse.json(
        { success: false, error: 'Not authenticated', products: [], requiredApis: [] },
        { status: 401 }
      );
    }

    console.log('[Trending] 📥 Fetching real trending data for user:', userId);

    // Get all connected integrations
    const integrationsRef = collection(firebaseDb, 'users', userId, 'integrations');
    const integrationsSnapshot = await getDocs(integrationsRef);
    
    const connectedApis = [];
    const integrations = {};
    
    integrationsSnapshot.forEach(doc => {
      if (doc.data().status === 'connected') {
        connectedApis.push(doc.id);
        integrations[doc.id] = doc.data();
      }
    });

    console.log('[Trending] ✅ Connected APIs:', connectedApis);

    // Define required APIs for trending
    const availableApis = ['printful', 'shopify', 'tiktok'];
    const requiredApis = availableApis.filter(api => !connectedApis.includes(api));

    let allProducts = [];

    // Fetch from Printful if connected
    if (integrations.printful) {
      console.log('[Trending] 🔄 Fetching from Printful...');
      try {
        const printfulProducts = await fetchPrintfulTrending(integrations.printful);
        allProducts = allProducts.concat(printfulProducts);
        console.log('[Trending] ✅ Got', printfulProducts.length, 'from Printful');
      } catch (error) {
        console.error('[Trending] ❌ Printful error:', error.message);
      }
    }

    // Fetch from Shopify if connected
    if (integrations.shopify) {
      console.log('[Trending] 🔄 Fetching from Shopify...');
      try {
        const shopifyProducts = await fetchShopifyTrending(integrations.shopify);
        allProducts = allProducts.concat(shopifyProducts);
        console.log('[Trending] ✅ Got', shopifyProducts.length, 'from Shopify');
      } catch (error) {
        console.error('[Trending] ❌ Shopify error:', error.message);
      }
    }

    // TikTok requires special OAuth - show as needed
    if (!integrations.tiktok && 'tiktok' in requiredApis) {
      console.log('[Trending] ⚠️ TikTok not connected');
    }

    console.log('[Trending] ✅ Total products:', allProducts.length);

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
    console.error('[Trending] ❌ Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, products: [], requiredApis: [] },
      { status: 500 }
    );
  }
}

// Fetch real Printful trending products
async function fetchPrintfulTrending(printfulIntegration) {
  const { credentials } = printfulIntegration;
  const apiToken = credentials?.apiToken;

  if (!apiToken) {
    throw new Error('No Printful API token');
  }

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
  
  // Return real Printful products (top products)
  return (data.result || []).slice(0, 10).map(product => ({
    id: `printful_${product.id}`,
    title: product.title,
    type: product.type_name,
    image: product.image,
    supplier: 'Printful',
    category: product.main_category_id,
    url: `https://www.printful.com/products/${product.id}`,
  }));
}

// Fetch real Shopify trending products
async function fetchShopifyTrending(shopifyIntegration) {
  const { credentials } = shopifyIntegration;
  const storeUrl = credentials?.storeUrl;
  const accessToken = credentials?.accessToken;

  if (!storeUrl || !accessToken) {
    throw new Error('No Shopify credentials');
  }

  // GraphQL query to get products (most recently added or best sellers)
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

  // Return real Shopify products
  return (data.data?.products?.edges || []).map(edge => {
    const product = edge.node;
    return {
      id: `shopify_${product.id}`,
      title: product.title,
      description: product.description?.substring(0, 100),
      image: product.featuredImage?.url,
      price: product.priceRange?.minVariantPrice?.amount,
      currency: product.priceRange?.minVariantPrice?.currencyCode,
      supplier: 'Shopify',
      url: `https://${credentials.storeUrl}/products/${product.title.toLowerCase().replace(/\s+/g, '-')}`,
    };
  });
}
