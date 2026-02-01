import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function fetchTrendingProducts(userId) {
  try {
    console.log('[Trending] 📥 Fetching trending products...');

    // Get integrations from browser
    const intRef = collection(db, 'users', userId, 'integrations');
    const intSnap = await getDocs(intRef);

    const integrations = {};
    intSnap.forEach(doc => {
      integrations[doc.id] = doc.data();
      if (doc.data()?.status === 'connected') {
        console.log(`[Trending] ✅ ${doc.id} connected`);
      }
    });

    if (Object.values(integrations).every(i => i?.status !== 'connected')) {
      return { success: false, error: 'No integrations connected', products: [] };
    }

    // Call API
    const response = await fetch('/api/trending', {
      headers: {
        'x-user-id': userId,
        'x-integrations': JSON.stringify(integrations),
      },
    });

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}`, products: [] };
    }

    const data = await response.json();
    console.log('[Trending] ✅ Got', data.products?.length || 0, 'products');

    return {
      success: true,
      products: data.products || [],
      stats: data.stats || {},
      message: data.message,
    };
  } catch (err) {
    console.error('[Trending] ❌ Error:', err.message);
    return { success: false, error: err.message, products: [] };
  }
}

export async function getTrendingProductsPage(userId) {
  const result = await fetchTrendingProducts(userId);
  return {
    success: result.success,
    products: (result.products || []).map((p, i) => ({ ...p, rank: i + 1 })),
    stats: result.stats || {},
    error: result.error,
  };
}

export async function addTrendingProductToStore(userId, product) {
  try {
    console.log('[Trending] 💾 Adding product:', product.title);

    const validation = validateProduct(product);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const productsRef = collection(db, 'products');
    
    const newProduct = {
      userId,
      name: product.title,
      title: product.title,
      supplier: product.supplier,
      source: product.source,
      description: product.description,
      image: product.image,
      price: parseFloat(product.price) || 0,
      cost: parseFloat(product.price) * 0.6 || 0,
      currency: product.currency || 'USD',
      status: 'active',
      inventory: 100,
      category: product.supplier?.includes('Shopify') ? 'Shopify Import' : 'Printful Import',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trendingSource: true,
      rating: product.rating || 4.5,
      reviews: product.reviews || 0,
      badge: product.badge,
    };

    const docRef = await addDoc(productsRef, newProduct);
    console.log('[Trending] ✅ Product added:', docRef.id);

    return {
      success: true,
      productId: docRef.id,
      message: `"${product.title}" added to your store!`,
    };
  } catch (err) {
    console.error('[Trending] ❌ Error:', err.message);
    return { success: false, errors: [err.message] };
  }
}

export function searchTrendingProducts(products, query) {
  if (!query) return products;
  const q = query.toLowerCase();
  return (products || []).filter(p =>
    p.title?.toLowerCase().includes(q) ||
    p.supplier?.toLowerCase().includes(q) ||
    p.description?.toLowerCase().includes(q)
  );
}

export function filterBySupplier(products, supplier) {
  if (!supplier || supplier === 'all') return products;
  return (products || []).filter(p =>
    p.supplier?.toLowerCase().includes(supplier.toLowerCase())
  );
}

export function validateProduct(product) {
  const errors = [];
  if (!product.title?.trim()) errors.push('Product name required');
  if (!product.price || parseFloat(product.price) <= 0) errors.push('Valid price required');
  if (!product.supplier) errors.push('Supplier required');
  return { valid: errors.length === 0, errors };
}
