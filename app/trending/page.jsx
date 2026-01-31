'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Filter, RefreshCw, LogOut, Share2, Plus } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { fetchTrendingProducts } from '@/lib/trending';

export default function TrendingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [connectedApis, setConnectedApis] = useState([]);
  const [requiredApis, setRequiredApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      setUser(currentUser);
      await loadTrendingProducts(currentUser.uid);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadTrendingProducts = async (userId) => {
    try {
      console.log('[Trending Page] 📥 Fetching trending products...');
      const result = await fetchTrendingProducts(userId);
      
      if (result.success) {
        console.log('[Trending Page] ✅ Got', result.products.length, 'products');
        setProducts(result.products);
        setConnectedApis(result.connectedApis);
        setRequiredApis(result.requiredApis);
      } else {
        console.error('[Trending Page] ❌ Error:', result.error);
        showNotification('❌ Failed to load trending products', 'error');
      }
    } catch (error) {
      console.error('[Trending Page] ❌ Error:', error);
      showNotification('❌ Error loading trending products', 'error');
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadTrendingProducts(user.uid);
    setRefreshing(false);
    showNotification('✅ Refreshed trending products', 'success');
  };

  const handleAddToStore = (product) => {
    console.log('Adding to store:', product);
    showNotification(`✅ Added "${product.title}" to store`, 'success');
  };

  const handleShare = (product) => {
    console.log('Sharing:', product);
    showNotification(`✅ Shared "${product.title}"`, 'success');
  };

  const showNotification = (message, type = 'info') => {
    setNotification(message);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/auth/login');
  };

  // Get unique categories from products
  const categories = ['all', ...new Set(products.map(p => p.type || 'Other'))];

  // Filter and sort products
  let filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => (p.type || 'Other') === selectedCategory);

  if (sortBy === 'price-low') {
    filteredProducts = [...filteredProducts].sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortBy === 'price-high') {
    filteredProducts = [...filteredProducts].sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp size={24} className="text-accent" />
                Trending Products
              </h1>
              <p className="text-xs text-gray-400">Discover trending items from connected platforms</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg ${
            notification.includes('✅') 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification}
          </div>
        )}

        {/* Status */}
        <div className="grid md:grid-cols-2 gap-4">
          {connectedApis.length > 0 && (
            <div className="card bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="font-bold text-green-400">✅ Connected APIs</h3>
              </div>
              <p className="text-sm text-gray-300">{connectedApis.join(', ')}</p>
            </div>
          )}

          {requiredApis.length > 0 && (
            <div className="card bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <h3 className="font-bold text-blue-400">📌 Connect More</h3>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300">
                  {requiredApis.join(', ')} to see more products
                </p>
                <Link href="/integrations" className="text-blue-400 hover:text-blue-300 text-sm">
                  Connect
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600"
              >
                <option value="trending">Trending</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 btn btn-secondary text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <p className="text-sm text-gray-400">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="card group hover:border-accent transition overflow-hidden">
                {/* Image */}
                {product.image && (
                  <div className="mb-4 bg-gray-700 rounded overflow-hidden h-48">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-white line-clamp-2 mb-2">{product.title}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                        {product.supplier}
                      </span>
                      {product.type && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {product.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{product.description}</p>
                  )}

                  {product.price && (
                    <p className="font-bold text-accent text-lg">${product.price}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleAddToStore(product)}
                      className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                    <button
                      onClick={() => handleShare(product)}
                      className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-1"
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-16">
            <TrendingUp size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="font-bold text-white mb-2 text-lg">No Trending Products</h3>
            <p className="text-gray-400 mb-6">
              {connectedApis.length === 0
                ? 'Connect Printful, Shopify, or TikTok to see trending products'
                : 'No products match your filter'}
            </p>
            {connectedApis.length === 0 && (
              <Link href="/integrations" className="btn btn-primary">
                Connect APIs Now
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
