'use client';

import { useState, useEffect } from 'react';
import { getTrendingProductsPage, searchTrendingProducts, filterBySupplier } from '@/lib/trending';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

export default function TrendingPage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [sortBy, setSortBy] = useState('trending');

  // Check auth state
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return unsubscribe;
    } catch (err) {
      console.error('[Trending] Auth error:', err);
    }
  }, []);

  // Load products when user is available
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[Trending Page] Loading products for user:', user.uid);

        const result = await getTrendingProductsPage(user.uid);

        if (result.success && result.products) {
          console.log('[Trending Page] ✅ Loaded:', result.products.length, 'products');
          setProducts(result.products || []);
          setFilteredProducts(result.products || []);
        } else {
          console.error('[Trending Page] ❌ Failed:', result.error);
          setError(result.error || 'Failed to load products');
          setProducts([]);
          setFilteredProducts([]);
        }
      } catch (err) {
        console.error('[Trending Page] ❌ Error:', err.message);
        setError(err.message || 'An error occurred');
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user?.uid]);

  // Apply filters and search
  useEffect(() => {
    if (!products || products.length === 0) {
      setFilteredProducts([]);
      return;
    }

    let result = [...products];

    // Apply search
    if (searchTerm) {
      result = searchTrendingProducts(result, searchTerm);
    }

    // Apply supplier filter
    if (filterSupplier !== 'all') {
      result = filterBySupplier(result, filterSupplier);
    }

    // Apply sort
    if (sortBy === 'price-low') {
      result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    setFilteredProducts(result);
  }, [products, searchTerm, filterSupplier, sortBy]);

  const getSupplierColor = (supplier) => {
    if (supplier?.includes('Shopify')) return 'bg-green-100 text-green-800';
    if (supplier?.includes('Printful')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Please log in to view trending products</p>
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔥 Trending Products</h1>
          <p className="text-gray-300">Products from your connected suppliers</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-200">
            <p className="font-semibold">❌ Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-white mt-4">Loading products...</p>
            </div>
          </div>
        )}

        {/* Controls */}
        {!loading && products.length > 0 && (
          <div className="mb-8 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filter by Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Supplier</label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Suppliers</option>
                  <option value="Shopify">Shopify</option>
                  <option value="Printful">Printful</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="trending">Trending</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div>
            <p className="text-gray-400 mb-6">
              Showing {filteredProducts.length} of {products.length} products
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                try {
                  return (
                    <div
                      key={product.id}
                      className="bg-slate-800 rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all duration-300 border border-slate-700 hover:border-blue-500 flex flex-col h-full"
                    >
                      {/* Product Image */}
                      <div className="relative h-48 bg-slate-700 overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23374151%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%239CA3AF%22%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            No Image
                          </div>
                        )}

                        {/* Badge */}
                        {product.badge && (
                          <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
                            {product.badge}
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4 flex-grow flex flex-col">
                        {/* Title */}
                        <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2">
                          {product.title || 'Untitled Product'}
                        </h3>

                        {/* Supplier Badge */}
                        <div className="mb-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSupplierColor(product.supplier)}`}>
                            {product.supplier || 'Unknown'}
                          </span>
                        </div>

                        {/* Description */}
                        {product.description && (
                          <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        {/* Price */}
                        <div className="mb-4 mt-auto">
                          <p className="text-lg font-bold text-green-400">
                            ${parseFloat(product.price || 0).toFixed(2)}
                          </p>
                          {product.currency && product.currency !== 'USD' && (
                            <p className="text-xs text-gray-500">{product.currency}</p>
                          )}
                        </div>

                        {/* Variants */}
                        {product.variants && (
                          <p className="text-xs text-gray-500 mb-4">
                            {product.variants} variant{product.variants !== 1 ? 's' : ''}
                          </p>
                        )}

                        {/* Action Button */}
                        <button
                          onClick={() => {
                            alert(
                              `Added "${product.title}" to your store!\n\nProduct ID: ${product.id}\nSupplier: ${product.supplier}\nPrice: $${parseFloat(product.price || 0).toFixed(2)}`
                            );
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                        >
                          📦 Add to Store
                        </button>
                      </div>
                    </div>
                  );
                } catch (err) {
                  console.error('[Product Card] Error rendering product:', product.id, err);
                  return null;
                }
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No products match your filters</p>
          </div>
        )}

        {/* No Products State */}
        {!loading && products.length === 0 && !error && (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700 p-8">
            <p className="text-gray-400 text-lg mb-4">No trending products available yet</p>
            <p className="text-gray-500 text-sm mb-6">
              Make sure your Shopify and Printful integrations are connected
            </p>
            <Link
              href="/integrations"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Integrations
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
