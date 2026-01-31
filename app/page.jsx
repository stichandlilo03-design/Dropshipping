'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, Smartphone, Share2, Link as LinkIcon, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { getUser, logout, getToken } from '@/lib/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalCost: 0,
    totalOrders: 0,
    totalProducts: 0,
    profitMargin: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    const currentUser = getUser();
    const token = getToken();

    console.log('Current user:', currentUser);

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);

    // Get userId from different possible properties
    const userId = currentUser.uid || currentUser.id || currentUser.userId;
    
    console.log('User ID:', userId);

    if (!userId) {
      console.error('No valid user ID found');
      setLoading(false);
      return;
    }

    loadData(userId);
  }, [router]);

  const loadData = async (userId) => {
    try {
      setLoading(true);
      console.log('Loading data for user:', userId);

      // Validate userId is a string and not undefined
      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId:', userId);
        setLoading(false);
        return;
      }

      // Load orders from Firestore
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
        console.log('Orders loaded:', ordersData.length);
        setOrders(ordersData);
      } catch (ordersError) {
        console.error('Error loading orders:', ordersError);
        setOrders([]);
      }

      // Load products from Firestore
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
        console.log('Products loaded:', productsData.length);
        setProducts(productsData);
      } catch (productsError) {
        console.error('Error loading products:', productsError);
        setProducts([]);
      }

      // Load integrations from Firestore
      try {
        const integrationsData = {};
        const integrationsCollection = collection(firebaseDb, 'users', userId, 'integrations');
        const integrationsSnap = await getDocs(integrationsCollection);
        integrationsSnap.forEach(doc => {
          integrationsData[doc.id] = doc.data();
        });
        console.log('Integrations loaded:', Object.keys(integrationsData).length);
        setIntegrations(integrationsData);
      } catch (integrationsError) {
        console.error('Error loading integrations:', integrationsError);
        setIntegrations({});
      }

      // Calculate stats will be done after data is loaded
    } catch (error) {
      console.error('Fatal error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats when orders/products change
  useEffect(() => {
    if (!loading) {
      calculateStats(orders, products);
    }
  }, [orders, products, loading]);

  const calculateStats = (ordersData, productsData) => {
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
    });
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleExport = () => {
    if (user) {
      const data = {
        user: {
          email: user.email,
          exportedAt: new Date().toISOString(),
        },
        stats,
        ordersCount: orders.length,
        productsCount: products.length,
        integrationsConnected: Object.keys(integrations),
      };

      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `store_backup_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getWelcomeMessage = (totalOrders) => {
    const hour = new Date().getHours();
    let timeGreeting = '';

    if (hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour < 18) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }

    if (totalOrders === 0) {
      return `${timeGreeting}! Start by connecting integrations and adding your first product.`;
    } else if (totalOrders < 10) {
      return `${timeGreeting}! You're building momentum with ${totalOrders} orders. Keep it up! 🚀`;
    } else if (totalOrders < 50) {
      return `${timeGreeting}! Great work! ${totalOrders} orders processed. You're on the right track! 💪`;
    } else if (totalOrders < 100) {
      return `${timeGreeting}! Amazing! ${totalOrders} orders and counting. You're scaling! 📈`;
    } else {
      return `${timeGreeting}! Outstanding! ${totalOrders} orders processed. Your store is thriving! 🌟`;
    }
  };

  const getIntegrationStatus = () => {
    const connected = Object.keys(integrations).filter(key =>
      integrations[key]?.status === 'connected'
    );
    return {
      total: Object.keys(integrations).length,
      connected: connected.length,
    };
  };

  const intStatus = getIntegrationStatus();
  const isFullySetup = intStatus.connected >= 3 && Object.keys(integrations).length >= 3;

  // Generate chart data from orders
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
        console.error('Error processing order for chart:', e);
      }
    });

    return Object.values(data);
  };

  const chartData = generateChartData();

  const productPerformance = products.slice(0, 5).map((p, idx) => ({
    name: (p.name || `Product ${idx + 1}`).substring(0, 12),
    value: (idx + 1) * 20,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">DropBoard</h1>
            <p className="text-xs text-gray-400">Dropshipping Automation</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
              title="Export Data"
            >
              <Download size={20} className="text-gray-400" />
            </button>
            <Link
              href="/settings"
              className="p-2 hover:bg-gray-700 rounded-lg transition"
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
          <h2 className="text-5xl font-bold text-white">
            Welcome back! 👋
          </h2>
          <p className="text-lg text-gray-400">
            {getWelcomeMessage(stats.totalOrders)}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <span>📧 {user.email}</span>
          </div>
        </div>

        {/* Setup Status Banner */}
        {!isFullySetup && (
          <div className="card bg-yellow-500/5 border border-yellow-500/30">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Complete Setup for Full Automation
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {intStatus.connected >= 3
                    ? 'Great! Core integrations connected. Add more platforms to expand.'
                    : `Connect ${Math.max(0, 3 - intStatus.connected)} more integration(s) for full automation`}
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Link href="/integrations" className="btn btn-primary text-sm flex items-center gap-2">
                    <Zap size={16} />
                    Setup Integrations
                  </Link>
                  <Link href="/help" className="btn btn-secondary text-sm flex items-center gap-2">
                    <BookOpen size={16} />
                    View Setup Guide
                  </Link>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-400">{intStatus.connected}/3</p>
                <p className="text-xs text-gray-400">Connected</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner - All Connected */}
        {isFullySetup && (
          <div className="card bg-green-500/5 border border-green-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-400" />
              <div>
                <h3 className="font-bold text-green-400">✅ Full Automation Enabled</h3>
                <p className="text-xs text-gray-400 mt-1">All integrations connected. Orders will auto-process!</p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-white">${stats.totalRevenue}</p>
                <p className="text-xs text-green-400 mt-1">From {stats.totalOrders} orders</p>
              </div>
              <DollarSign size={32} className="text-green-500/20" />
            </div>
          </div>

          {/* Net Profit */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Net Profit</p>
                <p className="text-3xl font-bold text-accent">${stats.totalProfit}</p>
                <p className="text-xs text-blue-400 mt-1">{stats.profitMargin}% margin</p>
              </div>
              <TrendingUp size={32} className="text-accent/20" />
            </div>
          </div>

          {/* Total Cost */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Cost</p>
                <p className="text-3xl font-bold text-orange-400">${stats.totalCost}</p>
                <p className="text-xs text-orange-300 mt-1">COGS</p>
              </div>
              <Zap size={32} className="text-orange-500/20" />
            </div>
          </div>

          {/* Integrations Status */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Connected Integrations</p>
                <p className="text-3xl font-bold text-white">{Object.keys(integrations).length}</p>
                <p className="text-xs text-pink-400 mt-1">Platforms</p>
              </div>
              <Users size={32} className="text-pink-500/20" />
            </div>
          </div>

          {/* Total Orders */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats.totalOrders}</p>
                <p className="text-xs text-purple-400 mt-1">Avg ${stats.avgOrderValue}</p>
              </div>
              <ShoppingCart size={32} className="text-blue-500/20" />
            </div>
          </div>

          {/* Active Products */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Active Products</p>
                <p className="text-3xl font-bold text-white">{stats.totalProducts}</p>
                <p className="text-xs text-emerald-400 mt-1">In catalog</p>
              </div>
              <Package size={32} className="text-emerald-500/20" />
            </div>
          </div>
        </div>

        {/* Integration Status Cards */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Integration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Printful */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">📦 Printful</p>
                {integrations.printful?.status === 'connected' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Clock size={16} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {integrations.printful?.status === 'connected'
                  ? 'Connected'
                  : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.printful?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

            {/* Shopify */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">🛍️ Shopify</p>
                {integrations.shopify?.status === 'connected' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Clock size={16} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {integrations.shopify?.status === 'connected'
                  ? 'Connected'
                  : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.shopify?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

            {/* Stripe */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">💳 Stripe</p>
                {integrations.stripe?.status === 'connected' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Clock size={16} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {integrations.stripe?.status === 'connected'
                  ? 'Connected'
                  : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.stripe?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

            {/* TikTok */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">🎵 TikTok</p>
                {integrations['tiktok']?.status === 'connected' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Clock size={16} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {integrations['tiktok']?.status === 'connected'
                  ? 'Connected'
                  : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations['tiktok']?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

            {/* Gmail */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">📧 Gmail</p>
                {integrations['gmail-smtp']?.status === 'connected' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Clock size={16} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {integrations['gmail-smtp']?.status === 'connected'
                  ? 'Connected'
                  : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations['gmail-smtp']?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>
          </div>
        </div>

        {/* Charts */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 card">
              <h3 className="text-lg font-bold text-white mb-4">Revenue Overview (Weekly)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151' }}
                    formatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Products Chart */}
            {productPerformance.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">Top Products</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productPerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name }) => name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {productPerformance.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Orders */}
            <Link href="/orders" className="card group hover:border-accent transition">
              <ShoppingCart size={24} className="text-blue-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Orders</p>
              <p className="text-xs text-gray-400">{stats.totalOrders} orders</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                View <ArrowRight size={12} />
              </div>
            </Link>

            {/* Products */}
            <Link href="/products" className="card group hover:border-accent transition">
              <Package size={24} className="text-purple-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Products</p>
              <p className="text-xs text-gray-400">{stats.totalProducts} products</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Manage <ArrowRight size={12} />
              </div>
            </Link>

            {/* Integrations */}
            <Link href="/integrations" className="card group hover:border-accent transition">
              <Zap size={24} className="text-yellow-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Integrations</p>
              <p className="text-xs text-gray-400">{Object.keys(integrations).length} connected</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Setup <ArrowRight size={12} />
              </div>
            </Link>

            {/* Analytics */}
            <Link href="/analytics" className="card group hover:border-accent transition">
              <TrendingUp size={24} className="text-green-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Analytics</p>
              <p className="text-xs text-gray-400">Detailed insights</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                View <ArrowRight size={12} />
              </div>
            </Link>

            {/* Settings */}
            <Link href="/settings" className="card group hover:border-accent transition">
              <Settings size={24} className="text-orange-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Settings</p>
              <p className="text-xs text-gray-400">Configure automations</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Configure <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Get Started</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setup Guide */}
            <Link href="/help" className="card bg-gradient-to-br from-blue-500/10 to-accent/10 border border-accent/30 group hover:border-accent transition">
              <BookOpen size={32} className="text-accent mb-3 group-hover:scale-110 transition" />
              <h4 className="text-lg font-bold text-white mb-2">Setup Guide</h4>
              <p className="text-sm text-gray-400 mb-4">
                Complete guides on getting started and best practices.
              </p>
              <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                Read Guide <ArrowRight size={16} />
              </div>
            </Link>

            {/* Documentation */}
            <Link href="/docs" className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 group hover:border-accent transition">
              <LinkIcon size={32} className="text-purple-400 mb-3 group-hover:scale-110 transition" />
              <h4 className="text-lg font-bold text-white mb-2">Documentation</h4>
              <p className="text-sm text-gray-400 mb-4">
                API docs, integration guides, and troubleshooting.
              </p>
              <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                Explore <ArrowRight size={16} />
              </div>
            </Link>

            {/* Support */}
            <a href="mailto:support@dropboard.com" className="card bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 group hover:border-accent transition cursor-pointer">
              <Flame size={32} className="text-orange-400 mb-3 group-hover:scale-110 transition" />
              <h4 className="text-lg font-bold text-white mb-2">Support</h4>
              <p className="text-sm text-gray-400 mb-4">
                Have questions? Contact our support team.
              </p>
              <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                Contact <ArrowRight size={16} />
              </div>
            </a>
          </div>
        </div>

        {/* Empty State */}
        {orders.length === 0 && products.length === 0 && (
          <div className="card text-center py-12 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Ready to get started?</h3>
            <p className="text-gray-400 mb-6">
              Connect your integrations and add your first product to begin automating.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/integrations" className="btn btn-primary flex items-center gap-2">
                <Zap size={16} />
                Connect Integrations
              </Link>
              <Link href="/products" className="btn btn-secondary flex items-center gap-2">
                <Plus size={16} />
                Add Product
              </Link>
              <Link href="/help" className="btn btn-secondary flex items-center gap-2">
                <BookOpen size={16} />
                Learn More
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
