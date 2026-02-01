'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Search, Plus, Trash2, Eye, ArrowLeft, Package, Copy, Edit, Check, AlertCircle, QrCode, Save, X } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [notification, setNotification] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProducts(currentUser.uid);
      }
    });
    return unsubscribe;
  }, []);

  const loadProducts = async (userId) => {
    try {
      setLoading(true);
      const products = [];

      // Load all products from Firestore (manual + from trending)
      const q = query(collection(db, 'products'), where('userId', '==', userId));
      const snap = await getDocs(q);
      
      snap.docs.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
          source: data.source || (data.trendingSource ? 'trending' : 'manual'),
          sourceLabel: data.trendingSource ? '🔥 Trending' : (data.supplier ? `📦 ${data.supplier}` : '✏️ Manual'),
        });
      });

      console.log('[Products] Loaded', products.length, 'products');
      setAllProducts(products);
      setFilteredProducts(products);
    } catch (err) {
      console.error('Error loading products:', err);
      showNotification('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    let result = [...allProducts];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.name || '')?.toLowerCase().includes(term) ||
        (p.supplier || '')?.toLowerCase().includes(term) ||
        (p.description || '')?.toLowerCase().includes(term)
      );
    }

    // Apply source filter
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

    setFilteredProducts(result);
  }, [searchTerm, filterSource, allProducts]);

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setAllProducts(allProducts.filter(p => p.id !== id));
      setSelectedProduct(null);
      setShowDetails(false);
      showNotification('Product deleted!', 'success');
    } catch (err) {
      console.error('Error deleting:', err);
      showNotification('Error deleting product', 'error');
    }
  };

  const saveProduct = async () => {
    if (!formData.name) {
      showNotification('Product name required', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        source: 'manual',
      });
      await loadProducts(user.uid);
      showNotification('Product added!', 'success');
      setShowModal(false);
      setFormData({});
    } catch (err) {
      console.error('Error saving:', err);
      showNotification('Error saving product', 'error');
    }
  };

  const updateProduct = async () => {
    if (!formData.name) {
      showNotification('Product name required', 'error');
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
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      const updated = allProducts.map(p =>
        p.id === selectedProduct.id ? { ...p, ...formData } : p
      );
      setAllProducts(updated);
      setSelectedProduct(null);
      setShowEditModal(false);
      setFormData({});
      setImagePreview(null);
      showNotification('Product updated!', 'success');
    } catch (err) {
      console.error('Error updating:', err);
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
    return `${window.location.origin}/p/${product.id || Date.now()}`;
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

  const getSourceColor = (source, isTrending, supplier) => {
    if (isTrending) return 'bg-orange-900/50 text-orange-300';
    if (supplier?.includes('Shopify')) return 'bg-green-900/50 text-green-300';
    if (supplier?.includes('Printful')) return 'bg-blue-900/50 text-blue-300';
    return 'bg-gray-900/50 text-gray-300';
  };

  const stats = {
    total: allProducts.length,
    manual: allProducts.filter(p => !p.trendingSource && !p.supplier).length,
    trending: allProducts.filter(p => p.trendingSource).length,
    shopify: allProducts.filter(p => p.supplier?.includes('Shopify')).length,
    printful: allProducts.filter(p => p.supplier?.includes('Printful')).length,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white">📦 Products</h1>
              <p className="text-gray-300">Manage all your products - create, edit, delete</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setFormData({ status: 'active', inventory: 100 });
              setEditMode(false);
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
          <div className={`mb-6 p-4 rounded-lg border ${
            notification.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' :
            notification.type === 'error' ? 'bg-red-900/30 border-red-500 text-red-200' :
            'bg-blue-900/30 border-blue-500 text-blue-200'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">📦 Total</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">✏️ Manual</p>
            <p className="text-3xl font-bold text-gray-300 mt-1">{stats.manual}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">🔥 Trending</p>
            <p className="text-3xl font-bold text-orange-400 mt-1">{stats.trending}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">🛍️ Shopify</p>
            <p className="text-3xl font-bold text-green-400 mt-1">{stats.shopify}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">📦 Printful</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{stats.printful}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 space-y-4 bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
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

            {/* Filter */}
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
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col hover:border-blue-500 transition">
                {/* Product Image */}
                {product.image && (
                  <div className="w-full h-40 overflow-hidden rounded-lg mb-4 bg-slate-700">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Title */}
                <h3 className="font-semibold text-white mb-2">{product.name}</h3>

                {/* Source Badge */}
                <div className="mb-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getSourceColor(product.source, product.trendingSource, product.supplier)}`}>
                    {product.trendingSource ? '🔥 Trending' : product.supplier ? `📦 ${product.supplier}` : '✏️ Manual'}
                  </span>
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
                  {product.inventory && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Stock:</span>
                      <span className="text-white">{product.inventory}</span>
                    </div>
                  )}
                  {product.cost && (
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Cost:</span>
                      <span className="text-orange-400">${parseFloat(product.cost).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
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
              {searchTerm || filterSource !== 'all' ? 'No products match' : 'No products yet'}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {searchTerm || filterSource !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterSource('all');
                  }}
                  className="text-blue-400 hover:underline"
                >
                  Clear filters
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-blue-400 hover:underline"
                  >
                    Add product →
                  </button>
                  <span className="text-gray-600">•</span>
                  <Link href="/trending" className="text-blue-400 hover:underline">
                    Browse trending →
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 my-auto">
              <h2 className="text-xl font-bold text-white mb-4">Add New Product</h2>
              <div className="space-y-4">
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
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 h-20 resize-none"
                />
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
                <input
                  type="number"
                  placeholder="Inventory"
                  value={formData.inventory || ''}
                  onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
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
                {/* Product Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Product Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 h-24 resize-none"
                  />
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">💰 Price</label>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">📉 Cost</label>
                    <input
                      type="number"
                      value={formData.cost || ''}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Inventory */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">📦 Inventory</label>
                  <input
                    type="number"
                    value={formData.inventory || ''}
                    onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">📂 Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Image */}
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
                  <p className="text-xs text-gray-500 mt-1">Upload new image or leave empty to keep current</p>
                </div>
              </div>

              {/* Action Buttons */}
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
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full border border-slate-700 my-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">📊 Product Details</h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Product Image */}
              {selectedProduct.image && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-64 object-cover" />
                </div>
              )}

              {/* Product Info */}
              <div className="space-y-4 mb-6 pb-6 border-b border-slate-700">
                <div>
                  <p className="text-sm text-gray-400">Product Name</p>
                  <p className="text-2xl font-bold text-white">{selectedProduct.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Price</p>
                    <p className="text-xl font-bold text-green-400">${parseFloat(selectedProduct.price || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cost</p>
                    <p className="text-xl font-bold text-orange-400">${parseFloat(selectedProduct.cost || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Profit</p>
                    <p className="text-xl font-bold text-blue-400">${(parseFloat(selectedProduct.price || 0) - parseFloat(selectedProduct.cost || 0)).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-bold text-white">🔗 Product Links</h3>

                {/* Direct Link */}
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

                {/* Facebook Link */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Facebook Ads</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${generateProductUrl(selectedProduct)}?utm_source=facebook&utm_medium=ads`}
                      readOnly
                      className="flex-1 bg-slate-600 text-blue-400 text-xs px-3 py-2 rounded font-mono"
                    />
                    <button
                      onClick={() => handleCopyUrl(`${generateProductUrl(selectedProduct)}?utm_source=facebook&utm_medium=ads`)}
                      className="text-gray-400 hover:text-white transition p-2"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* TikTok Link */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">TikTok Bio</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${generateProductUrl(selectedProduct)}?utm_source=tiktok`}
                      readOnly
                      className="flex-1 bg-slate-600 text-blue-400 text-xs px-3 py-2 rounded font-mono"
                    />
                    <button
                      onClick={() => handleCopyUrl(`${generateProductUrl(selectedProduct)}?utm_source=tiktok`)}
                      className="text-gray-400 hover:text-white transition p-2"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <QrCode size={16} />
                      QR Code
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Scan with phone</p>
                  </div>
                  <img
                    src={generateQRCode(generateProductUrl(selectedProduct))}
                    alt="QR Code"
                    className="w-20 h-20 bg-white p-1 rounded"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
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
                  Edit Product
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
