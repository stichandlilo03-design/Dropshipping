import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Fetch trending products - FIXED VERSION
 * Reads integrations from browser (where user IS authenticated)
 * Sends to API via headers (no Firebase permissions needed)
 */
export async function fetchTrendingProducts(userId) {
  try {
    console.log('[Trending] 📥 Reading integrations from browser...');

    // STEP 1: Read integrations from browser (user IS authenticated here)
    const integrationsRef = collection(db, 'users', userId, 'integrations');
    const integrationsSnap = await getDocs(integrationsRef);

    const integrations = {};
    integrationsSnap.forEach(doc => {
      integrations[doc.id] = doc.data();
      if (doc.data()?.status === 'connected') {
        console.log(`[Trending] ✅ Found: ${doc.id} - Status: ${doc.data().status}`);
      }
    });

    const integrationsArray = Object.keys(integrations);
    console.log('[Trending] ✅ Loaded integrations:', integrationsArray);

    // STEP 2: Call /api/trending with integrations data from browser
    console.log('[Trending] 📡 Calling /api/trending with integrations...');

    const response = await fetch('/api/trending', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-integrations': JSON.stringify(integrations),
      },
    });

    console.log('[Trending] 📊 API response status:', response.status);

    if (!response.ok) {
      console.error('[Trending] ❌ API returned error:', response.status);
      return {
        success: false,
        error: `API error: ${response.status}`,
        products: [],
      };
    }

    const data = await response.json();

    if (!data.success) {
      console.error('[Trending] ❌ API returned error:', data.error);
      return {
        success: false,
        error: data.error || 'Unknown error',
        products: [],
      };
    }

    const products = data.products || [];
    console.log('[Trending] ✅ Got', products.length, 'products');

    if (products.length > 0) {
      const breakdown = {
        shopify: products.filter(p => p.source === 'shopify' || p.supplier?.includes('Shopify')).length,
        printful: products.filter(p => p.source === 'printful' || p.supplier?.includes('Printful')).length,
      };
      console.log('[Trending] 📊 Breakdown:', breakdown);
    }

    return {
      success: true,
      products: products,
      message: data.message,
    };

  } catch (error) {
    console.error('[Trending] ❌ Error:', error.message);
    
    if (error.message.includes('permissions')) {
      console.error('[Trending] 💡 Firebase permissions error - check your security rules');
    }
    
    return {
      success: false,
      error: error.message,
      products: [],
    };
  }
}

/**
 * Get trending products for the /trending page
 */
export async function getTrendingProductsPage(userId) {
  try {
    const result = await fetchTrendingProducts(userId);
    
    if (!result.success) {
      return {
        success: false,
        products: [],
        error: result.error,
      };
    }

    const products = (result.products || []).map((product, index) => ({
      ...product,
      rank: index + 1,
    }));

    return {
      success: true,
      products: products,
      total: products.length,
      message: result.message,
    };
  } catch (error) {
    console.error('[Trending Page] ❌ Error:', error.message);
    return {
      success: false,
      products: [],
      error: error.message,
    };
  }
}

/**
 * Search trending products
 */
export function searchTrendingProducts(products, query) {
  if (!query || !products) return products;
  const lowerQuery = query.toLowerCase();
  return products.filter(p =>
    p.title?.toLowerCase().includes(lowerQuery) ||
    p.supplier?.toLowerCase().includes(lowerQuery) ||
    p.brand?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter by supplier
 */
export function filterBySupplier(products, supplier) {
  if (!supplier || !products) return products;
  return products.filter(p =>
    p.supplier?.toLowerCase().includes(supplier.toLowerCase()) ||
    p.source?.toLowerCase().includes(supplier.toLowerCase())
  );
}

/**
 * Sort products
 */
export function sortProducts(products, sortBy = 'trending') {
  if (!products) return [];
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    case 'price-high':
      return sorted.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    case 'newest':
      return sorted.reverse();
    case 'name':
      return sorted.sort((a, b) => a.title?.localeCompare(b.title || '') || 0);
    case 'trending':
    default:
      return sorted.sort((a, b) => {
        const sourceOrder = { 'shopify': 1, 'shopify_store': 1, 'printful': 2, 'printful_bestseller': 2 };
        return (sourceOrder[a.source] || 99) - (sourceOrder[b.source] || 99);
      });
  }
}

/**
 * Get product details
 */
export function getProductDetails(product) {
  return {
    ...product,
    isAvailable: product.availability_status === 'in_stock',
    priceFormatted: `$${parseFloat(product.price || 0).toFixed(2)}`,
    isBestseller: product.badge?.includes('Bestseller') || false,
    isShopifyProduct: product.source === 'shopify' || product.supplier?.includes('Shopify'),
    isPrintfulProduct: product.source === 'printful' || product.supplier?.includes('Printful'),
  };
}
