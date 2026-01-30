'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Plus, Eye, Download, Filter, ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';

// Mock trending products data (Replace with Printful API)
const MOCK_TRENDING = [
  {
    id: 1,
    name: 'Programmer Coffee T-Shirt',
    category: 'Developer Humor',
    trendScore: 9.2,
    estimatedSales: 500,
    profitMargin: 58,
    image: 'https://via.placeholder.com/300x300?text=Programmer+Coffee+Tshirt',
    supplier: 'Printful',
    price: 35,
    cost: 8,
    description: 'Perfect for developers who love coffee more than sleep',
  },
  {
    id: 2,
    name: 'Dog Mom Hoodie',
    category: 'Pet Lover',
    trendScore: 8.7,
    estimatedSales: 800,
    profitMargin: 62,
    image: 'https://via.placeholder.com/300x300?text=Dog+Mom+Hoodie',
    supplier: 'Printful',
    price: 45,
    cost: 15,
    description: 'For dog moms everywhere',
  },
  {
    id: 3,
    name: 'Yoga Zen Mug',
    category: 'Lifestyle',
    trendScore: 8.1,
    estimatedSales: 1200,
    profitMargin: 64,
    image: 'https://via.placeholder.com/300x300?text=Yoga+Zen+Mug',
    supplier: 'Printful',
    price: 18,
    cost: 4,
    description: 'Perfect for morning yoga practice',
  },
  {
    id: 4,
    name: 'Gaming PC Master Race Hoodie',
    category: 'Gaming',
    trendScore: 8.5,
    estimatedSales: 650,
    profitMargin: 60,
    image: 'https://via.placeholder.com/300x300?text=Gaming+PC+Hoodie',
    supplier: 'Printful',
    price: 45,
    cost: 15,
    description: 'For PC gamers',
  },
  {
    id: 5,
    name: 'Mindfulness T-Shirt',
    category: 'Wellness',
    trendScore: 7.9,
    estimatedSales: 400,
    profitMargin: 59,
    image: 'https://via.placeholder.com/300x300?text=Mindfulness+Tshirt',
    supplier: 'Printful',
    price: 28,
    cost: 8,
    description: 'Promote mindfulness and mental health',
  },
];

export default function Trending() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trendingProducts, setTrendingProducts] = useState(MOCK_TRENDING);
  const [filteredProducts, setFilteredProducts] = useState(MOCK_TRENDING);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('trendScore');
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    filterProducts();
  }, [router]);

  const filterProducts = () => {
    let filtered = [...MOCK_TRENDING];

    // Filter by category
    if (category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'trendScore') return b.trendScore - a.trendScore;
      if (sortBy === 'sales') return b.estimatedSales - a.estimatedSales;
      if (sortBy === 'margin') return b.profitMargin - a.profitMargin;
      return 0;
    });

    setFilteredProducts(filtered);
  };

  const handleAddToStore = async (product) => {
    try {
      // TODO: Replace with actual Firebase call
      const newProduct = {
        id: Date.now(),
        name: product.name,
        price: product.price,
        cost: product.cost,
        description: product.description,
        image: product.image,
        category: product.category,
        trendingProduct: true,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage for now
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      products.push(newProduct);
      localStorage.setItem('products', JSON.stringify(products));

      setNotification(`✅ "${product.name}" added to your store!`);
      setTimeout(() => setNotification(''), 3000);

      // Show next action
      setTimeout(() => {
        setSelectedProduct(product);
      }, 1500);
    } catch (error) {
      console.error('Error adding product:', error);
      setNotification('❌ Failed to add product');
    }
  };

  const handlePublishToSocial = (product) => {
    // TODO: Navigate to social publishing page with product data
    router.push(`/social-publish?productId=${product.id}`);
  };

  useEffect(() => {
    filterProducts();
  }, [category, sortBy]);

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

  const categories = ['All', ...new Set(MOCK_TRENDING.map(p => p.category))];

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
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{filteredProducts.length} products</p>
              <p className="text-xs text-gray-400">Updating live</p>
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

        {/* Filters & Sort */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Category Filter */}
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

            {/* Sort */}
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
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card group hover:border-accent transition overflow-hidden">
              {/* Product Image */}
              <div className="relative mb-4 overflow-hidden rounded-lg bg-gray-800 h-48">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
                {/* Trend Badge */}
                <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  🔥 {product.trendScore}/10
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-accent font-semibold">{product.category}</p>
                  <h3 className="text-lg font-bold text-white">{product.name}</h3>
                  <p className="text-sm text-gray-400">{product.description}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Est. Sales</p>
                    <p className="text-sm font-bold text-white">{product.estimatedSales}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Margin</p>
                    <p className="text-sm font-bold text-green-400">{product.profitMargin}%</p>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <p className="text-xs text-gray-400">Price</p>
                    <p className="text-sm font-bold text-white">${product.price}</p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-gray-800/30 rounded p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Your Price:</span>
                    <span className="font-bold text-white">${product.price}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Cost:</span>
                    <span className="font-bold text-red-400">-${product.cost}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-1 flex justify-between">
                    <span className="font-semibold text-gray-200">Profit Per Sale:</span>
                    <span className="font-bold text-green-400">${(product.price - product.cost - 2).toFixed(2)}</span>
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
                    <Eye size={16} />
                    Preview
                  </button>
                </div>

                {/* After Added */}
                {selectedProduct?.id === product.id && (
                  <button
                    onClick={() => handlePublishToSocial(product)}
                    className="w-full btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center justify-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    📱 Auto-Publish to Social
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
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
