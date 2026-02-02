'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, Smartphone, Share2, Link as LinkIcon, Eye, Search, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';
import { fetchTrendingProducts, addTrendingProductToStore } from '@/lib/trending';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [addingProduct, setAddingProduct] = useState(null);
  const [addMessage, setAddMessage] = useState(null);
  const [trendingStats, setTrendingStats] = useState({ shopify: 0, printful_custom: 0, printful_bestseller: 0 });
  const [featureStatus, setFeatureStatus] = useState({});
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalCost: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    profitMargin: 0,
    avgOrderValue: 0,
    trendingAdded: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/admin/login');
        return;
      }

      console.log('[Admin Dashboard] User authenticated:', currentUser.uid);
      setUser(currentUser);
      await loadAllData(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadAllData = async (userId) => {
    try {
      setLoading(true);
      console.log('[Admin Dashboard] Loading all data...');

      // Load orders
      await loadOrders();
      // Load products
      await loadProducts();
      // Load customers
      await loadCustomers();
      // Load integrations
      await loadIntegrations(userId);
      // Load trending products
      await loadTrendingProducts(userId);
    } catch (error) {
      console.error('[Admin Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const ordersRef = collection(firebaseDb, 'orders');
      const ordersSnap = await getDocs(ordersRef);
      
      const loadedOrders = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('[Admin] Orders loaded:', loadedOrders.length);
      setOrders(loadedOrders);

      const totalRevenue = loadedOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
      const totalCost = loadedOrders.reduce((sum, order) => sum + (parseFloat(order.shipping) || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
      const avgOrderValue = loadedOrders.length > 0 ? (totalRevenue / loadedOrders.length).toFixed(2) : 0;

      setStats(prev => ({
        ...prev,
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalCost: totalCost.toFixed(2),
        totalOrders: loadedOrders.length,
        profitMargin,
        avgOrderValue,
      }));
    } catch (error) {
      console.error('[Admin] Error loading orders:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsRef = collection(firebaseDb, 'products');
      const productsSnap = await getDocs(productsRef);
      
      const loadedProducts = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('[Admin] Products loaded:', loadedProducts.length);
      setProducts(loadedProducts);

      const trendingCount = loadedProducts.filter(p => p.trendingSource).length;

      setStats(prev => ({
        ...prev,
        totalProducts: loadedProducts.length,
        trendingAdded: trendingCount,
      }));
    } catch (error) {
      console.error('[Admin] Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersRef = collection(firebaseDb, 'customers');
      const customersSnap = await getDocs(customersRef);
      
      const loadedCustomers = customersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('[Admin] Customers loaded:', loadedCustomers.length);
      setCustomers(loadedCustomers);

      setStats(prev => ({
        ...prev,
        totalCustomers: loadedCustomers.length,
      }));
    } catch (error) {
      console.error('[Admin] Error loading customers:', error);
    }
  };

  const loadIntegrations = async (userId) => {
    try {
      const integrationsRef = collection(firebaseDb, `users/${userId}/integrations`);
      const integrationsSnap = await getDocs(integrationsRef);
      
      const integrationsData = {};
      integrationsSnap.forEach(doc => {
        integrationsData[doc.id] = doc.data();
      });

      console.log('[Admin] Integrations loaded:', Object.keys(integrationsData).length);
      setIntegrations(integrationsData);

      const connected = {};
      Object.keys(integrationsData).forEach(key => {
        if (integrationsData[key]?.status === 'connected') {
          connected[key] = true;
        }
      });

      const features = {
        trendingProducts: {
          available: connected['printful'] || connected['shopify'],
        },
      };

      setFeatureStatus(features);
    } catch (error) {
      console.error('[Admin] Error loading integrations:', error);
    }
  };

  const loadTrendingProducts = async (userId) => {
    try {
      setTrendingLoading(true);
      const result = await fetchTrendingProducts(userId);
      
      if (result.success) {
        console.log('[Admin] Trending products loaded:', result.products.length);
        setTrendingProducts(result.products);
        setTrendingStats(result.stats || {});
      }
    } catch (error) {
      console.error('[Admin] Error loading trending:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  const handleAddProductToStore = async (product) => {
    try {
      setAddingProduct(product.id);
      const result = await addTrendingProductToStore(user.uid, product);

      if (result.success) {
        setAddMessage({ type: 'success', text: result.message });
        setTimeout(async () => {
          await loadAllData(user.uid);
          setAddMessage(null);
        }, 1500);
      } else {
        setAddMessage({ type: 'error', text: result.errors?.[0] || 'Failed to add product' });
        setTimeout(() => setAddMessage(null), 3000);
      }
    } catch (err) {
      setAddMessage({ type: 'error', text: err.message });
      setTimeout(() => setAddMessage(null), 3000);
    } finally {
      setAddingProduct(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(firebaseDb, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      
      await loadOrders();
      setShowOrderModal(false);
      setAddMessage({ type: 'success', text: 'Order status updated!' });
      setTimeout(() => setAddMessage(null), 2000);
    } catch (error) {
      console.error('Error updating order:', error);
      setAddMessage({ type: 'error', text: 'Failed to update order' });
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      await deleteDoc(doc(firebaseDb, 'orders', orderId));
      await loadOrders();
      setShowOrderModal(false);
      setAddMessage({ type: 'success', text: 'Order deleted!' });
      setTimeout(() => setAddMessage(null), 2000);
    } catch (error) {
      console.error('Error deleting order:', error);
      setAddMessage({ type: 'error', text: 'Failed to delete order' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('adminToken');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      stats,
      ordersCount: orders.length,
      productsCount: products.length,
      customersCount: customers.length,
      integrationsCount: Object.keys(integrations).length,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin_backup_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'shipped':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'pending':
      case 'pending_payment':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getDisplayStatus = (status) => {
    if (status === 'pending_payment') return 'Pending Payment';
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  const generateChartData = () => {
    const data = {};
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    days.forEach(day => {
      data[day] = { day, revenue: 0, orders: 0 };
    });

    orders.forEach(order => {
      try {
        const date = new Date(order.createdAt || Date.now());
        const dayIndex = date.getDay();
        const day = days[(dayIndex + 6) % 7];

        data[day].revenue += parseFloat(order.total) || 0;
        data[day].orders += 1;
      } catch (e) {
        console.warn('Error processing order:', e);
      }
    });

    return Object.values(data);
  };

  const chartData = generateChartData();
  const intStatus = Object.keys(integrations).filter(key => integrations[key]?.status === 'connected').length;
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You need to be logged in</p>
          <Link href="/admin/login" className="text-emerald-400 hover:underline">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">DropBoard Admin</h1>
            <p className="text-xs text-gray-400">Complete Platform Management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
              title="Export Data"
            >
              <Download size={20} className="text-gray-400" />
            </button>
            <Link href="/settings" className="p-2 hover:bg-slate-700 rounded-lg transition" title="Settings">
              <Settings size={20} className="text-gray-400" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Message Alert */}
        {addMessage && (
          <div className={`p-4 rounded-lg border ${addMessage.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' : 'bg-red-900/30 border-red-500 text-red-200'}`}>
            {addMessage.text}
          </div>
        )}

        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-5xl font-bold text-white">
            Welcome back, <span className="text-emerald-400">Admin</span>! 👋
          </h2>
          <p className="text-lg text-gray-400">
            Complete platform overview and management
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <span>📧 {user.email}</span>
            <span className="text-gray-700">•</span>
            <span>Account ID: {user.uid?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700 flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'orders', label: '🛒 Orders' },
            { id: 'customers', label: '👥 Customers' },
            { id: 'products', label: '📦 Products' },
            { id: 'trending', label: '🔥 Trending' },
            { id: 'integrations', label: '⚙️ Integrations' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Total Revenue</p>
                    <p className="text-3xl font-bold text-white">${stats.totalRevenue}</p>
                    <p className="text-xs text-green-400 mt-1">From {stats.totalOrders} orders</p>
                  </div>
                  <DollarSign size={32} className="text-green-500/20 group-hover:text-green-500/40 transition" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Net Profit</p>
                    <p className="text-3xl font-bold text-emerald-400">${stats.totalProfit}</p>
                    <p className="text-xs text-blue-400 mt-1">{stats.profitMargin}% margin</p>
                  </div>
                  <TrendingUp size={32} className="text-emerald-500/20 group-hover:text-emerald-500/40 transition" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Total Cost</p>
                    <p className="text-3xl font-bold text-orange-400">${stats.totalCost}</p>
                    <p className="text-xs text-orange-300 mt-1">Shipping & COGS</p>
                  </div>
                  <Zap size={32} className="text-orange-500/20 group-hover:text-orange-500/40 transition" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Total Orders</p>
                    <p className="text-3xl font-bold text-white">{stats.totalOrders}</p>
                    <p className="text-xs text-purple-400 mt-1">Avg ${stats.avgOrderValue}</p>
                  </div>
                  <ShoppingCart size={32} className="text-blue-500/20 group-hover:text-blue-500/40 transition" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Active Products</p>
                    <p className="text-3xl font-bold text-white">{stats.totalProducts}</p>
                    <p className="text-xs text-emerald-400 mt-1">{stats.trendingAdded} from trending</p>
                  </div>
                  <Package size={32} className="text-emerald-500/20 group-hover:text-emerald-500/40 transition" />
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Total Customers</p>
                    <p className="text-3xl font-bold text-white">{stats.totalCustomers}</p>
                    <p className="text-xs text-pink-400 mt-1">Active customers</p>
                  </div>
                  <Users size={32} className="text-pink-500/20 group-hover:text-pink-500/40 transition" />
                </div>
              </div>
            </div>

            {/* Charts */}
            {orders.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Revenue Overview (Weekly)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="day" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Order Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Pending', value: orders.filter(o => o.status === 'pending_payment').length },
                          { name: 'Paid', value: orders.filter(o => o.status === 'paid').length },
                          { name: 'Shipped', value: orders.filter(o => o.status === 'shipped').length },
                          { name: 'Completed', value: orders.filter(o => o.status === 'completed').length },
                        ].filter(p => p.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Trending Widget */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Flame size={28} className="text-orange-400" />
                  🔥 Top Trending Products
                </h3>
                <Link href="#trending" className="text-emerald-400 hover:text-emerald-300 font-semibold transition text-sm">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingProducts.slice(0, 3).map((product) => (
                  <div key={product.id} className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-4 group hover:border-orange-500 transition">
                    {product.image && (
                      <div className="h-32 overflow-hidden bg-slate-700 rounded mb-3">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      </div>
                    )}
                    <h4 className="text-sm font-bold text-white line-clamp-2 mb-2">{product.title}</h4>
                    <p className="text-lg font-bold text-green-400 mb-3">${parseFloat(product.price || 0).toFixed(2)}</p>
                    <p className={`text-xs font-medium w-fit px-2 py-1 rounded mb-3 ${product.supplier?.includes('Shopify') ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                      {product.supplier}
                    </p>
                    <button
                      onClick={() => handleAddProductToStore(product)}
                      disabled={addingProduct === product.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white py-2 rounded font-medium text-sm transition flex items-center justify-center gap-2"
                    >
                      {addingProduct === product.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add to Store
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Link href="#orders" onClick={() => setActiveTab('orders')} className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg p-4 transition group">
                  <ShoppingCart size={24} className="text-blue-400 mb-2 group-hover:scale-110 transition" />
                  <p className="font-semibold text-white group-hover:text-emerald-400 transition">Orders</p>
                  <p className="text-xs text-gray-400">{stats.totalOrders} orders</p>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs mt-3">
                    Manage <ArrowRight size={12} />
                  </div>
                </Link>

                <Link href="#customers" onClick={() => setActiveTab('customers')} className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg p-4 transition group">
                  <Users size={24} className="text-pink-400 mb-2 group-hover:scale-110 transition" />
                  <p className="font-semibold text-white group-hover:text-emerald-400 transition">Customers</p>
                  <p className="text-xs text-gray-400">{stats.totalCustomers} customers</p>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs mt-3">
                    View <ArrowRight size={12} />
                  </div>
                </Link>

                <Link href="#products" onClick={() => setActiveTab('products')} className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg p-4 transition group">
                  <Package size={24} className="text-purple-400 mb-2 group-hover:scale-110 transition" />
                  <p className="font-semibold text-white group-hover:text-emerald-400 transition">Products</p>
                  <p className="text-xs text-gray-400">{stats.totalProducts} products</p>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs mt-3">
                    Manage <ArrowRight size={12} />
                  </div>
                </Link>

                <Link href="#trending" onClick={() => setActiveTab('trending')} className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg p-4 transition group">
                  <Flame size={24} className="text-orange-400 mb-2 group-hover:scale-110 transition" />
                  <p className="font-semibold text-white group-hover:text-emerald-400 transition">Trending</p>
                  <p className="text-xs text-gray-400">{trendingProducts.length} products</p>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs mt-3">
                    Browse <ArrowRight size={12} />
                  </div>
                </Link>

                <Link href="#integrations" onClick={() => setActiveTab('integrations')} className="bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg p-4 transition group">
                  <Zap size={24} className="text-yellow-400 mb-2 group-hover:scale-110 transition" />
                  <p className="font-semibold text-white group-hover:text-emerald-400 transition">Integrations</p>
                  <p className="text-xs text-gray-400">{intStatus} connected</p>
                  <div className="flex items-center gap-1 text-emerald-400 text-xs mt-3">
                    Setup <ArrowRight size={12} />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by customer, email, product..."
                  className="w-full px-4 py-2 pl-10 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
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
                          <td className="px-6 py-4 text-sm font-semibold text-green-400">${order.total?.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                              {getDisplayStatus(order.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderModal(true);
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
                          No orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Total Spent</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map((customer) => (
                        <tr key={customer.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-white">{customer.firstName} {customer.lastName}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{customer.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{customer.phone || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-400">${customer.total_spent?.toFixed(2) || '0.00'}</td>
                          <td className="px-6 py-4 text-sm text-blue-400">{customer.order_count || 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                          No customers yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.length > 0 ? (
                products.map((product) => (
                  <div key={product.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-emerald-500 transition group">
                    {product.image && (
                      <div className="h-40 overflow-hidden bg-slate-700">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-white line-clamp-2 mb-2">{product.name}</h3>
                      <p className="text-lg font-bold text-emerald-400 mb-3">${parseFloat(product.price || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-400 mb-2">Category: {product.category || 'N/A'}</p>
                      {product.trendingSource && (
                        <p className="text-xs text-orange-400 mb-2">📊 From: {product.trendingSource}</p>
                      )}
                      <p className="text-xs text-gray-500">Stock: {product.inventory || 0}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-400">
                  No products yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* TRENDING TAB */}
        {activeTab === 'trending' && (
          <div className="space-y-6">
            {featureStatus.trendingProducts?.available ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">🔥 All Trending Products</h3>
                  <p className="text-xs text-gray-400">Shopify: {trendingStats.shopify} | Printful: {trendingStats.printful_custom}</p>
                </div>

                {trendingLoading ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                    <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400">Loading trending products...</p>
                  </div>
                ) : trendingProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {trendingProducts.map((product) => (
                      <div key={product.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-orange-500 transition">
                        {product.image && (
                          <div className="h-32 overflow-hidden bg-slate-700">
                            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4">
                          <h4 className="font-semibold text-white text-sm line-clamp-2 mb-2">{product.title}</h4>
                          <p className={`text-xs font-medium w-fit px-2 py-1 rounded mb-2 ${product.supplier?.includes('Shopify') ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                            {product.supplier}
                          </p>
                          <p className="text-lg font-bold text-green-400 mb-3">${parseFloat(product.price || 0).toFixed(2)}</p>
                          <button
                            onClick={() => handleAddProductToStore(product)}
                            disabled={addingProduct === product.id}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white py-2 rounded font-medium text-sm transition"
                          >
                            {addingProduct === product.id ? 'Adding...' : 'Add to Store'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-gray-400">No trending products available</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
                <h3 className="font-bold text-yellow-400 mb-2">🔒 Trending Products Locked</h3>
                <p className="text-sm text-gray-400">Connect Shopify or Printful integration to access trending products</p>
                <Link href="/settings" className="text-emerald-400 text-sm font-semibold mt-2 inline-block hover:underline">
                  Go to Integrations →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* INTEGRATIONS TAB */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'shopify', icon: '🛍️', name: 'Shopify' },
                { key: 'printful', icon: '📦', name: 'Printful' },
                { key: 'stripe', icon: '💳', name: 'Stripe' },
                { key: 'tiktok', icon: '🎵', name: 'TikTok' },
              ].map(({ key, icon, name }) => (
                <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-6 group hover:border-emerald-500 transition">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{icon} {name}</h3>
                    {integrations[key]?.status === 'connected' ? (
                      <CheckCircle size={20} className="text-green-400" />
                    ) : (
                      <Clock size={20} className="text-gray-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    {integrations[key]?.status === 'connected' ? '✅ Connected & Active' : '⏳ Not connected'}
                  </p>
                  <Link href="/settings" className="text-emerald-400 text-sm font-semibold hover:underline">
                    {integrations[key]?.status === 'connected' ? 'Manage' : 'Connect'} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-8 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
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

              <div>
                <p className="text-gray-400 text-sm">Product</p>
                <p className="text-white font-semibold">{selectedOrder.productName}</p>
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
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, status)}
                      className={`py-2 px-3 rounded text-sm font-semibold transition ${
                        selectedOrder.status === status
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {getDisplayStatus(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button onClick={() => setShowOrderModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition">
                  Close
                </button>
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
