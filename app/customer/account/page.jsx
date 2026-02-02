'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, ShoppingCart, Package, Clock, CheckCircle, XCircle, Eye, Zap, Heart, Star, TrendingUp, Search, Bell, Settings, Home, BarChart3, Gift, Truck } from 'lucide-react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function CustomerDashboardContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setLoading(true);

      const customerData = localStorage.getItem('customer');
      if (!customerData) {
        router.push('/customer/login');
        return;
      }

      const parsedCustomer = JSON.parse(customerData);
      setCustomer(parsedCustomer);

      // Load wishlist from localStorage
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }

      // Load unread notifications count
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          const notifications = JSON.parse(savedNotifications);
          const unread = notifications.filter((n) => !n.read).length;
          setUnreadNotifications(unread);
        } catch (error) {
          console.error('Error parsing notifications:', error);
        }
      }

      // Load orders
      await loadCustomerOrders(parsedCustomer.id, parsedCustomer.email);

      // Load trending products
      await loadTrendingProducts();

      // Load recommended products
      await loadRecommendedProducts();

      setLoading(false);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      setLoading(false);
    }
  };

  const loadCustomerOrders = async (customerId, customerEmail) => {
    try {
      const ordersRef = collection(db, 'orders');
      const allDocs = await getDocs(ordersRef);

      const loadedOrders = [];
      allDocs.forEach((doc) => {
        const orderData = doc.data();
        const matchesCustomer =
          (orderData.customerId && String(orderData.customerId).trim() === String(customerId).trim()) ||
          (orderData.customerEmail && String(orderData.customerEmail).trim() === String(customerEmail).trim()) ||
          (orderData.email && String(orderData.email).trim() === String(customerEmail).trim());

        if (matchesCustomer) {
          loadedOrders.push({ id: doc.id, ...orderData });
        }
      });

      loadedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(loadedOrders);
      setFilteredOrders(loadedOrders.slice(0, 5));
    } catch (error) {
      console.error('[Orders] Error:', error);
    }
  };

  const loadTrendingProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const allProducts = await getDocs(productsRef);

      let products = [];
      allProducts.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      products.sort((a, b) => (b.views || 0) - (a.views || 0));
      setTrendingProducts(products.slice(0, 6));
    } catch (error) {
      console.error('[Trending] Error:', error);
    }
  };

  const loadRecommendedProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const allProducts = await getDocs(productsRef);

      let products = [];
      allProducts.forEach((doc) => {
        products.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setRecommendedProducts(products.slice(0, 6));
    } catch (error) {
      console.error('[Recommended] Error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  const toggleWishlist = (productId) => {
    setWishlist((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem('wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  const handleContinuePayment = (order) => {
    localStorage.setItem('pendingCheckout', JSON.stringify({
      orderId: order.id,
      email: order.customerEmail,
      fullName: order.customerName,
      phone: order.customerPhone,
      cartData: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
    }));
    window.location.href = `/checkout?orderId=${order.id}`;
  };

  const getStatusBadge = (status) => {
    const statusStr = String(status || '').toLowerCase();

    if (statusStr === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-600/20 text-green-400">
          <CheckCircle size={14} />
          Paid
        </span>
      );
    }

    if (statusStr === 'pending_payment') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-600/20 text-yellow-400">
          <Clock size={14} />
          Pending
        </span>
      );
    }

    if (statusStr === 'cancelled_payment') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-600/20 text-red-400">
          <XCircle size={14} />
          Cancelled
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-600/20 text-blue-400">
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to continue</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const paidCount = orders.filter((o) => String(o.status || '').toLowerCase() === 'paid').length;
  const pendingCount = orders.filter((o) => String(o.status || '').toLowerCase() === 'pending_payment').length;
  const totalSpent = orders
    .filter((o) => String(o.status || '').toLowerCase() === 'paid')
    .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
                <Home size={20} className="text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">👤 Dashboard</h1>
                <p className="text-xs text-gray-400">Welcome back, {customer.firstName}!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Button - NOW CLICKABLE */}
              <Link
                href="/customer/notifications"
                className="p-2 hover:bg-slate-700 rounded-lg transition relative group"
                title="Notifications"
              >
                <Bell size={20} className="text-gray-400 group-hover:text-yellow-400" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>

              {/* Settings Button - NOW CLICKABLE */}
              <Link
                href="/customer/settings"
                className="p-2 hover:bg-slate-700 rounded-lg transition"
                title="Settings"
              >
                <Settings size={20} className="text-gray-400 hover:text-blue-400" />
              </Link>
              <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              <ShoppingCart size={16} className="inline mr-2" />
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'tracking'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              <Truck size={16} className="inline mr-2" />
              Track Orders
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'wishlist'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              <Heart size={16} className="inline mr-2" />
              Wishlist ({wishlist.length})
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'trending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              <TrendingUp size={16} className="inline mr-2" />
              Trending
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Profile Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">{customer.firstName} {customer.lastName}</h2>
              <p className="text-blue-100">{customer.email}</p>
              <p className="text-blue-100 text-sm mt-1">{customer.phone || 'No phone number'}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Orders</p>
                  <ShoppingCart size={20} className="text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">{orders.length}</p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Total Spent</p>
                  <Gift size={20} className="text-green-400" />
                </div>
                <p className="text-3xl font-bold text-green-400">${totalSpent.toFixed(2)}</p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Pending Orders</p>
                  <Clock size={20} className="text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">Wishlist Items</p>
                  <Heart size={20} className="text-red-400" />
                </div>
                <p className="text-3xl font-bold text-red-400">{wishlist.length}</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} />
                Recent Orders
              </h3>
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="px-4 py-3 text-left text-gray-400 font-semibold">Order ID</th>
                        <th className="px-4 py-3 text-left text-gray-400 font-semibold">Items</th>
                        <th className="px-4 py-3 text-left text-gray-400 font-semibold">Total</th>
                        <th className="px-4 py-3 text-left text-gray-400 font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-gray-400 font-semibold">Date</th>
                        <th className="px-4 py-3 text-right text-gray-400 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                          <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                            <td className="px-4 py-3 font-mono text-white">{order.id.substring(0, 10)}...</td>
                            <td className="px-4 py-3 text-gray-300">{order.items?.length || 0}</td>
                            <td className="px-4 py-3 text-green-400 font-semibold">${parseFloat(order.total || 0).toFixed(2)}</td>
                            <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowModal(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 transition text-xs"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                            No orders yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star size={20} className="text-yellow-400" />
                  Recommended For You
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedProducts.slice(0, 3).map((prod) => (
                    <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                      {prod.image && (
                        <div className="h-32 overflow-hidden bg-slate-700 relative">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <h4 className="font-semibold text-white text-sm line-clamp-2">{prod.name}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                          <button
                            onClick={() => toggleWishlist(prod.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Heart size={16} fill={wishlist.includes(prod.id) ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        <Link
                          href={`/p/${prod.id}`}
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-semibold text-center transition"
                        >
                          View Product
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
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
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4 text-sm font-mono text-white">{order.id.substring(0, 12)}...</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{order.items?.length || 0} items</td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-400">${parseFloat(order.total || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
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
                          No orders yet. <Link href="/" className="text-blue-400 hover:underline">Start shopping!</Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TRACKING TAB */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">📦 Track Your Orders</h2>
              <p className="text-purple-100">View real-time tracking for your confirmed and shipped orders</p>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
              <Truck size={48} className="text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Order Tracking</h3>
              <p className="text-gray-400 mb-6">Track your shipments in real-time with detailed status updates and estimated delivery dates.</p>
              <Link
                href="/customer/tracking"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition"
              >
                <Truck size={18} />
                Go to Tracking Page
              </Link>
            </div>

            {/* Quick Stats */}
            {orders.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <p className="text-gray-400 text-sm">Confirmed Orders</p>
                  <p className="text-3xl font-bold text-green-400">
                    {orders.filter((o) => ['paid', 'confirmed', 'processing', 'shipped', 'completed'].includes(String(o.status || '').toLowerCase())).length}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <p className="text-gray-400 text-sm">Shipped Orders</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {orders.filter((o) => String(o.status || '').toLowerCase() === 'shipped').length}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <p className="text-gray-400 text-sm">Delivered Orders</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {orders.filter((o) => String(o.status || '').toLowerCase() === 'completed').length}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlist.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingProducts
                  .filter((p) => wishlist.includes(p.id))
                  .map((prod) => (
                    <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                      {prod.image && (
                        <div className="h-40 overflow-hidden bg-slate-700 relative">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <h4 className="font-semibold text-white line-clamp-2">{prod.name}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-2xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                          <button
                            onClick={() => toggleWishlist(prod.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Heart size={20} fill="currentColor" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/p/${prod.id}`}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-semibold text-center transition"
                          >
                            View
                          </Link>
                          <Link
                            href={`/p/${prod.id}`}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs font-semibold text-center transition"
                          >
                            Buy
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart size={40} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No items in wishlist</p>
                <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                  Start Shopping
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TRENDING TAB */}
        {activeTab === 'trending' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-400" />
              🔥 Trending Now
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingProducts.map((prod) => (
                <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                  {prod.image && (
                    <div className="h-40 overflow-hidden bg-slate-700 relative">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                        👀 {prod.views || 0}
                      </div>
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <h4 className="font-semibold text-white line-clamp-2">{prod.name}</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                        {prod.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-400">{prod.rating}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleWishlist(prod.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Heart size={20} fill={wishlist.includes(prod.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/p/${prod.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-semibold text-center transition"
                      >
                        View
                      </Link>
                      <Link
                        href={`/p/${prod.id}`}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs font-semibold text-center transition"
                      >
                        Buy
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
              {/* Header */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-700">
                <div>
                  <p className="text-gray-400 text-sm">Order ID</p>
                  <p className="text-white font-mono text-sm">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Date</p>
                  <p className="text-white font-semibold">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
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
                <h3 className="text-lg font-bold text-white mb-3">Items</h3>
                <div className="space-y-2 bg-slate-700/30 rounded-lg p-4">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{item.productName}</p>
                        <p className="text-gray-400 text-sm">Qty: {item.quantity} @ ${parseFloat(item.price || 0).toFixed(2)}</p>
                      </div>
                      <p className="text-green-400 font-bold">${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Payment for Pending */}
              {String(selectedOrder.status || '').toLowerCase() === 'pending_payment' && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleContinuePayment(selectedOrder);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                >
                  <Zap size={18} />
                  Continue Payment
                </button>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition"
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

function DashboardSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSuspense />}>
      <CustomerDashboardContent />
    </Suspense>
  );
}
