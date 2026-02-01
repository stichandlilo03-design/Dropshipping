
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, AlertCircle, CheckCircle, Clock, Lock, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';
import { fetchTrendingProducts, addTrendingProductToStore } from '@/lib/trending';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
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
    profitMargin: 0,
    avgOrderValue: 0,
    trendingAdded: 0,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
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

      console.log('[Dashboard] Loading data for userId:', userId);

      // Load orders
      try {
        const ordersQuery = query(
          collection(firebaseDb, 'orders'),
          where('userId', '==', userId)
        );
        const ordersSnap = await getDocs(ordersQuery);
        const ordersData = ordersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('[Dashboard] Orders loaded:', ordersData.length);
        setOrders(ordersData);
      } catch (ordersError) {
        console.error('[Dashboard] Error loading orders:', ordersError);
        setOrders([]);
      }

      // Load products
      try {
        const productsQuery = query(
          collection(firebaseDb, 'products'),
          where('userId', '==', userId)
        );
        const productsSnap = await getDocs(productsQuery);
        const productsData = productsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('[Dashboard] Products loaded:', productsData.length);
        setProducts(productsData);

        // Count products added from trending
        const trendingCount = productsData.filter(p => p.trendingSource).length;
        console.log('[Dashboard] Products from trending:', trendingCount);

        calculateStats(orders, productsData, trendingCount);
      } catch (productsError) {
        console.error('[Dashboard] Error loading products:', productsError);
        setProducts([]);
      }

      // Load integrations
      try {
        const integrationsData = {};
        const integrationsQuery = query(
          collection(firebaseDb, 'users', userId, 'integrations')
        );
        const integrationsSnap = await getDocs(integrationsQuery);
        integrationsSnap.forEach(doc => {
          integrationsData[doc.id] = doc.data();
        });
        console.log('[Dashboard] Integrations loaded:', Object.keys(integrationsData).length);
        setIntegrations(integrationsData);

        // Calculate feature availability
        calculateFeatureStatus(integrationsData);
      } catch (integrationsError) {
        console.error('[Dashboard] Error loading integrations:', integrationsError);
        setIntegrations({});
        setFeatureStatus({});
      }

      // Load trending products
      await loadTrendingProducts(userId);
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingProducts = async (userId) => {
    try {
      console.log('[Dashboard] 📥 Fetching trending products...');
      setTrendingLoading(true);
      setTrendingError(null);
      
      const result = await fetchTrendingProducts(userId);
      
      if (result.success) {
        console.log('[Dashboard] ✅ Got trending products:', result.products.length);
        setTrendingProducts(result.products);
        setTrendingStats(result.stats || {});
      } else {
        console.error('[Dashboard] ❌ Error:', result.error);
        setTrendingError(result.error);
        setTrendingProducts([]);
        setTrendingStats({});
      }
    } catch (error) {
      console.error('[Dashboard] ❌ Error loading trending:', error);
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
        
        // Reload products to show new count
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

  const calculateFeatureStatus = (integrationsData) => {
    const connected = {};
    Object.keys(integrationsData).forEach(key => {
      if (integrationsData[key]?.status === 'connected') {
        connected[key] = true;
      }
    });

    console.log('[Dashboard] Connected APIs:', Object.keys(connected));

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

  const calculateStats = (ordersData, productsData, trendingAdded = 0) => {
    try {
      const totalRevenue = ordersData.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
      const totalCost = ordersData.reduce((sum, order) => sum + (parseFloat(order.cost) || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
      const avgOrderValue = ordersData.length > 0 ? (totalRevenue / ordersData.length).toFixed(2) : 0;

      setStats({
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalCost: totalCost.toFixed(2),
        totalOrders: ordersData.length,
        totalProducts: productsData.length,
        profitMargin,
        avgOrderValue,
        trendingAdded,
      });
    } catch (error) {
      console.error('[Dashboard] Error calculating stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/auth/login');
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
        integrations: Object.keys(integrations),
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dropboard_backup_${Date.now()}.json`;
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
      return `${timeGreeting}! Start by discovering trending products or connecting integrations.`;
    } else if (trendingAdded > 0 && totalOrders === 0) {
      return `${timeGreeting}! You've added ${trendingAdded} products. Now let's get them some sales! 🚀`;
    } else if (totalOrders < 10) {
      return `${timeGreeting}! You're building momentum with ${totalOrders} orders from ${trendingAdded} trending products. Keep it up! 🚀`;
    } else if (totalOrders < 50) {
      return `${timeGreeting}! Great work! ${totalOrders} orders from ${trendingAdded} products. You're on the right track! 💪`;
    } else {
      return `${timeGreeting}! Amazing! ${totalOrders} orders and counting. Your store is thriving! 🌟`;
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

  const chartData = generateChartData();
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You need to be logged in</p>
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">📊 DropBoard</h1>
            <p className="text-xs text-gray-400">Dropshipping Automation Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-700 rounded-lg transition"
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
              className="p-2 hover:bg-slate-700 rounded-lg transition"
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2 mb-8">
          <h2 className="text-5xl font-bold text-white">Welcome back! 👋</h2>
          <p className="text-lg text-gray-400">
            {getWelcomeMessage(stats.totalOrders, stats.trendingAdded)}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <span>📧 {user.email || 'User'}</span>
            <span className="text-gray-700">•</span>
            <span>ID: {user.uid?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Message Alert */}
        {addMessage && (
          <div className={`p-4 rounded-lg border ${addMessage.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' : 'bg-red-900/30 border-red-500 text-red-200'}`}>
            {addMessage.text}
          </div>
        )}

        {/* Setup Banner */}
        {intStatus.total === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Get Started in 3 Steps
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Connect your first integration to unlock trending products and automation
                </p>
                <Link href="/integrations" className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
                  <Zap size={16} />
                  Connect Integrations
                </Link>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">0/{intStatus.total + 1}</p>
                <p className="text-xs text-gray-400">Integrations</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {intStatus.total > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-green-400">✅ Integrations Connected!</h3>
              <p className="text-xs text-gray-400 mt-1">{intStatus.total} platform{intStatus.total !== 1 ? 's' : ''} connected</p>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Revenue</p>
            <p className="text-2xl font-bold text-green-400">${stats.totalRevenue}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.totalOrders} orders</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Profit</p>
            <p className="text-2xl font-bold text-blue-400">${stats.totalProfit}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.profitMargin}% margin</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Cost</p>
            <p className="text-2xl font-bold text-orange-400">${stats.totalCost}</p>
            <p className="text-xs text-gray-500 mt-1">COGS</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Products</p>
            <p className="text-2xl font-bold text-purple-400">{stats.totalProducts}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.trendingAdded} from trending</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Integrations</p>
            <p className="text-2xl font-bold text-pink-400">{intStatus.total}</p>
            <p className="text-xs text-gray-500 mt-1">Connected</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Trending</p>
            <p className="text-2xl font-bold text-orange-400">{trendingProducts.length}</p>
            <p className="text-xs text-gray-500 mt-1">Available</p>
          </div>
        </div>

        {/* Trending Products Section */}
        {featureStatus.trendingProducts?.available ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Flame size={28} className="text-orange-400" />
                  🔥 Hot Trending Products
                </h3>
                {trendingStats.shopify > 0 && trendingStats.printful_custom > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    📊 Shopify: {trendingStats.shopify} | Printful Custom: {trendingStats.printful_custom} | Bestsellers: {trendingStats.printful_bestseller}
                  </p>
                )}
              </div>
              <Link href="/trending" className="text-blue-400 hover:text-blue-300 font-semibold transition text-sm flex items-center gap-1">
                View All ({trendingProducts.length}) <ArrowRight size={16} />
              </Link>
            </div>

            {trendingLoading ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400">Loading trending products...</p>
              </div>
            ) : trendingError ? (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-200">
                <p className="text-sm">❌ {trendingError}</p>
                <p className="text-xs mt-1">Check your integrations and try again</p>
              </div>
            ) : trendingProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingProducts.slice(0, 3).map((product) => (
                  <div key={product.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-orange-500 transition">
                    {product.image && (
                      <div className="h-32 overflow-hidden bg-slate-700">
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white text-sm line-clamp-2 flex-1">{product.title}</h4>
                        {product.badge && (
                          <span className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-bold flex-shrink-0 ml-2">
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
                        <p className="text-lg font-bold text-green-400">${parseFloat(product.price || 0).toFixed(2)}</p>
                      </div>

                      <button
                        onClick={() => handleAddProductToStore(product)}
                        disabled={addingProduct === product.id}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-medium text-sm transition flex items-center justify-center gap-2"
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                <Flame size={32} className="mx-auto text-orange-400 mb-2" />
                <p className="text-gray-400">No trending products available</p>
                <p className="text-xs text-gray-500 mt-1">Make sure Shopify or Printful integrations are connected</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 flex items-start gap-4">
            <Lock size={24} className="text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-400">🔒 Trending Products Locked</h3>
              <p className="text-sm text-gray-400 mt-1">
                Connect {featureStatus.trendingProducts?.missingAPIs?.join(' or ')} to access trending products
              </p>
              <Link href="/integrations" className="text-blue-400 text-sm font-semibold mt-2 inline-block hover:underline">
                Go to Integrations →
              </Link>
            </div>
          </div>
        )}

        {/* Integration Status */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Integration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { key: 'printful', icon: '📦', name: 'Printful' },
              { key: 'shopify', icon: '🛍️', name: 'Shopify' },
              { key: 'stripe', icon: '💳', name: 'Stripe' },
              { key: 'tiktok', icon: '🎵', name: 'TikTok' },
              { key: 'gmail-smtp', icon: '📧', name: 'Gmail' },
            ].map(({ key, icon, name }) => (
              <div key={key} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">{icon} {name}</p>
                  {integrations[key]?.status === 'connected' ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : (
                    <Clock size={16} className="text-gray-500" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-3">
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Revenue Overview (Weekly)</h3>
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

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Product Sources</h3>
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
          <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link href="/products" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition">
              <Package size={24} className="text-purple-400 mb-2" />
              <p className="font-semibold text-white">Products</p>
              <p className="text-xs text-gray-400">{stats.totalProducts} total</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-3">
                Manage <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/trending" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition">
              <Flame size={24} className="text-orange-400 mb-2" />
              <p className="font-semibold text-white">Trending</p>
              <p className="text-xs text-gray-400">{trendingProducts.length} hot items</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-3">
                Browse <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/orders" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition">
              <ShoppingCart size={24} className="text-blue-400 mb-2" />
              <p className="font-semibold text-white">Orders</p>
              <p className="text-xs text-gray-400">{stats.totalOrders} processed</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-3">
                View <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/integrations" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition">
              <Zap size={24} className="text-yellow-400 mb-2" />
              <p className="font-semibold text-white">Integrations</p>
              <p className="text-xs text-gray-400">{intStatus.total} connected</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-3">
                Setup <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/help" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-4 transition">
              <BookOpen size={24} className="text-pink-400 mb-2" />
              <p className="font-semibold text-white">Help & Docs</p>
              <p className="text-xs text-gray-400">Learn & support</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-3">
                Read <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {stats.totalProducts === 0 && trendingProducts.length === 0 && intStatus.total === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Welcome to DropBoard!</h3>
            <p className="text-gray-400 mb-6">Let's get you set up and ready to start your dropshipping business</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/integrations" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition inline-flex items-center gap-2">
                <Zap size={16} />
                Connect First Integration
              </Link>
              <Link href="/help" className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition inline-flex items-center gap-2">
                <BookOpen size={16} />
                View Setup Guide
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
