'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, AlertCircle, Check, Edit2, Trash2, Zap, Clock, ArrowLeft } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Suppliers() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
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
    loadSuppliers(currentUser.id);
  }, [router]);

  const loadSuppliers = (userId) => {
    const userSuppliers = db.getSuppliers(userId);
    setSuppliers(userSuppliers);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/10 text-green-400 border border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      case 'disconnected':
        return 'bg-red-500/10 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <Check size={20} className="text-green-500" />;
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-500" />;
      case 'disconnected':
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  const deleteSupplier = (id) => {
    db.deleteSupplier(id);
    loadSuppliers(user.id);
  };

  const saveSupplier = () => {
    if (editingSupplier) {
      db.updateSupplier(editingSupplier.id, formData);
    } else {
      if (!user) return;
      db.addSupplier(formData, user.id);
    }
    loadSuppliers(user.id);
    setShowAddModal(false);
    setEditingSupplier(null);
    setFormData({});
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', type: '', products: '', avgCost: '', status: 'connected' });
    setShowAddModal(true);
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  const totalOrders = suppliers.reduce((sum, s) => sum + (s.orders || 0), 0);
  const totalProducts = suppliers.reduce((sum, s) => sum + (s.products || 0), 0);
  const avgCost = suppliers.length > 0 ? (suppliers.reduce((sum, s) => sum + (s.avgCost || 0), 0) / suppliers.length).toFixed(2) : 0;
  const healthySuppliers = suppliers.filter(s => s.status === 'connected').length;

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
              <h1 className="text-2xl font-bold text-white">Suppliers</h1>
              <p className="text-xs text-gray-400">Manage supplier integrations and sync</p>
            </div>
          </div>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} />
            Add Supplier
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <p className="text-gray-400 mb-2">Total Suppliers</p>
            <p className="text-3xl font-bold text-white">{suppliers.length}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-accent">{totalOrders}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Total Products</p>
            <p className="text-3xl font-bold text-emerald-400">{totalProducts}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Healthy</p>
            <p className="text-3xl font-bold text-green-400">{healthySuppliers}/{suppliers.length}</p>
          </div>
        </div>

        {/* Supplier Cards */}
        {suppliers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="card border-l-4 border-l-accent">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{supplier.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{supplier.type}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${getStatusColor(supplier.status)}`}>
                    {getStatusIcon(supplier.status)}
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4 pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap size={16} className={supplier.status === 'connected' ? 'text-green-400' : 'text-yellow-400'} />
                    <span>
                      API Health:{' '}
                      <span className={supplier.status === 'connected' ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                        {supplier.status === 'connected' ? 'Healthy' : 'Degraded'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                    <Clock size={14} />
                    <span>Last sync: {supplier.lastSync ? new Date(supplier.lastSync).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Orders</span>
                    <span className="font-bold text-white">{supplier.orders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Active Products</span>
                    <span className="font-bold text-white">{supplier.products || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Avg Cost</span>
                    <span className="font-bold text-accent">${(supplier.avgCost || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-700">
                  <button className="flex-1 btn btn-secondary text-sm">Sync</button>
                  <button
                    onClick={() => openEditModal(supplier)}
                    className="flex-1 btn btn-secondary text-sm"
                  >
                    <Edit2 size={16} className="mx-auto" />
                  </button>
                  <button
                    onClick={() => deleteSupplier(supplier.id)}
                    className="flex-1 btn btn-danger text-sm"
                  >
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No suppliers yet</h3>
            <p className="text-gray-400 mb-4">Start by adding your first supplier</p>
            <button onClick={openAddModal} className="btn btn-primary">Add Supplier</button>
          </div>
        )}

        {/* Integration Setup Guides */}
        {suppliers.length === 0 && (
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-6">Popular Supplier Integrations</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Printful */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="font-bold text-white mb-2">Printful</h4>
                <ol className="text-sm text-gray-400 space-y-2 mb-4">
                  <li>1. Go to Printful Dashboard</li>
                  <li>2. Navigate to Account → API</li>
                  <li>3. Copy your API Key</li>
                  <li>4. Add supplier above</li>
                </ol>
              </div>

              {/* Spocket */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="font-bold text-white mb-2">Spocket</h4>
                <ol className="text-sm text-gray-400 space-y-2 mb-4">
                  <li>1. Go to Spocket Dashboard</li>
                  <li>2. Click Settings → API</li>
                  <li>3. Generate API token</li>
                  <li>4. Add supplier above</li>
                </ol>
              </div>

              {/* AliExpress */}
              <div className="border border-gray-700 rounded-lg p-4">
                <h4 className="font-bold text-white mb-2">AliExpress</h4>
                <ol className="text-sm text-gray-400 space-y-2 mb-4">
                  <li>1. Go to Seller Center</li>
                  <li>2. Setup dropshipping</li>
                  <li>3. Get supplier ID</li>
                  <li>4. Add supplier above</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Supplier Name"
                  className="input-field"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <select
                  className="input-field"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Select Type</option>
                  <option>POD</option>
                  <option>Dropshipping</option>
                </select>
                <input
                  type="number"
                  placeholder="Average Cost"
                  className="input-field"
                  value={formData.avgCost || ''}
                  onChange={(e) => setFormData({ ...formData, avgCost: parseFloat(e.target.value) })}
                />
                <input
                  type="number"
                  placeholder="Products"
                  className="input-field"
                  value={formData.products || ''}
                  onChange={(e) => setFormData({ ...formData, products: parseInt(e.target.value) })}
                />
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingSupplier(null);
                    }}
                    className="flex-1 btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button onClick={saveSupplier} className="flex-1 btn btn-primary">
                    {editingSupplier ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

