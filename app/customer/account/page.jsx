'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ShoppingCart, Package, Clock, CheckCircle, XCircle, Eye, Zap, Heart, Star, TrendingUp, Bell, Settings, Home, BarChart3, Gift, Truck, Menu, X, Check, Store } from 'lucide-react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function CustomerDashboardContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addedItem, setAddedItem] = useState(null);

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

      await loadWishlistFromFirestore(parsedCustomer.id);

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

      const cartData = localStorage.getItem('cart');
      if (cartData) {
        try {
          const parsedCart = JSON.parse(cartData);
          setCart(Array.isArray(parsedCart) ? parsedCart : []);
        } catch (err) {
          console.error('Error parsing cart:', err);
        }
      }

      await loadCustomerOrders(parsedCustomer.id, parsedCustomer.email);
      await loadAllProducts();
      await loadTrendingProducts();
      await loadRecommendedProducts();

      setLoading(false);
    } catch (error) {
      console.error('[Dashboard] Error:', error);
      setLoading(false);
    }
  };

  const loadWishlistFromFirestore = async (customerId) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const wishlistData = customerSnap.data().wishlist || [];
        setWishlist(wishlistData);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('[Wishlist] Error:', error);
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
    } catch (error) {
      console.error('[Orders] Error:', error);
    }
  };

  const loadAllProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const allProducts = await getDocs(productsRef);

      let loadedProducts = [];
      allProducts.forEach((doc) => {
        loadedProducts.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setProducts(loadedProducts);
    } catch (error) {
      console.error('[Products] Error:', error);
    }
  };

  const loadTrendingProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const allProducts = await getDocs(productsRef);

      let prods = [];
      allProducts.forEach((doc) => {
        prods.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      prods.sort((a, b) => (b.views || 0) - (a.views || 0));
      setTrendingProducts(prods.slice(0, 6));
    } catch (error) {
      console.error('[Trending] Error:', error);
    }
  };

  const loadRecommendedProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const allProducts = await getDocs(productsRef);

      let prods = [];
      allProducts.forEach((doc) => {
        prods.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      prods.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setRecommendedProducts(prods.slice(0, 6));
    } catch (error) {
      console.error('[Recommended] Error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  const toggleWishlist = async (productId) => {
    try {
      let updated;
      if (wishlist.includes(productId)) {
        updated = wishlist.filter((id) => id !== productId);
      } else {
        updated = [...wishlist, productId];
      }

      setWishlist(updated);

      if (customer) {
        const customerRef = doc(db, 'customers', customer.id);
        await updateDoc(customerRef, {
          wishlist: updated,
        });
      }

      localStorage.setItem('wishlist', JSON.stringify(updated));
    } catch (error) {
      console.error('[Wishlist] Error:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);

    let updatedCart;
    if (existingItem) {
      updatedCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
      );
    } else {
      updatedCart = [
        ...cart,
        {
          id: String(product.id),
          productId: String(product.productId || product.id),
          name: String(product.name || product.productName || 'Product'),
          productName: String(product.name || product.productName || 'Product'),
          price: parseFloat(product.price),
          quantity: 1,
          image: product.image ? String(product.image) : '',
          description: product.description ? String(product.description) : '',
        },
      ];
    }

    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);

    setAddedItem(product.id);
    setTimeout(() => setAddedItem(null), 2000);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to continue</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block transition">
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

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition flex-shrink-0">
                <Home size={20} className="text-gray-400" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">👤 Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-400 truncate">Welcome, {customer.firstName}!</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/customer/notifications"
                className="p-2 hover:bg-slate-700 rounded-lg transition relative group"
              >
                <Bell size={20} className="text-gray-400 group-hover:text-yellow-400" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>

              <Link href="/customer/settings" className="p-2 hover:bg-slate-700 rounded-lg transition">
                <Settings size={20} className="text-gray-400 hover:text-blue-400" />
              </Link>

              <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
                <LogOut size={20} />
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-slate-700 rounded-lg transition"
            >
              {mobileMenuOpen ? <X size={20} className="text-gray-400" /> : <Menu size={20} className="text-gray-400" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="sm:hidden mb-4 pb-4 border-t border-slate-700 pt-4 space-y-2">
              <Link href="/customer/notifications" className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded-lg transition text-gray-300">
                <Bell size={18} />
                <span className="flex-1">Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadNotifications}
                  </span>
                )}
              </Link>

              <Link href="/customer/settings" className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded-lg transition text-gray-300">
                <Settings size={18} />
                <span>Settings</span>
              </Link>

              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2 hover:bg-red-500/20 rounded-lg transition text-red-400 w-full"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* TABS */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0">
            {[
              { id: 'overview', icon: BarChart3, label: 'Overview' },
              { id: 'shop', icon: Store, label: `Shop (${products.length})` },
              { id: 'orders', icon: Package, label: `Orders (${orders.length})` },
              { id: 'tracking', icon: Truck, label: 'Tracking' },
              { id: 'wishlist', icon: Heart, label: `Wishlist (${wishlist.length})` },
              { id: 'trending', icon: TrendingUp, label: 'Trending' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-1 px-3 sm:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* SHOP TAB */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
                <Store size={28} />
                Shop Products
              </h2>
              <p className="text-orange-100 text-sm sm:text-base">Browse admin uploaded products</p>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-12">
                <Store size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No products available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                    {product.image && (
                      <div className="h-32 sm:h-40 overflow-hidden bg-slate-700 relative">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 rounded-lg transition"
                        >
                          <Heart size={16} className={wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      </div>
                    )}
                    <div className="p-2 sm:p-4 space-y-2">
                      <div>
                        <h3 className="text-white font-bold line-clamp-2 text-xs sm:text-sm">{product.name || product.productName}</h3>
                        <p className="text-gray-400 text-xs">{product.category || 'Product'}</p>
                      </div>

                      {product.description && (
                        <p className="text-gray-400 text-xs line-clamp-2">{product.description}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="text-green-400 font-bold text-sm sm:text-base">${parseFloat(product.price).toFixed(2)}</span>
                        {product.rating && (
                          <div className="flex items-center gap-0.5">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-400">{product.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/p/${product.id}`}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-semibold text-center transition"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => addToCart(product)}
                          className={`flex-1 py-2 rounded text-xs font-semibold transition flex items-center justify-center gap-1 ${
                            addedItem === product.id
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {addedItem === product.id ? (
                            <>
                              <Check size={12} />
                              <span className="hidden sm:inline">Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={12} />
                              <span className="hidden sm:inline">Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">{customer.firstName} {customer.lastName}</h2>
              <p className="text-blue-100 text-sm sm:text-base">{customer.email}</p>
              <p className="text-blue-100 text-xs sm:text-sm mt-2">{customer.phone || 'No phone'}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-xs sm:text-sm">Total Orders</p>
                  <ShoppingCart size={18} className="text-blue-400 flex-shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{orders.length}</p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-xs sm:text-sm">Total Spent</p>
                  <Gift size={18} className="text-green-400 flex-shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-green-400">${totalSpent.toFixed(2)}</p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-xs sm:text-sm">Pending</p>
                  <Clock size={18} className="text-yellow-400 flex-shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{pendingCount}</p>
              </div>

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-xs sm:text-sm">Wishlist</p>
                  <Heart size={18} className="text-red-400 flex-shrink-0" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-red-400">{wishlist.length}</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Recent Orders</h3>
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/50">
                        <th className="px-3 sm:px-4 py-3 text-left text-gray-400 font-semibold">Order ID</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-gray-400 font-semibold">Items</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-gray-400 font-semibold">Total</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-gray-400 font-semibold">Status</th>
                        <th className="px-3 sm:px-4 py-3 text-left text-gray-400 font-semibold hidden sm:table-cell">Date</th>
                        <th className="px-3 sm:px-4 py-3 text-right text-gray-400 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).length > 0 ? (
                        orders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                            <td className="px-3 sm:px-4 py-3 font-mono text-white text-xs">{order.id.substring(0, 8)}...</td>
                            <td className="px-3 sm:px-4 py-3 text-gray-300">{order.items?.length || 0}</td>
                            <td className="px-3 sm:px-4 py-3 text-green-400 font-semibold">${parseFloat(order.total || 0).toFixed(2)}</td>
                            <td className="px-3 sm:px-4 py-3">{getStatusBadge(order.status)}</td>
                            <td className="px-3 sm:px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowModal(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 transition text-xs font-semibold"
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

            {/* Recommended */}
            {recommendedProducts.length > 0 && (
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Recommended</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {recommendedProducts.slice(0, 3).map((prod) => (
                    <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                      {prod.image && (
                        <div className="h-24 sm:h-32 overflow-hidden bg-slate-700 relative">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                      )}
                      <div className="p-3 sm:p-4 space-y-2">
                        <h4 className="font-semibold text-white text-xs sm:text-sm line-clamp-2">{prod.name}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-lg sm:text-xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                          <button
                            onClick={() => toggleWishlist(prod.id)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                          >
                            <Heart size={14} fill={wishlist.includes(prod.id) ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        <Link
                          href={`/p/${prod.id}`}
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-semibold text-center transition"
                        >
                          View
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
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      <th className="px-3 sm:px-6 py-3 text-left text-gray-400 font-semibold">Order ID</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-gray-400 font-semibold">Items</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-gray-400 font-semibold">Total</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-gray-400 font-semibold">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-gray-400 font-semibold hidden sm:table-cell">Date</th>
                      <th className="px-3 sm:px-6 py-3 text-right text-gray-400 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                          <td className="px-3 sm:px-6 py-3 font-mono text-white text-xs">{order.id.substring(0, 8)}...</td>
                          <td className="px-3 sm:px-6 py-3 text-gray-300">{order.items?.length || 0}</td>
                          <td className="px-3 sm:px-6 py-3 font-semibold text-green-400">${parseFloat(order.total || 0).toFixed(2)}</td>
                          <td className="px-3 sm:px-6 py-3">{getStatusBadge(order.status)}</td>
                          <td className="px-3 sm:px-6 py-3 text-gray-400 text-xs hidden sm:table-cell">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 sm:px-6 py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowModal(true);
                              }}
                              className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                          No orders. <Link href="/" className="text-blue-400 hover:underline">Start shopping!</Link>
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
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">📦 Track Orders</h2>
              <p className="text-purple-100 text-sm sm:text-base">Real-time tracking</p>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8 text-center">
              <Truck size={48} className="text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Order Tracking</h3>
              <p className="text-gray-400 mb-6 text-sm sm:text-base">Track shipments in real-time</p>
              <Link
                href="/customer/tracking"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition text-sm sm:text-base"
              >
                <Truck size={18} />
                Go to Tracking
              </Link>
            </div>
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {trendingProducts
                  .filter((p) => wishlist.includes(p.id))
                  .map((prod) => (
                    <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                      {prod.image && (
                        <div className="h-24 sm:h-40 overflow-hidden bg-slate-700 relative">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                      )}
                      <div className="p-3 sm:p-4 space-y-2">
                        <h4 className="font-semibold text-white text-xs sm:text-base line-clamp-2">{prod.name}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-lg sm:text-2xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                          <button
                            onClick={() => toggleWishlist(prod.id)}
                            className="text-red-400 hover:text-red-300 flex-shrink-0"
                          >
                            <Heart size={18} fill="currentColor" />
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
                <Heart size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4 text-sm sm:text-base">No items</p>
                <button
                  onClick={() => setActiveTab('shop')}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
                >
                  Go to Shop
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRENDING TAB */}
        {activeTab === 'trending' && (
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-6">🔥 Trending</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {trendingProducts.map((prod) => (
                <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                  {prod.image && (
                    <div className="h-24 sm:h-40 overflow-hidden bg-slate-700 relative">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                        👀 {prod.views || 0}
                      </div>
                    </div>
                  )}
                  <div className="p-3 sm:p-4 space-y-2">
                    <h4 className="font-semibold text-white text-xs sm:text-base line-clamp-2">{prod.name}</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg sm:text-2xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                        {prod.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={12} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-400">{prod.rating}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleWishlist(prod.id)}
                        className="text-red-400 hover:text-red-300 transition flex-shrink-0"
                      >
                        <Heart size={18} fill={wishlist.includes(prod.id) ? 'currentColor' : 'none'} />
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

      {/* ORDER MODAL */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-6 sm:p-8 my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Order ID</p>
                  <p className="text-white font-mono text-xs sm:text-sm break-all">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Date</p>
                  <p className="text-white font-semibold text-xs sm:text-sm">
                    {new Date(selectedOrder.createdAt).toLocaleDateString()}
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

              <div>
                <h3 className="font-bold text-white mb-3">Items</h3>
                <div className="space-y-2 bg-slate-700/30 rounded-lg p-4">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{item.productName}</p>
                        <p className="text-gray-400 text-xs">Qty: {item.quantity} @ ${parseFloat(item.price || 0).toFixed(2)}</p>
                      </div>
                      <p className="text-green-400 font-bold flex-shrink-0">${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {String(selectedOrder.status || '').toLowerCase() === 'pending_payment' && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleContinuePayment(selectedOrder);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm sm:text-base"
                >
                  <Zap size={18} />
                  Continue Payment
                </button>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart */}
      {cartCount > 0 && (
        <Link
          href="/checkout"
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition relative"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {cartCount}
          </span>
        </Link>
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
