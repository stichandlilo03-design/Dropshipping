'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Plus, Eye, Download, Filter, ArrowLeft, AlertCircle, Check, Flame } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Trending() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('trendScore');
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    fetchTrendingProducts();
  }, [router]);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      
      try {
        const response = await fetch('/api/printful/trending', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('printfulToken') || ''}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTrendingProducts(data.products || []);
          setFilteredProducts(data.products || []);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('Printful API not connected yet');
      }

      try {
        const response = await fetch('/api/tiktok/trending', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('tiktokToken') || ''}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTrendingProducts(data.products || []);
          setFilteredProducts(data.products || []);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('TikTok API not connected yet');
      }

      try {
        const response = await fetch('/api/trends/trending');

        if (response.ok) {
          const data = await response.json();
          setTrendingProducts(data.products || []);
          setFilteredProducts(data.products || []);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('Google Trends API not connected yet');
      }

      setTrendingProducts([]);
      setFilteredProducts([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trending products:', error);
      setTrendingProducts([]);
      setFilteredProducts([]);
      setLoading(false);
    }
  };

  const handleAddToStore = async (product) => {
    try {
      const newProduct = {
        id: Date.now(),
        name: product.name,
        price: product.suggestedPrice || product.price || 35,
        cost: product.cost || 8,
        description: product.description,
        image: product.image || product.imageUrl,
        category: product.category,
        trendingProduct: true,
        trendScore: product.trendScore || 8,
        estimatedSales: product.estimatedSales || 500,
        createdAt: new Date().toISOString(),
      };

      const products = JSON.parse(localStorage.getItem('products') || '[]');
      products.push(newProduct);
      localStorage.setItem('products', JSON.stringify(products));

      if (user && db) {
        db.addProduct(newProduct, user.id);
      }

      setNotification(`✅ "${product.name}" added to your store!`);
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      console.error('Error adding product:', error);
      setNotification('❌ Failed to add product');
    }
  };

  const handlePublishToSocial = (product) => {
    router.push(`/social-publish?productId=${product.id}&name=${encodeURIComponent(product.name)}`);
  };

  useEffect(() => {
    filterProducts();
  }, [category, sortBy, trendingProducts]);

  const filterProducts = () => {
    let filtered = [...trendingProducts];

    if (category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'trendScore') return (b.trendScore || 0) - (a.trendScore || 0);
      if (sortBy === 'sales') return (b.estimatedSales || 0) - (a.estimatedSales || 0);
      if (sortBy === 'margin') return (b.profitMargin || 0) - (a.profitMargin || 0);
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

  const categories = ['All', ...new Set(trendingProducts.map(p => p.category).filter(Boolean))];

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
              <h1 className="text-2xl font-bold text-white">🔥 Trending Products</h1>
              <p className="text-xs text-gray-400">Discover hot-selling products globally</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
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
          <div className="card text-center py-12">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Fetching trending products from your connected APIs...</p>
            <p className="text-sm text-gray-500 mt-2">This will auto-update when you connect Printful, TikTok, or Google Trends API</p>
          </div>
        )}

        {/* No APIs Connected */}
        {!loading && trendingProducts.length === 0 && (
          <div className="card bg-gradient-to-br from-blue-500/10 to-accent/10 border border-blue-500/30">
            <div className="text-center py-12">
              <Flame size={48} className="mx-auto text-orange-400 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Connect Your APIs</h3>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                To see trending products here, connect one of these APIs in your Settings:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">📦 Printful API</h4>
                  <p className="text-sm text-gray-400">Get trending print products</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">🎵 TikTok API</h4>
                  <p className="text-sm text-gray-400">Get viral products from TikTok</p>
                </div>
                <div className="bg-secondary rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">📈 Google Trends</h4>
                  <p className="text-sm text-gray-400">Get trending search keywords</p>
                </div>
              </div>
              <Link href="/settings" className="btn btn-primary">
                🔗 Connect APIs in Settings
              </Link>
            </div>
          </div>
        )}

        {/* Filters & Sort */}
        {!loading && trendingProducts.length > 0 && (
          <div className="card">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  <Filter size={16} className="inline mr-2" />
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-full"
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
                  className="input-field w-full"
                >
                  <option value="trendScore">Trend Score (Highest)</option>
                  <option value="sales">Estimated Sales</option>
                  <option value="margin">Profit Margin</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchTrendingProducts}
                  className="btn btn-secondary w-full"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id || Math.random()} className="card group hover:border-accent transition overflow-hidden">
                {/* Product Image */}
                <div className="relative mb-4 overflow-hidden rounded-lg bg-gray-800 h-48">
                  {product.image || product.imageUrl ? (
                    <img
                      src={product.image || product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <Flame size={48} className="text-orange-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    🔥 {(product.trendScore || 8).toFixed(1)}/10
                  </div>
                </div>

                {/* Product Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-accent font-semibold">{product.category || 'General'}</p>
                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                    <p className="text-sm text-gray-400">{product.description || 'Premium quality product'}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-400">Est. Sales</p>
                      <p className="text-sm font-bold text-white">{product.estimatedSales || 500}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-400">Margin</p>
                      <p className="text-sm font-bold text-green-400">{product.profitMargin || 58}%</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-xs text-gray-400">Price</p>
                      <p className="text-sm font-bold text-white">${product.suggestedPrice || product.price || 35}</p>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-gray-800/30 rounded p-3 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Your Price:</span>
                      <span className="font-bold text-white">${product.suggestedPrice || product.price || 35}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Cost:</span>
                      <span className="font-bold text-red-400">-${product.cost || 8}</span>
                    </div>
                    <div className="border-t border-gray-700 pt-1 flex justify-between">
                      <span className="font-semibold text-gray-200">Profit Per Sale:</span>
                      <span className="font-bold text-green-400">
                        ${((product.suggestedPrice || product.price || 35) - (product.cost || 8) - 2).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleAddToStore(product)}
                      className="flex-1 btn btn-primary text-sm flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add to Store
                    </button>
                    <button
                      onClick={() => handlePublishToSocial(product)}
                      className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Social
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && trendingProducts.length > 0 && (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
            <p className="text-gray-400">Try changing your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
