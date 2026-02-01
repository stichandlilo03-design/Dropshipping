'use client';

import { useState, useEffect } from 'react';
import { getTrendingProductsPage, searchTrendingProducts, filterBySupplier, addTrendingProductToStore } from '@/lib/trending';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { ArrowLeft, Search, Filter } from 'lucide-react';

export default function TrendingPage() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [adding, setAdding] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getTrendingProductsPage(user.uid);
        
        if (result.success) {
          setProducts(result.products);
          setFilteredProducts(result.products);
        } else {
          setError(result.error || 'Failed to load products');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid]);

  useEffect(() => {
    let result = [...(products || [])];
    
    if (searchTerm) result = searchTrendingProducts(result, searchTerm);
    if (filterSupplier !== 'all') result = filterBySupplier(result, filterSupplier);
    
    if (sortBy === 'price-low') result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
    else if (sortBy === 'price-high') result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
    else if (sortBy === 'name') result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    
    setFilteredProducts(result);
  }, [products, searchTerm, filterSupplier, sortBy]);

  const handleAddToStore = async (product) => {
    try {
      setAdding(product.id);
      const result = await addTrendingProductToStore(user.uid, product);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.errors?.[0] || 'Failed to add' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAdding(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Link href="/auth/login" className="text-blue-400 hover:underline">
          Please log in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white">🔥 Trending Products</h1>
              <p className="text-gray-300">Discover & add products from Shopify & Printful</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' : 'bg-red-900/30 border-red-500 text-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-200">
            ❌ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">Loading products...</p>
          </div>
        )}

        {/* Controls */}
        {!loading && products.length > 0 && (
          <div className="mb-8 bg-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">🔍 Search</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">📦 Supplier</label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Suppliers</option>
                  <option value="Shopify">Shopify Store</option>
                  <option value="Printful">Printful</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">📊 Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="trending">Trending</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-400">Showing {filteredProducts.length} of {products.length} products</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition flex flex-col h-full">
                {/* Image */}
                <div className="relative h-48 bg-slate-700 overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                  )}
                  {product.badge && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-bold">
                      {product.badge}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2">{product.title}</h3>
                  
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium w-fit mb-3 ${product.supplier?.includes('Shopify') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {product.supplier}
                  </span>

                  {product.description && (
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2">{product.description}</p>
                  )}

                  {product.reviews && (
                    <p className="text-xs text-yellow-400 mb-2">⭐ {product.rating} ({product.reviews} reviews)</p>
                  )}

                  <div className="mb-4 mt-auto">
                    <p className="text-lg font-bold text-green-400">${parseFloat(product.price || 0).toFixed(2)}</p>
                  </div>

                  <button
                    onClick={() => handleAddToStore(product)}
                    disabled={adding === product.id}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition"
                  >
                    {adding === product.id ? '⏳ Adding...' : '📦 Add to Store'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No products match your filters</p>
          </div>
        )}

        {/* No Products */}
        {!loading && products.length === 0 && !error && (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700 p-8">
            <p className="text-gray-400 text-lg mb-4">No products available</p>
            <p className="text-gray-500 text-sm">Connect Shopify or Printful integrations</p>
            <Link href="/integrations" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
              Go to Integrations
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
