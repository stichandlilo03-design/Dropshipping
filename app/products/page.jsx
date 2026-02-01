'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Plus, Trash2, Eye, ArrowLeft, Package, Copy, Edit, Check, AlertCircle, QrCode, Save, X, Share2, Download, Upload, BarChart3, Star, TrendingUp, Heart, ShoppingCart, DollarSign, Zap } from 'lucide-react';

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
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [notification, setNotification] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

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
    if (!formData.name || !formData.price || !formData.category) {
      showNotification('Product name, price, and category are required', 'error');
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
        sku: formData.sku || '',
        supplier: formData.supplier || '',
        tags: formData.tags || '',
        weight: parseFloat(formData.weight) || 0,
        dimensions: formData.dimensions || '',
        rating: 0,
        reviews: 0,
        sales: 0,
        views: 0,
        onSale: formData.onSale || false,
        userId: user.uid,
        sellerName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        source: 'manual',
      });
      
      await loadProducts(user.uid);
      showNotification('✅ Product created successfully!', 'success');
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
        sku: formData.sku,
        supplier: formData.supplier,
        tags: formData.tags,
        weight: parseFloat(formData.weight) || 0,
        dimensions: formData.dimensions,
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
      sku: product.sku || '',
      supplier: product.supplier || '',
      tags: product.tags || '',
      weight: product.weight || '',
      dimensions: product.dimensions || '',
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
              <p className="text-gray-300">Create, manage, and analyze your product inventory</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setFormData({ inventory: 100, onSale: false });
              setImagePreview(null);
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

        {/* Advanced Stats Grid */}
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

                {product.image && (
                  <div className="w-full h-40 overflow-hidden rounded-lg mb-4 bg-slate-700 relative">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <h3 className="font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>

                <div className="mb-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSourceColor(product.source, product.trendingSource, product.supplier)}`}>
                    {product.trendingSource ? '🔥 Trending' : product.supplier ? `📦 ${product.supplier}` : '✏️ Manual'}
                  </span>
                </div>

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

                {product.description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{product.description}</p>
                )}

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

                <div className="flex gap-2 pt-4 border-t border-slate-700 mt-auto">
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

        {/* ADD MODAL - ENHANCED WITH ALL FEATURES */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Plus size={24} />
                  Add New Product
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({});
                    setImagePreview(null);
                  }}
                  className="text-white hover:bg-blue-500 rounded-lg p-2 transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                
                {/* Product Image Section */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">🖼️ Product Image</label>
                  {imagePreview ? (
                    <div className="relative rounded-lg overflow-hidden mb-3">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, image: '' });
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg p-6 text-center mb-3 hover:border-blue-500 transition">
                      <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-400 text-sm">Drop image here or click to browse</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 file:bg-blue-600 file:text-white file:px-4 file:py-2 file:border-0 file:rounded file:cursor-pointer"
                  />
                  <p className="text-xs text-gray-400 mt-2">Recommended: 800x800px, JPG/PNG, max 5MB</p>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Package size={20} />
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Product name *"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                    <textarea
                      placeholder="Product description (detailed, helps with SEO)"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 h-24 resize-none text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Category *"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="SKU (optional)"
                        value={formData.sku || ''}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing & Cost */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <DollarSign size={20} />
                    Pricing & Cost
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Selling Price *</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          value={formData.price || ''}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Cost Price</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          value={formData.cost || ''}
                          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    {formData.price && formData.cost && (
                      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3">
                        <p className="text-sm text-blue-200">
                          💰 Profit per sale: <span className="font-bold text-green-400">${(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inventory */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Package size={20} />
                    Inventory & Stock
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Quantity in Stock</label>
                      <input
                        type="number"
                        placeholder="100"
                        value={formData.inventory || ''}
                        onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700/75 transition">
                      <input
                        type="checkbox"
                        checked={formData.onSale || false}
                        onChange={(e) => setFormData({ ...formData, onSale: e.target.checked })}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                      <span className="text-white font-medium">🏷️ Put on Sale</span>
                    </label>
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <BarChart3 size={20} />
                    Additional Details
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Supplier (optional)"
                      value={formData.supplier || ''}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    />
                    <textarea
                      placeholder="Tags (comma separated, e.g: electronics, gadgets, new)"
                      value={formData.tags || ''}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 h-16 resize-none text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Weight (lbs)"
                        step="0.1"
                        value={formData.weight || ''}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Dimensions (L×W×H)"
                        value={formData.dimensions || ''}
                        onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Required Fields Note */}
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
                  <p className="text-sm text-yellow-200">⚠️ Fields marked with * are required</p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-700 bg-slate-900/50 px-6 py-4 flex gap-3 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({});
                    setImagePreview(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  onClick={saveProduct}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Create Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit & Details Modals (same as before) */}
        {/* ... (keep the existing Edit Modal and Details Modal code) ... */}
      </div>
    </div>
  );
}
