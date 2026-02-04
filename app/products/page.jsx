'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Plus, Trash2, Eye, ArrowLeft, Package, Copy, Edit, Check, AlertCircle, QrCode, Save, X, Share2, Download, Upload, BarChart3, Star, TrendingUp, Heart, ShoppingCart, DollarSign, Zap, Loader } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishResults, setPublishResults] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [notification, setNotification] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProducts(currentUser.uid);
      } else {
        router.push('/auth/login');
      }
    });
    return unsubscribe;
  }, [router]);

  const loadProducts = async (userId) => {
    try {
      setLoading(true);
      const products = [];

      const q = query(collection(db, 'products'), where('userId', '==', userId));
      const snap = await getDocs(q);
      
      snap.docs.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          source: data.source || (data.trendingSource ? 'trending' : 'manual'),
          sourceLabel: data.trendingSource ? '🔥 Trending' : (data.supplier ? `📦 ${data.supplier}` : '✏️ Manual'),
          sales: data.sales || 0,
          rating: data.rating || 0,
          views: data.views || 0,
          onSale: data.onSale || false,
        });
      });

      console.log('[Products] Loaded', products.length, 'products');
      setAllProducts(products);
      applyFiltersAndSort(products);
    } catch (err) {
      console.error('[Products] Error loading products:', err);
      showNotification('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = (products) => {
    let result = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.name || '')?.toLowerCase().includes(term) ||
        (p.supplier || '')?.toLowerCase().includes(term) ||
        (p.description || '')?.toLowerCase().includes(term) ||
        (p.category || '')?.toLowerCase().includes(term)
      );
    }

    if (filterSource !== 'all') {
      if (filterSource === 'manual') {
        result = result.filter(p => !p.trendingSource && !p.supplier);
      } else if (filterSource === 'trending') {
        result = result.filter(p => p.trendingSource === true);
      } else if (filterSource === 'shopify') {
        result = result.filter(p => p.supplier?.toLowerCase().includes('shopify'));
      } else if (filterSource === 'printful') {
        result = result.filter(p => p.supplier?.toLowerCase().includes('printful'));
      }
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'sale') {
        result = result.filter(p => p.onSale);
      } else if (filterStatus === 'low-stock') {
        result = result.filter(p => p.inventory < 10);
      } else if (filterStatus === 'no-stock') {
        result = result.filter(p => p.inventory === 0);
      }
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'price-low') {
      result.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
    } else if (sortBy === 'popular') {
      result.sort((a, b) => (b.sales || 0) - (a.sales || 0));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'profit') {
      result.sort((a, b) => 
        (parseFloat(b.price || 0) - parseFloat(b.cost || 0)) - 
        (parseFloat(a.price || 0) - parseFloat(a.cost || 0))
      );
    }

    setFilteredProducts(result);
  };

  useEffect(() => {
    applyFiltersAndSort(allProducts);
  }, [searchTerm, filterSource, filterStatus, sortBy]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePublish = async (product) => {
    if (selectedPlatforms.size === 0) {
      showNotification('Select at least one platform', 'error');
      return;
    }

    setPublishLoading(true);
    console.log('[Products] Publishing to platforms:', Array.from(selectedPlatforms));

    try {
      // ✅ ENSURE PRODUCT HAS IMAGE
      if (!product.image) {
        showNotification('❌ Product must have an image to publish', 'error');
        setPublishLoading(false);
        return;
      }

      const response = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productDescription: product.description || '',
          productPrice: product.price,
          imageUrl: product.image,
          platforms: Array.from(selectedPlatforms),
        }),
      });

      console.log('[Products] Response status:', response.status);
      const result = await response.json();
      console.log('[Products] Response:', result);

      if (!result || typeof result !== 'object') {
        console.error('[Products] Invalid response:', result);
        showNotification('❌ Invalid response from server', 'error');
        setPublishLoading(false);
        return;
      }

      if (result.success && result.results && Array.isArray(result.results)) {
        console.log('[Products] Published:', result);
        setPublishResults(result.results);
        const successCount = result.results.filter(r => r && r.success).length;
        showNotification(`✅ Published to ${successCount} platform(s)!`, 'success');
      } else {
        console.error('[Products] Publish error:', result.error);
        showNotification(`❌ Error: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('[Products] Error:', error);
      showNotification(`❌ Error publishing: ${error.message}`, 'error');
    } finally {
      setPublishLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setAllProducts(allProducts.filter(p => p.id !== id));
      setSelectedProduct(null);
      setShowDetails(false);
      showNotification('Product deleted!', 'success');
    } catch (err) {
      console.error('[Products] Error deleting:', err);
      showNotification('Error deleting product', 'error');
    }
  };

  const bulkDeleteProducts = async () => {
    if (!confirm(`Delete ${selectedProducts.size} products?`)) return;
    try {
      const batch = writeBatch(db);
      selectedProducts.forEach(id => {
        batch.delete(doc(db, 'products', id));
      });
      await batch.commit();
      
      setAllProducts(allProducts.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
      showNotification(`${selectedProducts.size} products deleted!`, 'success');
    } catch (err) {
      console.error('[Products] Error bulk deleting:', err);
      showNotification('Error deleting products', 'error');
    }
  };

  const bulkUpdateStatus = async (newStatus) => {
    try {
      const batch = writeBatch(db);
      selectedProducts.forEach(id => {
        batch.update(doc(db, 'products', id), { onSale: newStatus });
      });
      await batch.commit();
      
      await loadProducts(user.uid);
      setSelectedProducts(new Set());
      showNotification(`${selectedProducts.size} products updated!`, 'success');
    } catch (err) {
      console.error('[Products] Error bulk updating:', err);
      showNotification('Error updating products', 'error');
    }
  };

  const saveProduct = async () => {
    if (!formData.name || !formData.price) {
      showNotification('Product name and price required', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'products'), {
        name: formData.name,
        description: formData.description || '',
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        inventory: parseInt(formData.inventory) || 100,
        image: formData.image || '',
        category: formData.category || '',
        rating: 0,
        reviews: 0,
        sales: 0,
        views: 0,
        onSale: false,
        userId: user.uid,
        sellerName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        source: 'manual',
      });
      
      await loadProducts(user.uid);
      showNotification('Product added!', 'success');
      setShowModal(false);
      setFormData({});
      setImagePreview(null);
    } catch (err) {
      console.error('[Products] Error saving:', err);
      showNotification('Error saving product', 'error');
    }
  };

  const updateProduct = async () => {
    if (!formData.name || !formData.price) {
      showNotification('Product name and price required', 'error');
      return;
    }
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        inventory: parseInt(formData.inventory) || 0,
        image: formData.image,
        category: formData.category,
        onSale: formData.onSale || false,
        updatedAt: new Date().toISOString(),
      });

      await loadProducts(user.uid);
      setSelectedProduct(null);
      setShowEditModal(false);
      setFormData({});
      setImagePreview(null);
      showNotification('Product updated!', 'success');
    } catch (err) {
      console.error('[Products] Error updating:', err);
      showNotification('Error updating product', 'error');
    }
  };

  const handleEditClick = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price || '',
      cost: product.cost || '',
      inventory: product.inventory || 100,
      image: product.image || '',
      category: product.category || '',
      onSale: product.onSale || false,
    });
    setImagePreview(product.image || null);
    setShowEditModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setFormData({ ...formData, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateProductUrl = (product) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/p/${product.id}`;
  };

  const generateQRCode = (url) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    showNotification('✅ Copied to clipboard!', 'success');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const toggleProductSelection = (id) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const getSourceColor = (source, isTrending, supplier) => {
    if (isTrending) return 'bg-orange-900/50 text-orange-300';
    if (supplier?.includes('Shopify')) return 'bg-green-900/50 text-green-300';
    if (supplier?.includes('Printful')) return 'bg-blue-900/50 text-blue-300';
    return 'bg-gray-900/50 text-gray-300';
  };

  const getInventoryColor = (inventory) => {
    if (inventory === 0) return 'text-red-400';
    if (inventory < 10) return 'text-yellow-400';
    return 'text-green-400';
  };

  const stats = {
    total: allProducts.length,
    manual: allProducts.filter(p => !p.trendingSource && !p.supplier).length,
    trending: allProducts.filter(p => p.trendingSource).length,
    shopify: allProducts.filter(p => p.supplier?.includes('Shopify')).length,
    printful: allProducts.filter(p => p.supplier?.includes('Printful')).length,
    totalRevenue: allProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.sales || 0)), 0),
    totalProfit: allProducts.reduce((sum, p) => sum + ((p.price - p.cost) * (p.sales || 0)), 0),
    avgRating: allProducts.length > 0 ? (allProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / allProducts.length).toFixed(1) : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </a>
            <div>
              <h1 className="text-4xl font-bold text-white">📦 Products Hub</h1>
              <p className="text-gray-300">Manage products & publish to social media</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setFormData({ inventory: 100, onSale: false });
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-lg border flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' :
            notification.type === 'error' ? 'bg-red-900/30 border-red-500 text-red-200' :
            'bg-blue-900/30 border-blue-500 text-blue-200'
          }`}>
            {notification.type === 'success' && <Check size={20} />}
            {notification.type === 'error' && <AlertCircle size={20} />}
            {notification.message}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">📦 Total</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">✏️ Manual</p>
            <p className="text-2xl font-bold text-gray-300 mt-1">{stats.manual}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">🔥 Trending</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{stats.trending}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">🛍️ Shopify</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.shopify}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">📊 Revenue</p>
            <p className="text-2xl font-bold text-green-400 mt-1">${stats.totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">💰 Profit</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">${stats.totalProfit.toFixed(0)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">⭐ Avg Rating</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.avgRating}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs">📦 Printful</p>
            <p className="text-2xl font-bold text-blue-300 mt-1">{stats.printful}</p>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProducts.size > 0 && (
          <div className="mb-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedProducts.size === filteredProducts.length}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded"
              />
              <span className="text-white font-medium">{selectedProducts.size} selected</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => bulkUpdateStatus(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition"
              >
                Mark as Sale
              </button>
              <button
                onClick={() => bulkUpdateStatus(false)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition"
              >
                Remove Sale
              </button>
              <button
                onClick={bulkDeleteProducts}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1"
              >
                <Trash2 size={14} />
                Delete All
              </button>
            </div>
          </div>
        )}

        {/* Search, Filter & Sort */}
        <div className="mb-6 space-y-4 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-300 mb-2">📊 Source</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All ({stats.total})</option>
                <option value="manual">Manual ({stats.manual})</option>
                <option value="trending">Trending ({stats.trending})</option>
                <option value="shopify">Shopify ({stats.shopify})</option>
                <option value="printful">Printful ({stats.printful})</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">🏷️ Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="sale">On Sale</option>
                <option value="low-stock">Low Stock</option>
                <option value="no-stock">Out of Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">↕️ Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="profit">Most Profitable</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className={`bg-slate-800 rounded-lg border transition cursor-pointer ${
                selectedProducts.has(product.id) ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-700 hover:border-blue-500'
              } p-4 flex flex-col`}>
                {/* Checkbox */}
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="w-5 h-5 rounded"
                  />
                  {product.onSale && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">SALE</span>
                  )}
                </div>

                {/* Product Image */}
                {product.image && (
                  <div className="w-full h-40 overflow-hidden rounded-lg mb-4 bg-slate-700 relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Title */}
                <h3 className="font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>

                {/* Source Badge */}
                <div className="mb-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSourceColor(product.source, product.trendingSource, product.supplier)}`}>
                    {product.trendingSource ? '🔥 Trending' : product.supplier ? `📦 ${product.supplier}` : '✏️ Manual'}
                  </span>
                </div>

                {/* Analytics */}
                <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-700/50 rounded p-2 text-center">
                    <p className="text-gray-400">Sales</p>
                    <p className="text-yellow-400 font-bold">{product.sales || 0}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2 text-center">
                    <p className="text-gray-400">Views</p>
                    <p className="text-blue-400 font-bold">{product.views || 0}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded p-2 text-center">
                    <p className="text-gray-400">Rating</p>
                    <p className="text-yellow-400 font-bold">⭐{product.rating?.toFixed(1) || '0'}</p>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                )}

                {/* Price & Details */}
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Price:</span>
                    <span className="font-bold text-green-400">${parseFloat(product.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Stock:</span>
                    <span className={`font-bold ${getInventoryColor(product.inventory || 0)}`}>{product.inventory || 0}</span>
                  </div>
                  {product.cost && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Profit:</span>
                      <span className="text-blue-400 font-bold">${(parseFloat(product.price || 0) - parseFloat(product.cost)).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-700 mt-auto">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowPublishModal(true);
                      setSelectedPlatforms(new Set());
                      setPublishResults(null);
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm transition flex items-center justify-center gap-1"
                    title="Publish to social media"
                  >
                    <Share2 size={16} />
                    Publish
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowDetails(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm transition flex items-center justify-center gap-1"
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => handleEditClick(product)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm transition flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm transition"
                  >
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700 mb-8">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 mb-4">
              {searchTerm || filterSource !== 'all' || filterStatus !== 'all' ? 'No products match your filters' : 'No products yet'}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Your First Product
            </button>
          </div>
        )}

        {/* Publish Modal - FIXED */}
        {showPublishModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 my-auto">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Share2 size={24} />
                Publish Product
              </h2>

              {!publishResults ? (
                <>
                  <p className="text-gray-300 mb-4">Select platforms to publish "{selectedProduct.name}"</p>

                  {/* ✅ CHECK IF PRODUCT HAS IMAGE */}
                  {!selectedProduct.image && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      Product must have an image to publish
                    </div>
                  )}

                  {/* Platform Selection */}
                  <div className="space-y-3 mb-6">
                    {[
                      { id: 'pinterest', name: 'Pinterest', icon: '📌' },
                      { id: 'tiktok', name: 'TikTok Shop', icon: '🎵' },
                      { id: 'instagram', name: 'Instagram', icon: '📷' },
                      { id: 'facebook', name: 'Facebook', icon: '👥' },
                    ].map(platform => (
                      <label key={platform.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.has(platform.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedPlatforms);
                            if (newSelected.has(platform.id)) {
                              newSelected.delete(platform.id);
                            } else {
                              newSelected.add(platform.id);
                            }
                            setSelectedPlatforms(newSelected);
                          }}
                          disabled={!selectedProduct.image}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-2xl">{platform.icon}</span>
                        <span className="text-white font-medium">{platform.name}</span>
                      </label>
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPublishModal(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handlePublish(selectedProduct)}
                      disabled={publishLoading || selectedPlatforms.size === 0 || !selectedProduct.image}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 rounded transition flex items-center justify-center gap-2 font-bold"
                    >
                      {publishLoading ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Share2 size={16} />
                          Publish ({selectedPlatforms.size})
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {publishResults && Array.isArray(publishResults) && publishResults.map((result, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${
                        result && result.success 
                          ? 'bg-green-900/30 border-green-500 text-green-300'
                          : 'bg-red-900/30 border-red-500 text-red-300'
                      }`}>
                        <p className="font-semibold flex items-center gap-2">
                          {result && result.success ? <Check size={16} /> : <AlertCircle size={16} />}
                          {result?.platform || 'Unknown'}
                        </p>
                        <p className="text-xs mt-1">
                          {result && result.success ? '✅ Published successfully!' : `❌ ${result?.error || 'Unknown error'}`}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPublishModal(false)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition font-bold"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 my-auto">
              <h2 className="text-xl font-bold text-white mb-4">➕ Add New Product</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Product name *"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 h-20 resize-none"
                />
                <input
                  type="number"
                  placeholder="Price *"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Inventory"
                  value={formData.inventory || ''}
                  onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setFormData({});
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveProduct}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">✏️ Edit Product</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setFormData({});
                    setImagePreview(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Product name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 h-24 resize-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Inventory"
                  value={formData.inventory || ''}
                  onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.onSale || false}
                    onChange={(e) => setFormData({ ...formData, onSale: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white text-sm">Put on Sale</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">🖼️ Product Image</label>
                  {imagePreview && (
                    <div className="mb-3 relative">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, image: '' });
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:border-0 file:rounded file:cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-700">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setFormData({});
                    setImagePreview(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={updateProduct}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded transition flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetails && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">📊 Product Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                {selectedProduct.image && (
                  <div className="rounded-lg overflow-hidden">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-64 object-cover" />
                  </div>
                )}

                <div className="space-y-4 pb-6 border-b border-slate-700">
                  <div>
                    <p className="text-sm text-gray-400">Product Name</p>
                    <p className="text-2xl font-bold text-white">{selectedProduct.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-sm text-gray-400">Category</p>
                      <p className="text-white font-semibold">{selectedProduct.category || 'Uncategorized'}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3">
                      <p className="text-sm text-gray-400">Source</p>
                      <p className="text-white font-semibold">{selectedProduct.sourceLabel}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Price</p>
                      <p className="text-xl font-bold text-green-400">${parseFloat(selectedProduct.price || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Cost</p>
                      <p className="text-xl font-bold text-orange-400">${parseFloat(selectedProduct.cost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Profit Per Sale</p>
                    <p className="text-xl font-bold text-blue-400">${(parseFloat(selectedProduct.price || 0) - parseFloat(selectedProduct.cost || 0)).toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-4 pb-6 border-b border-slate-700">
                  <h3 className="text-lg font-bold text-white">📈 Analytics</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-700/50 rounded p-3 text-center">
                      <p className="text-gray-400 text-xs">Sales</p>
                      <p className="text-2xl font-bold text-yellow-400">{selectedProduct.sales || 0}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3 text-center">
                      <p className="text-gray-400 text-xs">Views</p>
                      <p className="text-2xl font-bold text-blue-400">{selectedProduct.views || 0}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3 text-center">
                      <p className="text-gray-400 text-xs">Rating</p>
                      <p className="text-2xl font-bold text-yellow-400">⭐{selectedProduct.rating?.toFixed(1) || '0'}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded p-3 text-center">
                      <p className="text-gray-400 text-xs">Stock</p>
                      <p className={`text-2xl font-bold ${getInventoryColor(selectedProduct.inventory || 0)}`}>{selectedProduct.inventory || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-6 border-b border-slate-700">
                  <h3 className="text-lg font-bold text-white">🔗 Product Links</h3>

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">Direct Product Link</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={generateProductUrl(selectedProduct)}
                        readOnly
                        className="flex-1 bg-slate-600 text-blue-400 text-sm px-3 py-2 rounded font-mono"
                      />
                      <button
                        onClick={() => handleCopyUrl(generateProductUrl(selectedProduct))}
                        className="text-gray-400 hover:text-white transition p-2"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-400 flex items-center gap-1 mb-1">
                        <QrCode size={16} />
                        QR Code
                      </p>
                      <p className="text-xs text-gray-500">Scan with phone</p>
                    </div>
                    <img
                      src={generateQRCode(generateProductUrl(selectedProduct))}
                      alt="QR Code"
                      className="w-20 h-20 bg-white p-1 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-700">
                <button
                  onClick={() => setShowDetails(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    handleEditClick(selectedProduct);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded transition flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    deleteProduct(selectedProduct.id);
                    setShowDetails(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded transition flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
