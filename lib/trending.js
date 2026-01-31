import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchTrendingProducts(userId) {
  try {
    const integrationsRef = collection(db, 'users', userId, 'integrations');
    const snapshot = await getDocs(integrationsRef);
    
    const connectedApis = [];
    const integrations = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data?.status === 'connected') {
        connectedApis.push(doc.id);
        integrations[doc.id] = data;
      }
    });

    let allProducts = [];

    // Fetch Printful
    if (integrations.printful?.credentials?.apiToken) {
      const token = integrations.printful.credentials.apiToken;
      const response = await fetch('https://api.v2.printful.com/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        allProducts = allProducts.concat(
          (data.result || []).slice(0, 10).map(p => ({
            id: `printful_${p.id}`,
            title: p.title,
            supplier: 'Printful',
            image: p.image,
          }))
        );
      }
    }

    // Fetch Shopify
    if (integrations.shopify?.credentials?.storeUrl && integrations.shopify?.credentials?.accessToken) {
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
          allProducts = allProducts.concat(
            (data.data?.products?.edges || []).map(edge => {
              const p = edge.node;
              return {
                id: `shopify_${p.id}`,
                title: p.title,
                supplier: 'Shopify',
                image: p.featuredImage?.url,
                price: p.priceRange?.minVariantPrice?.amount,
              };
            })
          );
        }
      }
    }

    return {
      success: true,
      products: allProducts,
      connectedApis: connectedApis,
      requiredApis: ['printful', 'shopify', 'tiktok'].filter(api => !connectedApis.includes(api)),
    };
  } catch (error) {
    return {
      success: false,
      products: [],
      connectedApis: [],
      requiredApis: ['printful', 'shopify', 'tiktok'],
      error: error.message,
    };
  }
}
