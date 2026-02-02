'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, ShoppingCart, Package, Clock, CheckCircle, XCircle, Eye, Zap } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
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
      console.log('[CustomerAccount] Customer loaded:', parsedCustomer.id, parsedCustomer.email);
      setCustomer(parsedCustomer);

      // Load all orders and filter by customer
      await loadAllOrders(parsedCustomer.id, parsedCustomer.email);
      setLoading(false);
    } catch (error) {
      console.error('[CustomerAccount] Error:', error);
      setLoading(false);
    }
  };

  const loadAllOrders = async (customerId, customerEmail) => {
    try {
      console.log('[CustomerAccount] Loading all orders from Firestore...');

      const ordersRef = collection(db, 'orders');
      const querySnapshot = await getDocs(ordersRef);

      const loadedOrders = [];

      querySnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // UNIVERSAL MATCHING
        const matchesCustomer = 
          (orderData.customerId && String(orderData.customerId).trim() === String(customerId).trim()) ||
          (orderData.customer_id && String(orderData.customer_id).trim() === String(customerId).trim()) ||
          (orderData.userId && String(orderData.userId).trim() === String(customerId).trim()) ||
          (orderData.user_id && String(orderData.user_id).trim() === String(customerId).trim()) ||
          (orderData.uid && String(orderData.uid).trim() === String(customerId).trim()) ||
          (orderData.customerEmail && String(orderData.customerEmail).trim() === String(customerEmail).trim()) ||
          (orderData.customer_email && String(orderData.customer_email).trim() === String(customerEmail).trim()) ||
          (orderData.email && String(orderData.email).trim() === String(customerEmail).trim());

        if (matchesCustomer) {
          console.log('[CustomerAccount] ✅ Found order:', {
            id: doc.id,
            status: orderData.status,
            items: orderData.items?.length || 0,
          });

          loadedOrders.push({
            id: doc.id,
            ...orderData,
          });
        }
      });

      console.log('[CustomerAccount] Total orders loaded:', loadedOrders.length);

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
    let filtered = [...ordersList];

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter((order) => {
        const orderStatus = String(order.status || '').toLowerCase();
        const filterStatusLower = String(status).toLowerCase();
        return orderStatus === filterStatusLower;
      });
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

  const handleContinuePayment = (order) => {
    // Store pending order info
    localStorage.setItem('pendingCheckout', JSON.stringify({
      orderId: order.id,
      email: order.customerEmail,
      fullName: order.customerName,
      phone: order.customerPhone,
      address: order.shippingAddress?.address || '',
      city: order.shippingAddress?.city || '',
      state: order.shippingAddress?.state || '',
      zipCode: order.shippingAddress?.zipCode || '',
      country: order.shippingAddress?.country || 'United States',
      cartData: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      timestamp: new Date().toISOString()
    }));

    // Redirect to checkout with order context
    window.location.href = `/checkout?orderId=${order.id}`;
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

  const paidCount = orders.filter((o) => String(o.status || '').toLowerCase() === 'paid').length;
  const pendingCount = orders.filter((o) => String(o.status || '').toLowerCase() === 'pending_payment').length;
  const cancelledCount = orders.filter((o) => String(o.status || '').toLowerCase() === 'cancelled_payment').length;

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
          <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
            <LogOut size={20} />
          </button>
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
            <p className="text-3xl font-bold text-green-400 mt-2">{paidCount}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">{pendingCount}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Cancelled</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{cancelledCount}</p>
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
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                          >
                            View
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

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg max-w-3xl w-full border border-slate-700 p-8 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700">
                <div>
                  <p className="text-gray-400 text-sm">Order ID</p>
                  <p className="text-white font-mono text-sm">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Date</p>
                  <p className="text-white font-semibold">
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total</p>
                  <p className="text-green-400 font-bold text-lg">${parseFloat(selectedOrder.total || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Items in This Order</h3>
                <div className="space-y-3 bg-slate-700/30 rounded-lg p-4">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between border-b border-slate-600 pb-3 last:border-0">
                        <div className="flex-1">
                          <div className="flex gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.productName}
                                className="w-16 h-16 object-cover rounded border border-slate-600"
                              />
                            )}
                            <div>
                              <p className="text-white font-semibold">{item.productName}</p>
                              <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                              <p className="text-gray-400 text-sm">Price: ${parseFloat(item.price || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">
                            ${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No items in this order</p>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-semibold">${parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Shipping</span>
                  <span className="font-semibold">$10.00</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Tax</span>
                  <span className="font-semibold">${parseFloat(selectedOrder.tax || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 flex justify-between text-white font-bold">
                  <span>Total</span>
                  <span className="text-green-400">${parseFloat(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Shipping Address</h3>
                  <div className="bg-slate-700/30 rounded-lg p-4 text-gray-300 text-sm space-y-1">
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Reason for Cancelled */}
              {selectedOrder.status === 'cancelled_payment' && selectedOrder.reason && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-200 text-sm"><strong>Reason:</strong> {selectedOrder.reason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                {selectedOrder.status === 'pending_payment' && (
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleContinuePayment(selectedOrder);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Zap size={18} />
                    Continue Payment
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition"
                >
                  Close
                </button>
              </div>
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
