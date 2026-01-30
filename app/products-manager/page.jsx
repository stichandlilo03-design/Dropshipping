'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Copy, Share2, QrCode, TrendingUp, Search, Check, AlertCircle, Eye } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function ProductsManager() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    loadProducts();
  }, [router]);

  const loadProducts = () => {
    try {
      const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
      setProducts(savedProducts);
      setFilteredProducts(savedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const generateProductUrl = (product) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/p/${product.id || Date.now()}`;
  };

  const generateQRCode = (url) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setNotification('✅ URL copied to clipboard!');
    setTimeout(() => {
      setCopiedUrl(null);
      setNotification('');
    }, 3000);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const handleDeleteProduct = (id) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    setFilteredProducts(updated);
    localStorage.setItem('products', JSON.stringify(updated));
    setNotification('✅ Product deleted!');
    setSelectedProduct(null);
    setTimeout(() => setNotification(''), 3000);
  };

  if (!mounted || !user) {
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
            <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">🔗 Product Links Manager</h1>
              <p className="text-xs text-gray-400">Create direct product URLs for ads</p>
            </div>
          </div>
          <Link href="/products" className="btn btn-primary text-sm">
            ➕ Add Product
          </Link>
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

        {/* Search Bar */}
        <div className="card">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
        </div>

        {/* Products Table */}
        {products.length > 0 ? (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Product</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Price</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Profit</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-white">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.category || 'Uncategorized'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white font-bold">${product.price}</td>
                    <td className="py-3 px-4">
                      <span className="text-green-400 font-bold">${(product.price - (product.cost || 0) - 2).toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-accent hover:text-emerald-400 transition text-sm font-semibold"
                      >
                        View Links →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No products yet</h3>
            <p className="text-gray-400 mb-6">Add products to generate direct links for your ads</p>
            <Link href="/products" className="btn btn-primary">
              ➕ Add Your First Product
            </Link>
          </div>
        )}

        {/* Selected Product Details */}
        {selectedProduct && (
          <div className="card bg-gradient-to-br from-blue-500/10 to-accent/10 border border-accent/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">📊 Product Links & Analytics</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Product Name</p>
                  <p className="text-2xl font-bold text-white">{selectedProduct.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Price</p>
                    <p className="text-lg font-bold text-white">${selectedProduct.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Cost</p>
                    <p className="text-lg font-bold text-gray-300">${selectedProduct.cost || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Profit</p>
                    <p className="text-lg font-bold text-green-400">${(selectedProduct.price - (selectedProduct.cost || 0) - 2).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Links Section */}
              <div className="space-y-4">
                {/* Direct Product Link */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Share2 size={16} className="text-accent" />
                    Direct Product Link
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={generateProductUrl(selectedProduct)}
                      readOnly
                      className="bg-transparent text-accent text-sm flex-1 font-mono"
                    />
                    <button
                      onClick={() => handleCopyUrl(generateProductUrl(selectedProduct))}
                      className="text-gray-400 hover:text-white transition p-2"
                    >
                      {copiedUrl === generateProductUrl(selectedProduct) ? (
                        <Check size={20} className="text-green-400" />
                      ) : (
                        <Copy size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Facebook Ad Link */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Share2 size={16} className="text-blue-400" />
                    Facebook Ads (UTM)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${generateProductUrl(selectedProduct)}?utm_source=facebook&utm_medium=ads&utm_campaign=promoted`}
                      readOnly
                      className="bg-transparent text-accent text-xs flex-1 font-mono"
                    />
                    <button
                      onClick={() => handleCopyUrl(`${generateProductUrl(selectedProduct)}?utm_source=facebook&utm_medium=ads&utm_campaign=promoted`)}
                      className="text-gray-400 hover:text-white transition p-2"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* TikTok Link */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Share2 size={16} className="text-pink-400" />
                    TikTok Bio Link
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${generateProductUrl(selectedProduct)}?utm_source=tiktok&utm_medium=bio`}
                      readOnly
                      className="bg-transparent text-accent text-xs flex-1 font-mono"
                    />
                    <button
                      onClick={() => handleCopyUrl(`${generateProductUrl(selectedProduct)}?utm_source=tiktok&utm_medium=bio`)}
                      className="text-gray-400 hover:text-white transition p-2"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-gray-800/50 rounded-lg p-4 flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <QrCode size={16} className="text-purple-400" />
                      QR Code
                    </p>
                    <p className="text-xs text-gray-500">Scan for Instagram stories</p>
                  </div>
                  <img
                    src={generateQRCode(generateProductUrl(selectedProduct))}
                    alt="QR Code"
                    className="w-24 h-24 bg-white p-2 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-6 border-t border-gray-700 flex gap-3 flex-wrap">
              <Link
                href={`/social-publish?productId=${selectedProduct.id}&name=${encodeURIComponent(selectedProduct.name)}`}
                className="btn btn-primary flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                Publish to Social
              </Link>
              <button
                onClick={() => handleDeleteProduct(selectedProduct.id)}
                className="btn btn-danger flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete Product
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {products.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="card text-center">
              <TrendingUp size={24} className="mx-auto text-accent mb-2" />
              <p className="text-2xl font-bold text-white">{products.length}</p>
              <p className="text-xs text-gray-400">Total Products</p>
            </div>
            <div className="card text-center">
              <Share2 size={24} className="mx-auto text-pink-400 mb-2" />
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Total Clicks</p>
            </div>
            <div className="card text-center">
              <Eye size={24} className="mx-auto text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-gray-400">Link Conversions</p>
            </div>
            <div className="card text-center">
              <TrendingUp size={24} className="mx-auto text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">0%</p>
              <p className="text-xs text-gray-400">Avg Conversion Rate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
