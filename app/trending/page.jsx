'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Plus, Download, Filter, ArrowLeft, AlertCircle, Check, Flame, Zap, Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';

export default function Trending() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [connectedApis, setConnectedApis] = useState([]);
  const [requiredApis, setRequiredApis] = useState([]);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('trendScore');
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    const currentUser = auth.currentUser;

    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    fetchTrendingProducts();
  }, [router]);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      console.log('[Trending Page] 📥 Fetching trending products...');

      const response = await fetch('/api/trending', {
        headers: {
          'x-user-id': user?.uid,
        },
      });
      const data = await response.json();

      console.log('[Trending Page] ✅ Response:', data);

      if (data.success) {
        setTrendingProducts(data.products || []);
        setFilteredProducts(data.products || []);
        setConnectedApis(data.connectedApis || []);
        setRequiredApis(data.requiredApis || []);
        setApiMessage(data.message || '');
      } else {
        console.error('[Trending Page] ❌ Error:', data.error);
        setTrendingProducts([]);
        setFilteredProducts([]);
        setNotification(`❌ ${data.error || 'Failed to load trending products'}`);
      }
    } catch (error) {
      console.error('[Trending Page] ❌ Error:', error);
      setTrendingProducts([]);
      setFilteredProducts([]);
      setNotification('❌ Failed to load trending products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToStore = async (product) => {
    try {
      // For now, show notification
      // In full implementation, would add to products collection in Firestore
      setNotification(`✅ "${product.title}" added to your store!`);
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      console.error('Error adding product:', error);
      setNotification('❌ Failed to add product');
    }
  };

  const handlePublishToSocial = (product) => {
    router.push(`/social-publish?productId=${product.id}&name=${encodeURIComponent(product.title)}`);
  };

  useEffect(() => {
    filterProducts();
  }, [category, sortBy, trendingProducts]);

  const filterProducts = () => {
    let filtered = [...trendingProducts];

    if (category !== 'All') {
      filtered = filtered.filter(p => p.type === category || p.category === category);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'trendScore') return (b.trendScore || 0) - (a.trendScore || 0);
      if (sortBy === 'sales') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'price') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      return 0;
    });

    setFilteredProducts(filtered);
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trending products...</p>
        </div>
      </div>
    );
  }

  const categories = ['All', ...new Set(trendingProducts.map(p => p.type || p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Flame size={28} className="text-orange-500" />
                Trending Products
              </h1>
              <p className="text-xs text-gray-400">Discover hot-selling products from your connected APIs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg flex items-center gap-2 animate-in ${
            notification.includes('✅')
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification.includes('✅') ? <Check size={20} /> : <AlertCircle size={20} />}
            {notification}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-secondary border border-gray-700 rounded-lg text-center py-12">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300 font-semibold">Fetching trending products...</p>
            <p className="text-sm text-gray-500 mt-2">Loading data from your connected APIs</p>
          </div>
        )}

        {/* Connected APIs & Required APIs Info */}
        {!loading && (
          <>
            {/* Connected APIs Badge */}
            {connectedApis.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-semibold flex items-center gap-2">
                  <Check size={20} />
                  ✅ Connected: {connectedApis.map(api => 
                    api === 'printful' ? 'Printful' : 
                    api === 'shopify' ? 'Shopify' :
                    api === 'tiktok' ? 'TikTok' :
                    api.charAt(0).toUpperCase() + api.slice(1)
                  ).join(', ')}
                </p>
              </div>
            )}

            {/* Required APIs Message */}
            {requiredApis.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                  <Zap size={20} />
                  {apiMessage || `Connect ${requiredApis.join(', ')} to see more trending products`}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {requiredApis.map(api => (
                    <Link
                      key={api}
                      href="/integrations"
                      className="flex items-center justify-between bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded p-3 transition-colors group"
                    >
                      <span className="text-sm text-blue-400 font-semibold capitalize group-hover:text-blue-300">
                        {api === 'tiktok' ? '🎵 TikTok' : 
                         api === 'printful' ? '📦 Printful' :
                         api === 'shopify' ? '🛒 Shopify' :
                         api}
                      </span>
                      <span className="text-xs text-blue-500 group-hover:translate-x-1 transition">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Filters & Sort */}
        {!loading && trendingProducts.length > 0 && (
          <div className="bg-secondary border border-gray-700 rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  <Filter size={16} className="inline mr-2" />
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  <TrendingUp size={16} className="inline mr-2" />
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-primary border border-gray-600 rounded-lg text-white focus:outline-none focus:border-accent"
                >
                  <option value="trendScore">Trend Score</option>
                  <option value="sales">Views / Popularity</option>
                  <option value="price">Price</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchTrendingProducts}
                  className="w-full px-6 py-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Products Yet */}
        {!loading && trendingProducts.length === 0 && (
          <div className="bg-secondary border border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-br from-blue-500/10 to-accent/10 p-12 text-center">
              <Flame size={48} className="mx-auto text-orange-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Trending Products Yet</h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Connect your APIs to see trending products from your suppliers
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
                <div className="bg-primary rounded-lg p-4 border border-gray-700">
                  <h4 className="font-bold text-white mb-2">📦 Printful</h4>
                  <p className="text-sm text-gray-400">Print-on-demand trending products</p>
                </div>
                <div className="bg-primary rounded-lg p-4 border border-gray-700">
                  <h4 className="font-bold text-white mb-2">🛒 Shopify</h4>
                  <p className="text-sm text-gray-400">Your store's newest products</p>
                </div>
                <div className="bg-primary rounded-lg p-4 border border-gray-700">
                  <h4 className="font-bold text-white mb-2">🎵 TikTok</h4>
                  <p className="text-sm text-gray-400">Viral products from TikTok trends</p>
                </div>
              </div>
              <Link
                href="/integrations"
                className="inline-block px-8 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition"
              >
                🔗 Connect APIs
              </Link>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-secondary border border-gray-700 rounded-lg overflow-hidden hover:border-accent transition group"
              >
                {/* Product Image */}
                <div className="relative mb-0 overflow-hidden bg-gray-800 h-48">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <Flame size={48} className="text-orange-400" />
                    </div>
                  )}
                  
                  {/* Supplier Badge */}
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Flame size={14} />
                    {product.supplier}
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-accent font-semibold uppercase">{product.type || product.category || 'Product'}</p>
                    <h3 className="text-lg font-bold text-white line-clamp-2">{product.title}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">{product.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-500">Popularity</p>
                      <p className="text-sm font-bold text-white">
                        {product.views ? `${(product.views / 1000).toFixed(0)}K` : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-500">Supplier</p>
                      <p className="text-sm font-bold text-accent">{product.supplier}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-sm font-bold text-white">
                        {product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleAddToStore(product)}
                      className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                    <button
                      onClick={() => handlePublishToSocial(product)}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Filters State */}
        {!loading && filteredProducts.length === 0 && trendingProducts.length > 0 && (
          <div className="bg-secondary border border-gray-700 rounded-lg text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
            <p className="text-gray-400">Try adjusting your filters or sorting options</p>
          </div>
        )}
      </div>
    </div>
  );
}
