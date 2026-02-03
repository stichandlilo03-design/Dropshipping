'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, AlertCircle, CheckCircle, Clock, Lock, ArrowLeft, Eye, Trash2, Search, Mail, Share2, Loader } from 'lucide-react';
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
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState(null);
  const [trendingStats, setTrendingStats] = useState({ shopify: 0, printful_custom: 0, printful_bestseller: 0 });
  const [loading, setLoading] = useState(true);
  const [featureStatus, setFeatureStatus] = useState({});
  const [addingProduct, setAddingProduct] = useState(null);
  const [addMessage, setAddMessage] = useState(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalCost: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    profitMargin: 0,
    avgOrderValue: 0,
    trendingAdded: 0,
    automationStats: {
      emailsSent: 0,
      ordersShipped: 0,
      socialPosts: 0,
      printfulSynced: 0,
    },
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [automationFeatures, setAutomationFeatures] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/admin/login');
        return;
      }

      setUser(currentUser);
      await loadData(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadData = async (userId) => {
    try {
      setLoading(true);

      if (!userId) {
        console.error('No userId provided');
        return;
      }

      console.log('[AdminDashboard] Loading data for userId:', userId);

      // STEP 1: Load orders
      let loadedOrders = [];
      try {
        console.log('[AdminDashboard] Fetching all orders');
        const ordersRef = collection(firebaseDb, 'orders');
        const ordersSnap = await getDocs(ordersRef);
        loadedOrders = ordersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('[AdminDashboard] Orders loaded:', loadedOrders.length);
        setOrders(loadedOrders);
      } catch (ordersError) {
        console.error('[AdminDashboard] Error loading orders:', ordersError);
        loadedOrders = [];
        setOrders([]);
      }

      // STEP 2: Load products
      let loadedProducts = [];
      try {
        console.log('[AdminDashboard] Fetching all products');
        const productsRef = collection(firebaseDb, 'products');
        const productsSnap = await getDocs(productsRef);
        loadedProducts = productsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('[AdminDashboard] Products loaded:', loadedProducts.length);
        setProducts(loadedProducts);

        const trendingCount = loadedProducts.filter(p => p.trendingSource).length;
        calculateStats(loadedOrders, loadedProducts, trendingCount);
      } catch (productsError) {
        console.error('[AdminDashboard] Error loading products:', productsError);
        loadedProducts = [];
        setProducts([]);
        calculateStats(loadedOrders, [], 0);
      }

      // STEP 3: Load customers
      let loadedCustomers = [];
      try {
        console.log('[AdminDashboard] Fetching all customers');
        const customersRef = collection(firebaseDb, 'customers');
        const customersSnap = await getDocs(customersRef);
        loadedCustomers = customersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('[AdminDashboard] Customers loaded:', loadedCustomers.length);
        setCustomers(loadedCustomers);
      } catch (customersError) {
        console.error('[AdminDashboard] Error loading customers:', customersError);
        setCustomers([]);
      }

      // STEP 4: Load integrations
      try {
        const integrationsData = {};
        const integrationsQuery = query(
          collection(firebaseDb, `users/${userId}/integrations`)
        );
        const integrationsSnap = await getDocs(integrationsQuery);
        integrationsSnap.forEach(doc => {
          integrationsData[doc.id] = doc.data();
        });
        console.log('[AdminDashboard] Integrations loaded:', Object.keys(integrationsData).length);
        setIntegrations(integrationsData);

        calculateFeatureStatus(integrationsData);
      } catch (integrationsError) {
        console.error('[AdminDashboard] Error loading integrations:', integrationsError);
        setIntegrations({});
        setFeatureStatus({});
      }

      // STEP 5: Load trending products
      await loadTrendingProducts(userId);
    } catch (error) {
      console.error('[AdminDashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingProducts = async (userId) => {
    try {
      console.log('[AdminDashboard] 📥 Fetching trending products...');
      setTrendingLoading(true);
      setTrendingError(null);
      
      const result = await fetchTrendingProducts(userId);
      
      if (result.success) {
        console.log('[AdminDashboard] ✅ Got trending products:', result.products.length);
        setTrendingProducts(result.products);
        setTrendingStats(result.stats || {});
      } else {
        console.error('[AdminDashboard] ❌ Error:', result.error);
        setTrendingError(result.error);
        setTrendingProducts([]);
        setTrendingStats({});
      }
    } catch (error) {
      console.error('[AdminDashboard] ❌ Error loading trending:', error);
      setTrendingError(error.message);
      setTrendingProducts([]);
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
          await loadData(user.uid);
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
      
      await loadData(user.uid);
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
      await loadData(user.uid);
      setShowOrderModal(false);
      setAddMessage({ type: 'success', text: 'Order deleted!' });
      setTimeout(() => setAddMessage(null), 2000);
    } catch (error) {
      console.error('Error deleting order:', error);
      setAddMessage({ type: 'error', text: 'Failed to delete order' });
    }
  };

  const calculateFeatureStatus = (integrationsData) => {
    const connected = {};
    Object.keys(integrationsData).forEach(key => {
      if (integrationsData[key]?.status === 'connected') {
        connected[key] = true;
      }
    });

    console.log('[AdminDashboard] Connected APIs:', Object.keys(connected));

    // ✅ NEW: Calculate automation features
    const automation = {
      emailAutomation: {
        available: connected['gmail-smtp'] || connected['sendgrid'],
        icon: '📧',
        name: 'Email Automation',
        description: 'Order confirmations & shipping emails',
        missingAPIs: (!connected['gmail-smtp'] && !connected['sendgrid']) ? ['Gmail SMTP or SendGrid'] : [],
      },
      shippingAutomation: {
        available: connected['printful'] && connected['cron-shipping'],
        icon: '🚚',
        name: 'Auto-Shipping',
        description: 'Track orders every 6 hours',
        missingAPIs: [],
      },
      socialPublishing: {
        available: connected['tiktok'] || connected['instagram'] || connected['facebook'] || connected['pinterest'],
        icon: '📱',
        name: 'Social Publishing',
        description: 'One-click product publishing',
        missingAPIs: [],
      },
      printfulAutomation: {
        available: connected['printful'],
        icon: '📦',
        name: 'Printful Auto-Sync',
        description: 'Auto-sync orders & labels',
        missingAPIs: !connected['printful'] ? ['Printful'] : [],
      },
    };

    setAutomationFeatures(automation);

    const features = {
      trendingProducts: {
        available: connected['printful'] || connected['shopify'],
        missingAPIs: (!connected['printful'] && !connected['shopify']) ? ['Shopify or Printful'] : [],
      },
      orders: {
        available: connected['shopify'],
        missingAPIs: !connected['shopify'] ? ['Shopify'] : [],
      },
      products: {
        available: connected['shopify'],
        missingAPIs: !connected['shopify'] ? ['Shopify'] : [],
      },
      analytics: {
        available: connected['shopify'],
        missingAPIs: !connected['shopify'] ? ['Shopify'] : [],
      },
    };

    setFeatureStatus(features);
  };

  const calculateStats = (ordersData = [], productsData = [], trendingAdded = 0) => {
    try {
      console.log('[AdminDashboard] Calculating stats');
      
      let totalRevenue = 0;
      let totalCost = 0;
      let paidOrdersCount = 0;
      let shippedOrders = 0;

      ordersData.forEach(order => {
        const orderTotal = parseFloat(order.total || 0);
        const orderStatus = String(order.status || '').toLowerCase();

        if (orderStatus === 'paid' || orderStatus === 'completed' || orderStatus === 'shipped') {
          totalRevenue += orderTotal;
          paidOrdersCount++;
        }

        if (orderStatus === 'shipped' || orderStatus === 'delivered') {
          shippedOrders++;
        }

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const itemCost = parseFloat(item.cost || (orderTotal * 0.1) || 0);
            const qty = parseInt(item.quantity || 1);
            totalCost += itemCost * qty;
          });
        }
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0;
      const avgOrderValue = paidOrdersCount > 0 ? parseFloat((totalRevenue / paidOrdersCount).toFixed(2)) : 0;

      let activeCustomers = 0;
      customers.forEach(customer => {
        const hasOrder = ordersData.some(
          order => 
            order.customerId === customer.id || 
            order.customerEmail === customer.email
        );
        if (hasOrder) activeCustomers++;
      });

      setStats({
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalOrders: ordersData.length,
        totalProducts: productsData.length,
        totalCustomers: customers.length,
        activeCustomers: activeCustomers,
        profitMargin,
        avgOrderValue,
        trendingAdded,
        automationStats: {
          emailsSent: paidOrdersCount, // Each paid order gets confirmation email
          ordersShipped: shippedOrders,
          socialPosts: productsData.filter(p => p.socialPosts?.length > 0).length,
          printfulSynced: ordersData.filter(o => o.printful_synced).length,
        },
      });
    } catch (error) {
      console.error('[AdminDashboard] Error calculating stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleExport = () => {
    if (user) {
      const data = {
        user: {
          email: user.email,
          uid: user.uid,
          exportedAt: new Date().toISOString(),
        },
        stats,
        orders,
        products,
        customers,
        integrations: Object.keys(integrations),
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dropboard_admin_backup_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getWelcomeMessage = (totalOrders, trendingAdded) => {
    const hour = new Date().getHours();
    let timeGreeting = '';

    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    if (totalOrders === 0 && trendingAdded === 0) {
      return `${timeGreeting}! Start by reviewing the platform or connecting integrations.`;
    } else if (trendingAdded > 0 && totalOrders === 0) {
      return `${timeGreeting}! ${trendingAdded} products added. Waiting for sales! 🚀`;
    } else if (totalOrders < 10) {
      return `${timeGreeting}! Platform has ${totalOrders} orders from ${trendingAdded} trending products. Keep it up! 🚀`;
    } else if (totalOrders < 50) {
      return `${timeGreeting}! Great work! ${totalOrders} orders from ${trendingAdded} products. Growing! 💪`;
    } else {
      return `${timeGreeting}! Amazing! ${totalOrders} orders and counting. Platform is thriving! 🌟`;
    }
  };

  const getIntegrationStatus = () => {
    const connected = Object.keys(integrations).filter(key =>
      integrations[key]?.status === 'connected'
    );
    return {
      total: connected.length,
      hasShopify: connected.includes('shopify'),
      hasPrintful: connected.includes('printful'),
      hasEmail: connected.includes('gmail-smtp') || connected.includes('sendgrid'),
      hasSocial: connected.includes('tiktok') || connected.includes('instagram') || connected.includes('facebook') || connected.includes('pinterest'),
    };
  };

  const intStatus = getIntegrationStatus();

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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const chartData = generateChartData();
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You need to be logged in</p>
          <Link href="/admin/login" className="text-blue-400 hover:underline">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">📊 DropBoard Admin</h1>
            <p className="text-xs sm:text-sm text-gray-400 truncate">100% Automated Platform Management</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-700 rounded-lg transition hidden sm:block"
              title="Export Data"
            >
              <Download size={20} className="text-gray-400" />
            </button>
            <Link
              href="/integrations"
              className="p-2 hover:bg-slate-700 rounded-lg transition"
              title="Integrations"
            >
              <Zap size={20} className="text-gray-400" />
            </Link>
            <Link
              href="/settings"
              className="p-2 hover:bg-slate-700 rounded-lg transition hidden sm:block"
              title="Settings"
            >
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2 mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">Welcome back, Admin! 👋</h2>
          <p className="text-base sm:text-lg text-gray-400">
            {getWelcomeMessage(stats.totalOrders, stats.trendingAdded)}
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs sm:text-sm text-gray-500 mt-4">
            <span>📧 {user.email || 'Admin'}</span>
            <span className="hidden sm:block text-gray-700">•</span>
            <span>ID: {user.uid?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Message Alert */}
        {addMessage && (
          <div className={`p-3 sm:p-4 rounded-lg border text-sm flex items-center gap-2 ${addMessage.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' : 'bg-red-900/30 border-red-500 text-red-200'}`}>
            {addMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {addMessage.text}
          </div>
        )}

        {/* ✅ NEW: Automation Status Overview */}
        {(intStatus.hasEmail || intStatus.hasSocial || intStatus.hasPrintful) && (
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
              <Zap size={24} />
              🚀 Automation Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-gray-400 text-xs font-semibold mb-1">📧 Emails Sent</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.automationStats.emailsSent}</p>
                <p className="text-xs text-gray-500 mt-1">Auto confirmations</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-gray-400 text-xs font-semibold mb-1">🚚 Orders Shipped</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-400">{stats.automationStats.ordersShipped}</p>
                <p className="text-xs text-gray-500 mt-1">Tracking updated</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-gray-400 text-xs font-semibold mb-1">📱 Social Posts</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-400">{stats.automationStats.socialPosts}</p>
                <p className="text-xs text-gray-500 mt-1">Published products</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <p className="text-gray-400 text-xs font-semibold mb-1">📦 Printful Synced</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-400">{stats.automationStats.printfulSynced}</p>
                <p className="text-xs text-gray-500 mt-1">Auto fulfillment</p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Automation Features */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap size={24} className="text-yellow-400" />
            Automation Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(automationFeatures).map(([key, feature]) => (
              <div key={key} className={`rounded-lg border p-4 sm:p-5 transition ${
                feature.available
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-slate-800/50 border-slate-700'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <p className="text-2xl sm:text-3xl">{feature.icon}</p>
                  {feature.available ? (
                    <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <Lock size={20} className="text-gray-500 flex-shrink-0" />
                  )}
                </div>
                <h4 className="font-bold text-white text-sm sm:text-base mb-1">{feature.name}</h4>
                <p className="text-xs text-gray-400 mb-3">{feature.description}</p>
                {feature.available ? (
                  <span className="inline-block bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-semibold">
                    ✅ Active
                  </span>
                ) : (
                  <div className="text-xs text-gray-500">
                    <p className="mb-1">Missing: {feature.missingAPIs.join(', ')}</p>
                    <Link href="/integrations" className="text-blue-400 font-semibold hover:underline">
                      Connect →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Setup Banner */}
        {intStatus.total === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Get Started in 3 Steps
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-4">
                  Connect integrations to unlock automation, trending products, and social publishing
                </p>
                <Link href="/integrations" className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-xs sm:text-sm">
                  <Zap size={16} />
                  Connect Integrations
                </Link>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">0/{intStatus.total + 1}</p>
                <p className="text-xs text-gray-400">Integrations</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {intStatus.total > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4 flex items-start sm:items-center gap-3">
            <CheckCircle size={24} className="text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h3 className="font-bold text-green-400 text-sm sm:text-base">✅ Integrations Connected!</h3>
              <p className="text-xs text-gray-400 mt-1">{intStatus.total} platform{intStatus.total !== 1 ? 's' : ''} connected - Automation active! 🚀</p>
            </div>
          </div>
        )}

        {/* Key Metrics - Enhanced */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 space-y-1">
            <p className="text-gray-400 text-xs font-medium">💰 Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-green-400">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{stats.totalOrders} orders</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 space-y-1">
            <p className="text-gray-400 text-xs font-medium">📈 Profit</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-400">${stats.totalProfit.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{stats.profitMargin}% margin</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 space-y-1">
            <p className="text-gray-400 text-xs font-medium">💳 Cost</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-400">${stats.totalCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500">COGS</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 space-y-1">
            <p className="text-gray-400 text-xs font-medium">📦 Products</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-400">{stats.totalProducts}</p>
            <p className="text-xs text-gray-500">{stats.trendingAdded} trending</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 space-y-1">
            <p className="text-gray-400 text-xs font-medium">👥 Customers</p>
            <p className="text-xl sm:text-2xl font-bold text-pink-400">{stats.totalCustomers}</p>
            <p className="text-xs text-gray-500">{stats.activeCustomers} active</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 space-y-1">
            <p className="text-gray-400 text-xs font-medium">⚡ Integrations</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-400">{intStatus.total}</p>
            <p className="text-xs text-gray-500">Connected</p>
          </div>
        </div>

        {/* Trending Products Section */}
        {featureStatus.trendingProducts?.available ? (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Flame size={28} className="text-orange-400" />
                  🔥 Hot Trending Products
                </h3>
                {trendingStats.shopify > 0 && trendingStats.printful_custom > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    📊 Shopify: {trendingStats.shopify} | Printful Custom: {trendingStats.printful_custom} | Bestsellers: {trendingStats.printful_bestseller}
                  </p>
                )}
              </div>
              <Link href="/trending" className="text-blue-400 hover:text-blue-300 font-semibold transition text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap">
                View All ({trendingProducts.length}) <ArrowRight size={16} />
              </Link>
            </div>

            {trendingLoading ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sm:p-8 text-center">
                <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading trending products...</p>
              </div>
            ) : trendingError ? (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
                <p>❌ {trendingError}</p>
                <p className="text-xs mt-1">Check your integrations and try again</p>
              </div>
            ) : trendingProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {trendingProducts.slice(0, 3).map((product) => (
                  <div key={product.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-orange-500 transition">
                    {product.image && (
                      <div className="h-32 overflow-hidden bg-slate-700">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h4 className="font-semibold text-white text-xs sm:text-sm line-clamp-2 flex-1">{product.title}</h4>
                        {product.badge && (
                          <span className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-bold flex-shrink-0">
                            {product.badge}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs font-medium w-fit px-2 py-1 rounded mb-2 ${product.supplier?.includes('Shopify') ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                        {product.supplier}
                      </p>

                      {product.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{product.description}</p>
                      )}

                      {product.reviews && (
                        <p className="text-xs text-yellow-400 mb-2">⭐ {product.rating || 4.5} ({product.reviews} reviews)</p>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <p className="text-base sm:text-lg font-bold text-green-400">${parseFloat(product.price || 0).toFixed(2)}</p>
                      </div>

                      <button
                        onClick={() => handleAddProductToStore(product)}
                        disabled={addingProduct === product.id}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2"
                      >
                        {addingProduct === product.id ? (
                          <>
                            <Loader size={16} className="animate-spin" />
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 sm:p-8 text-center">
                <Flame size={32} className="mx-auto text-orange-400 mb-2" />
                <p className="text-gray-400 text-sm">No trending products available</p>
                <p className="text-xs text-gray-500 mt-1">Make sure Shopify or Printful integrations are connected</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 sm:p-6 flex items-start gap-4">
            <Lock size={24} className="text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-400 text-sm sm:text-base">🔒 Trending Products Locked</h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Connect {featureStatus.trendingProducts?.missingAPIs?.join(' or ')} to access trending products
              </p>
              <Link href="/integrations" className="text-blue-400 text-xs font-semibold mt-2 inline-block hover:underline">
                Go to Integrations →
              </Link>
            </div>
          </div>
        )}

        {/* Orders Section */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white">All Orders</h3>
            <span className="text-xs sm:text-sm text-gray-400">{filteredOrders.length} orders</span>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search orders..."
                className="w-full px-4 py-2 pl-10 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 sm:px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
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
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400">Customer</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400 hidden sm:table-cell">Product</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400 hidden md:table-cell">Email</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400">Total</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400">Status</th>
                    <th className="px-3 sm:px-6 py-3 text-right font-semibold text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="px-3 sm:px-6 py-3 font-semibold text-white text-xs sm:text-sm">{order.customerName}</td>
                        <td className="px-3 sm:px-6 py-3 text-gray-300 hidden sm:table-cell text-xs sm:text-sm truncate">{order.productName}</td>
                        <td className="px-3 sm:px-6 py-3 text-gray-300 hidden md:table-cell text-xs break-all">{order.customerEmail}</td>
                        <td className="px-3 sm:px-6 py-3 font-semibold text-green-400 text-xs sm:text-sm">${order.total?.toFixed(2)}</td>
                        <td className="px-3 sm:px-6 py-3">
                          <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            order.status === 'completed' || order.status === 'paid'
                              ? 'bg-green-500/10 text-green-400'
                              : order.status === 'processing'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : order.status === 'shipped'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-orange-500/10 text-orange-400'
                          }`}>
                            {order.status === 'pending_payment' ? 'Pending' : order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 text-right">
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
                      <td colSpan="6" className="px-3 sm:px-6 py-8 text-center text-gray-400 text-xs sm:text-sm">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customers Section */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">Customers</h3>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400">Name</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400 hidden sm:table-cell">Email</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400 hidden md:table-cell">Phone</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400">Total Spent</th>
                    <th className="px-3 sm:px-6 py-3 text-left font-semibold text-gray-400">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length > 0 ? (
                    customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="px-3 sm:px-6 py-3 font-semibold text-white text-xs sm:text-sm">{customer.firstName} {customer.lastName}</td>
                        <td className="px-3 sm:px-6 py-3 text-gray-300 hidden sm:table-cell text-xs break-all">{customer.email}</td>
                        <td className="px-3 sm:px-6 py-3 text-gray-300 hidden md:table-cell text-xs">{customer.phone || 'N/A'}</td>
                        <td className="px-3 sm:px-6 py-3 font-semibold text-green-400 text-xs sm:text-sm">${customer.total_spent?.toFixed(2) || '0.00'}</td>
                        <td className="px-3 sm:px-6 py-3 text-blue-400 text-xs sm:text-sm">{customer.order_count || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-3 sm:px-6 py-8 text-center text-gray-400 text-xs sm:text-sm">
                        No customers yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">All Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {products.length > 0 ? (
              products.map((product) => (
                <div key={product.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500 transition">
                  {product.image && (
                    <div className="h-40 overflow-hidden bg-slate-700">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-3 sm:p-4">
                    <h4 className="font-semibold text-white line-clamp-2 mb-2 text-xs sm:text-sm">{product.name}</h4>
                    <p className="text-lg sm:text-xl font-bold text-green-400 mb-3">${parseFloat(product.price || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mb-2">Category: {product.category || 'N/A'}</p>
                    {product.trendingSource && (
                      <p className="text-xs text-orange-400 mb-2">📊 From: {product.trendingSource}</p>
                    )}
                    {product.socialPosts && product.socialPosts.length > 0 && (
                      <p className="text-xs text-purple-400 mb-2">📱 {product.socialPosts.length} social post{product.socialPosts.length > 1 ? 's' : ''}</p>
                    )}
                    <p className="text-xs text-gray-500">Stock: {product.inventory || 0}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-8 text-gray-400 text-sm">
                No products yet
              </div>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">Integration Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { key: 'printful', icon: '📦', name: 'Printful', category: 'Fulfillment' },
              { key: 'shopify', icon: '🛍️', name: 'Shopify', category: 'Store' },
              { key: 'stripe', icon: '💳', name: 'Stripe', category: 'Payment' },
              { key: 'tiktok', icon: '🎵', name: 'TikTok', category: 'Social' },
              { key: 'gmail-smtp', icon: '📧', name: 'Gmail', category: 'Email' },
              { key: 'instagram', icon: '📷', name: 'Instagram', category: 'Social' },
            ].map(({ key, icon, name, category }) => (
              <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <p className="text-xs sm:text-sm font-semibold text-white">{icon} {name}</p>
                  {integrations[key]?.status === 'connected' ? (
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <Clock size={16} className="text-gray-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{category}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {integrations[key]?.status === 'connected' ? '✅ Connected' : '⏳ Not connected'}
                </p>
                <Link href="/integrations" className="text-blue-400 text-xs font-semibold hover:underline">
                  {integrations[key]?.status === 'connected' ? 'Manage →' : 'Connect →'}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4">Revenue Overview (Weekly)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-4">Product Sources</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Shopify', value: trendingStats.shopify || 0 },
                      { name: 'Printful Custom', value: trendingStats.printful_custom || 0 },
                      { name: 'Bestsellers', value: trendingStats.printful_bestseller || 0 },
                    ].filter(p => p.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[COLORS[0], COLORS[1], COLORS[2]].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
            <Link href="/products" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 sm:p-4 transition">
              <Package size={20} className="text-purple-400 mb-2" />
              <p className="font-semibold text-white text-xs sm:text-sm">Products</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalProducts} total</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-2">
                Manage <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/products" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 sm:p-4 transition">
              <Share2 size={20} className="text-purple-400 mb-2" />
              <p className="font-semibold text-white text-xs sm:text-sm">Publish</p>
              <p className="text-xs text-gray-400 mt-1">Social Media</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-2">
                Publish <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/trending" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 sm:p-4 transition">
              <Flame size={20} className="text-orange-400 mb-2" />
              <p className="font-semibold text-white text-xs sm:text-sm">Trending</p>
              <p className="text-xs text-gray-400 mt-1">{trendingProducts.length} hot</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-2">
                Browse <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/orders" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 sm:p-4 transition">
              <ShoppingCart size={20} className="text-blue-400 mb-2" />
              <p className="font-semibold text-white text-xs sm:text-sm">Orders</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalOrders}</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-2">
                View <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/integrations" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 sm:p-4 transition">
              <Zap size={20} className="text-yellow-400 mb-2" />
              <p className="font-semibold text-white text-xs sm:text-sm">Integrations</p>
              <p className="text-xs text-gray-400 mt-1">{intStatus.total}</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-2">
                Setup <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/help" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-3 sm:p-4 transition">
              <BookOpen size={20} className="text-pink-400 mb-2" />
              <p className="font-semibold text-white text-xs sm:text-sm">Help</p>
              <p className="text-xs text-gray-400 mt-1">Support</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-2">
                Read <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-6 sm:p-8 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Order Details</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-white text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Customer</p>
                  <p className="text-white font-semibold text-sm">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-semibold text-sm break-all">{selectedOrder.customerEmail}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Product</p>
                <p className="text-white font-semibold text-sm">{selectedOrder.productName}</p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-gray-400 text-sm mb-3">Financial Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">Subtotal</p>
                    <p className="text-blue-400 font-bold text-sm">${selectedOrder.subtotal?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Tax</p>
                    <p className="text-yellow-400 font-bold text-sm">${selectedOrder.tax?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Total</p>
                    <p className="text-green-400 font-bold text-sm">${selectedOrder.total?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-gray-400 text-sm mb-3">Update Status</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['pending_payment', 'paid', 'processing', 'shipped', 'completed'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, status)}
                      className={`py-2 px-2 sm:px-3 rounded text-xs font-semibold transition ${
                        selectedOrder.status === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      {status === 'pending_payment' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button onClick={() => setShowOrderModal(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition text-sm">
                  Close
                </button>
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition text-sm"
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
