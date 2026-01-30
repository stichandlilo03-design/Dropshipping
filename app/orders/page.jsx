'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, Eye, MoreVertical, Check, Clock, AlertCircle, Trash2, Edit2, Plus, ArrowLeft } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Orders() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
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
    loadOrders(currentUser.id);
  }, [router]);

  const loadOrders = (userId) => {
    const userOrders = db.getOrders(userId);
    setOrders(userOrders);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check size={16} className="text-green-500" />;
      case 'processing':
        return <Clock size={16} className="text-yellow-500" />;
      case 'shipped':
        return <Check size={16} className="text-blue-500" />;
      case 'pending':
        return <AlertCircle size={16} className="text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-400';
      case 'pending':
        return 'bg-orange-500/10 text-orange-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalCost = filteredOrders.reduce((sum, o) => sum + (o.cost || 0), 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.profit || 0), 0);

  const deleteOrder = (id) => {
    db.deleteOrder(id);
    loadOrders(user.id);
  };

  const saveOrder = () => {
    if (editMode && selectedOrder) {
      db.updateOrder(selectedOrder.id, formData);
    } else {
      if (!user) return;
      const newOrder = {
        number: `#${Math.floor(Math.random() * 100000)}`,
        ...formData,
        status: 'pending',
      };
      db.addOrder(newOrder, user.id);
    }
    loadOrders(user.id);
    setShowModal(false);
    setEditMode(false);
    setFormData({});
    setSelectedOrder(null);
  };

  const updateOrderStatus = (id, newStatus) => {
    db.updateOrder(id, { status: newStatus });
    loadOrders(user.id);
    setShowModal(false);
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setFormData(order);
    setEditMode(true);
    setShowModal(true);
  };

  const openAddModal = () => {
    setSelectedOrder(null);
    setFormData({ customer: '', email: '', amount: '', cost: '', items: '', address: '' });
    setEditMode(false);
    setShowModal(true);
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading orders...</p>
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
              <h1 className="text-2xl font-bold text-white">Orders</h1>
              <p className="text-xs text-gray-400">Manage and track all orders</p>
            </div>
          </div>
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <Plus size={20} />
            Add Order
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <p className="text-gray-400 mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-white">{totalOrders}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-accent">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Total Cost</p>
            <p className="text-3xl font-bold text-orange-400">${totalCost.toFixed(2)}</p>
          </div>
          <div className="card">
            <p className="text-gray-400 mb-2">Total Profit</p>
            <p className="text-3xl font-bold text-green-400">${totalProfit.toFixed(2)}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Order</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Revenue</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Profit</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Items</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-white">{order.number}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.customer}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.email}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-accent">${order.amount?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-orange-400">${order.cost?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">${order.profit?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.items}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowModal(true);
                              setEditMode(false);
                            }}
                            className="p-2 hover:bg-gray-700 rounded transition"
                            title="View"
                          >
                            <Eye size={16} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-2 hover:bg-gray-700 rounded transition"
                            title="Edit"
                          >
                            <Edit2 size={16} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="p-2 hover:bg-gray-700 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-400">
                      No orders found. {orders.length === 0 && <span>Start by adding your first order!</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editMode ? 'Edit Order' : selectedOrder ? 'Order Details' : 'Add New Order'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedOrder(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {!selectedOrder || editMode ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    className="input-field"
                    value={formData.customer || ''}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="input-field"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Amount ($)"
                    className="input-field"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Cost ($)"
                    className="input-field"
                    value={formData.cost || ''}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Items"
                    className="input-field"
                    value={formData.items || ''}
                    onChange={(e) => setFormData({ ...formData, items: parseInt(e.target.value) })}
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    className="input-field"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    <button onClick={saveOrder} className="flex-1 btn btn-primary">
                      {editMode ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Customer</p>
                      <p className="text-white font-semibold">{selectedOrder.customer}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white font-semibold">{selectedOrder.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-gray-400 text-sm mb-2">Financial Details</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">Revenue</p>
                        <p className="text-accent text-lg font-bold">${selectedOrder.amount?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Cost</p>
                        <p className="text-orange-400 text-lg font-bold">${selectedOrder.cost?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Profit</p>
                        <p className="text-green-400 text-lg font-bold">${selectedOrder.profit?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-4">
                    <p className="text-gray-400 text-sm mb-3">Update Status</p>
                    <div className="flex gap-2">
                      {['pending', 'processing', 'shipped', 'completed'].map(status => (
                        <button
                          key={status}
                          onClick={() => updateOrderStatus(selectedOrder.id, status)}
                          className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition ${
                            selectedOrder.status === status
                              ? 'bg-accent text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 btn btn-secondary"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => openEditModal(selectedOrder)}
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

