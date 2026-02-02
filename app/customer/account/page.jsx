'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Settings, ShoppingCart, Package, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function CustomerAccountContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      console.log('[CustomerAccount] Starting load...');
      setLoading(true);

      // Get customer from localStorage
      const customerData = localStorage.getItem('customer');
      if (!customerData) {
        console.log('[CustomerAccount] No customer found, redirecting to login');
        router.push('/customer/login');
        return;
      }

      const parsedCustomer = JSON.parse(customerData);
      console.log('[CustomerAccount] Customer loaded:', parsedCustomer.id);
      setCustomer(parsedCustomer);

      // Load orders using Firestore query
      await loadCustomerOrders(parsedCustomer.id);
      setLoading(false);
    } catch (error) {
      console.error('[CustomerAccount] Error:', error);
      setLoading(false);
    }
  };

  const loadCustomerOrders = async (customerId) => {
    try {
      console.log('[CustomerAccount] Loading orders for customerId:', customerId);

      // Query orders by customerId
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('customerId', '==', customerId));
      const querySnapshot = await getDocs(q);

      const loadedOrders = [];
      querySnapshot.forEach((doc) => {
        loadedOrders.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log('[CustomerAccount] Orders found:', loadedOrders.length);

      // Sort by date (newest first)
      loadedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setOrders(loadedOrders);
      applyFilters(loadedOrders, 'all', '');
    } catch (error) {
      console.error('[CustomerAccount] Error loading orders:', error);
      setOrders([]);
    }
  };

  useEffect(() => {
    applyFilters(orders, filterStatus, searchTerm);
  }, [filterStatus, searchTerm, orders]);

  const applyFilters = (ordersList, status, search) => {
    let filtered = ordersList;

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter((order) => order.status === status);
    }

    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((order) => {
        return (
          (order.id && order.id.toLowerCase().includes(searchLower)) ||
          (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
          (order.items && order.items.some((item) => 
            item.productName.toLowerCase().includes(searchLower)
          ))
        );
      });
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status) => {
    const statusStr = String(status || '').toLowerCase();

    if (statusStr === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-600/20 text-green-400">
          <CheckCircle size={16} />
          Paid
        </span>
      );
    }

    if (statusStr === 'pending_payment') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-600/20 text-yellow-400">
          <Clock size={16} />
          Pending
        </span>
      );
    }

    if (statusStr === 'cancelled_payment') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-600/20 text-red-400">
          <XCircle size={16} />
          Cancelled
        </span>
      );
    }

    if (statusStr === 'processing') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-blue-600/20 text-blue-400">
          <Clock size={16} />
          Processing
        </span>
      );
    }

    if (statusStr === 'shipped') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-blue-600/20 text-blue-400">
          <Package size={16} />
          Shipped
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-gray-600/20 text-gray-400">
        {status}
      </span>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to view your account</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">👤 My Account</h1>
              <p className="text-xs text-gray-400">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Profile Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Full Name</p>
              <p className="text-white font-semibold">{customer.firstName} {customer.lastName || ''}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white font-semibold">{customer.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Phone</p>
              <p className="text-white font-semibold">{customer.phone || 'Not added'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Customer ID</p>
              <p className="text-white font-mono text-sm">{customer.id?.substring(0, 12)}...</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{orders.length}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Paid</p>
            <p className="text-3xl font-bold text-green-400 mt-2">
              {orders.filter((o) => o.status === 'paid').length}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">
              {orders.filter((o) => o.status === 'pending_payment').length}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Cancelled</p>
            <p className="text-3xl font-bold text-red-400 mt-2">
              {orders.filter((o) => o.status === 'cancelled_payment').length}
            </p>
          </div>
        </div>

        {/* Orders Section */}
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search orders..."
              className="flex-1 px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Transactions</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled_payment">Cancelled</option>
            </select>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Items</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 text-sm font-mono text-white">{order.id.substring(0, 12)}...</td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-400">
                          ${parseFloat(order.total || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowModal(true);
                            }}
                            className="p-2 hover:bg-slate-600 rounded transition"
                          >
                            <Eye size={16} className="text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        {orders.length === 0 ? 'No orders yet. Start shopping! 🛍️' : 'No orders match your search'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-8 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Order ID</p>
                <p className="text-white font-mono text-sm">{selectedOrder.id}</p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Items</p>
                <div className="space-y-2 mt-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <p key={idx} className="text-gray-300 text-sm">
                      {item.productName} × {item.quantity} @ ${item.price.toFixed(2)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">Subtotal</p>
                    <p className="text-blue-400 text-lg font-bold">${parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Tax</p>
                    <p className="text-yellow-400 text-lg font-bold">${parseFloat(selectedOrder.tax || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Total</p>
                    <p className="text-green-400 text-lg font-bold">${parseFloat(selectedOrder.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-gray-400 text-sm mb-2">Status</p>
                {getStatusBadge(selectedOrder.status)}
                {selectedOrder.reason && (
                  <p className="text-gray-400 text-xs mt-2">Reason: {selectedOrder.reason}</p>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-gray-400 text-sm">Date</p>
                <p className="text-white font-semibold">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition mt-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function CustomerAccountPage() {
  return (
    <Suspense fallback={<AccountSuspense />}>
      <CustomerAccountContent />
    </Suspense>
  );
}
