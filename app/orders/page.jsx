'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, Eye, MoreVertical, Check, Clock, AlertCircle, Trash2, Edit2, Plus, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [loading, setLoading] = useState(true);

  // Check auth and load orders
  useEffect(() => {
    setMounted(true);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      console.log('[Orders] User authenticated:', currentUser.uid);
      setUser(currentUser);
      await loadOrders(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  // Load orders from Firestore
  const loadOrders = async (userId) => {
    try {
      console.log('[Orders] Loading orders for user:', userId);
      setLoading(true);

      // Query all orders collection (public orders from checkout)
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef);
      const querySnapshot = await getDocs(q);

      const allOrders = [];
      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        // Show all orders - checkout orders show as pending_payment
        allOrders.push({
          id: doc.id,
          ...orderData,
          profit: (orderData.total || 0) - (orderData.shipping || 0),
        });
      });

      console.log('[Orders] Loaded orders:', allOrders.length);
      setOrders(allOrders);
      setLoading(false);
    } catch (err) {
      console.error('[Orders] Error loading orders:', err);
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Check size={16} className="text-green-500" />;
      case 'processing':
        return <Clock size={16} className="text-yellow-500" />;
      case 'shipped':
        return <Check size={16} className="text-blue-500" />;
      case 'pending':
      case 'pending_payment':
        return <AlertCircle size={16} className="text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-green-500/10 text-green-400';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-400';
      case 'pending':
      case 'pending_payment':
        return 'bg-orange-500/10 text-orange-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const getDisplayStatus = (status) => {
    if (status === 'pending_payment') return 'Pending Payment';
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCost = filteredOrders.reduce((sum, o) => sum + (o.shipping || 0), 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + ((o.total || 0) - (o.shipping || 0)), 0);

  const deleteOrder = async (id) => {
    try {
      await deleteDoc(doc(db, 'orders', id));
      console.log('[Orders] Order deleted:', id);
      if (user) await loadOrders(user.uid);
      setShowModal(false);
    } catch (err) {
      console.error('[Orders] Error deleting order:', err);
    }
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', id), { 
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      console.log('[Orders] Order status updated:', id, newStatus);
      if (user) await loadOrders(user.uid);
      setShowModal(false);
    } catch (err) {
      console.error('[Orders] Error updating order:', err);
    }
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setFormData(order);
    setEditMode(true);
    setShowModal(true);
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">📋 Orders</h1>
              <p className="text-xs text-gray-400">Manage customer orders and payments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 mb-2">Total Orders</p>
            <p className="text-3xl font-bold text-white">{totalOrders}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 mb-2">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-400">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 mb-2">Total Shipping Cost</p>
            <p className="text-3xl font-bold text-orange-400">${totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
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
              placeholder="Search by customer, email, or product..."
              className="w-full px-4 py-2 pl-10 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Shipping</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-white">{order.customerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{order.customerEmail}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-400">${order.total?.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-orange-400">${order.shipping?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {getDisplayStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setEditMode(false);
                              setShowModal(true);
                            }}
                            className="p-2 hover:bg-slate-600 rounded transition"
                            title="View"
                          >
                            <Eye size={16} className="text-gray-400" />
                          </button>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="p-2 hover:bg-slate-600 rounded transition"
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
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                      No orders found. {orders.length === 0 && <span>Orders from checkout will appear here.</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-8 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Order Details</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedOrder(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Customer</p>
                    <p className="text-white font-semibold">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white font-semibold">{selectedOrder.customerEmail}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="text-white font-semibold">{selectedOrder.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Product</p>
                    <p className="text-white font-semibold">{selectedOrder.productName}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Address</p>
                  <p className="text-white font-semibold">{selectedOrder.customerAddress}</p>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-gray-400 text-sm mb-3">Financial Details</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-xs">Subtotal</p>
                      <p className="text-blue-400 text-lg font-bold">${selectedOrder.subtotal?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Tax</p>
                      <p className="text-yellow-400 text-lg font-bold">${selectedOrder.tax?.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Total</p>
                      <p className="text-green-400 text-lg font-bold">${selectedOrder.total?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-gray-400 text-sm mb-3">Update Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['pending_payment', 'paid', 'processing', 'shipped', 'completed'].map(status => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className={`py-2 px-3 rounded text-sm font-semibold transition ${
                          selectedOrder.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                      >
                        {getDisplayStatus(status)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => deleteOrder(selectedOrder.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
                  >
                    Delete Order
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
