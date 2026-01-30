'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Edit2, Trash2, Eye, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Products() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    loadProducts(currentUser.id);
  }, [router]);

  const loadProducts = (userId) => {
    const userProducts = db.getProducts(userId);
    setProducts(userProducts);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400';
      case 'low_stock':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'out_of_stock':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Check size={16} className="text-green-500" />;
      case 'low_stock':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'out_of_stock':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const determineStatus = (inventory) => {
    if (inventory === 0) return 'out_of_stock';
    if (inventory <= 10) return 'low_stock';
    return 'active';
  };

  const filteredProducts = products.filter((product) =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = products.length;
  const activeProducts = products.filter(p => determineStatus(p.inventory) === 'active').length;
  const totalInventory = products.reduce((sum, p) => sum + (p.inventory || 0), 0);
  const totalRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * 10), 0);

  const deleteProduct = (id) => {
    db.deleteProduct(id);
    loadProducts(user.id);
  };

  const saveProduct = () => {
    if (editMode && selectedProduct) {
      db.updateProduct(selectedProduct.id, formData);
    } else {
      if (!user) return;
      db.addProduct(formData, user.id);
    }
    loadProducts(user.id);
    setShowModal(false);
    setEditMode(false);
    setFormData({});
    setSelectedProduct(null);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData(product);
    setEditMode(true);
    setShowModal(true);
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData({ name: '', sku: '', price: '', cost: '', inventory: '', category: 'Apparel' });
    setEditMode(false);
    setShowModal(true);
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading products...</p>
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
              <h1 className="text-2xl font-bold text-white">Products</h1>
              <p className="text-xs text-gray-400">Manage inventory and profit margins</p>
            </div>
          </div>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <p className="text-gray-400 mb-2">Total Products</p>
            <p className="text-3xl font-bold text-white">{totalProducts}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Active Products</p>
            <p className="text-3xl font-bold text-green-400">{activeProducts}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Total Inventory</p>
            <p className="text-3xl font-bold text-accent">{totalInventory}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Est. Revenue</p>
            <p className="text-3xl font-bold text-emerald-400">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div key={product.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                    <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(determineStatus(product.inventory))}`}>
                    {getStatusIcon(determineStatus(product.inventory))}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-4 pb-4 border-b border-gray-700">{product.category || 'General'}</p>

                <div className="space-y-2 mb-4 pb-4 border-b border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="font-semibold text-accent">${product.price?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cost:</span>
                    <span className="text-sm text-orange-400">${product.cost?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Margin:</span>
                    <span className="font-semibold text-green-400">{product.margin}%</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Inventory: {product.inventory}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-accent rounded-full h-2"
                        style={{ width: `${Math.min((product.inventory || 0) / 3, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowModal(true);
                      setEditMode(false);
                    }}
                    className="flex-1 btn btn-secondary text-sm"
                    title="View"
                  >
                    <Eye size={16} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => openEditModal(product)}
                    className="flex-1 btn btn-secondary text-sm"
                    title="Edit"
                  >
                    <Edit2 size={16} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="flex-1 btn btn-danger text-sm"
                    title="Delete"
                  >
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>No products found. Start by adding your first product!</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full max-h-96 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                {editMode ? 'Edit Product' : selectedProduct ? 'Product Details' : 'Add New Product'}
              </h2>

              {!selectedProduct || editMode ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Product Name"
                    className="input-field"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="SKU"
                    className="input-field"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    className="input-field"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    className="input-field"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Inventory"
                    className="input-field"
                    value={formData.inventory || ''}
                    onChange={(e) => setFormData({ ...formData, inventory: parseInt(e.target.value) })}
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    className="input-field"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditMode(false);
                      }}
                      className="flex-1 btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button onClick={saveProduct} className="flex-1 btn btn-primary">
                      {editMode ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-sm">Name</p>
                    <p className="text-white font-semibold">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Price</p>
                    <p className="text-accent font-semibold">${selectedProduct.price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Inventory</p>
                    <p className="text-white font-semibold">{selectedProduct.inventory}</p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 btn btn-secondary"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => openEditModal(selectedProduct)}
                      className="flex-1 btn btn-primary"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Package } from 'lucide-react';

