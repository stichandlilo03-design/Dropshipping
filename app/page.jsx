'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, Smartphone, Share2, Link as LinkIcon, Eye } from 'lucide-react';
import { getUser, logout, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [integrations, setIntegrations] = useState({});
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
    loadData(currentUser.id);
  }, [router]);

  const loadData = (userId) => {
    const userOrders = db.getOrders(userId);
    const userProducts = db.getProducts(userId);
    const userAnalytics = db.getAnalytics(userId);
    const userSettings = db.getSettings(userId);

    setOrders(userOrders);
    setProducts(userProducts);
    setAnalytics(userAnalytics);
    setIntegrations(userSettings.integrations || {});
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleExport = () => {
    if (user) {
      const data = db.exportData(user.id);
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${user.storeName}_backup_${Date.now()}.json`;
      link.click();
    }
  };

  const getWelcomeMessage = (storeName, totalOrders) => {
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
      return `${timeGreeting}! Start by adding your first product and order to begin your dropshipping journey.`;
    } else if (totalOrders < 10) {
      return `${timeGreeting}! You're building momentum with ${totalOrders} orders. Keep it up! 🚀`;
    } else if (totalOrders < 50) {
      return `${timeGreeting}! Great work! ${totalOrders} orders processed. You're on the right track! 💪`;
    } else if (totalOrders < 100) {
      return `${timeGreeting}! Amazing! ${totalOrders} orders and counting. You're scaling! 📈`;
    } else {
      return `${timeGreeting}! Outstanding! ${totalOrders} orders processed. ${storeName} is thriving! 🌟`;
    }
  };

  if (!mounted || !user || !analytics) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const chartData = [
    { day: 'Mon', revenue: orders.length > 0 ? orders[0]?.amount || 0 : 0, orders: 1 },
    { day: 'Tue', revenue: orders.length > 1 ? orders[1]?.amount || 0 : 0, orders: 1 },
    { day: 'Wed', revenue: orders.reduce((sum, o) => sum + (o.amount || 0), 0) / 3, orders: 2 },
    { day: 'Thu', revenue: 0, orders: 0 },
    { day: 'Fri', revenue: 0, orders: 0 },
    { day: 'Sat', revenue: 0, orders: 0 },
    { day: 'Sun', revenue: 0, orders: 0 },
  ];

  const productPerformance = products.map((p, idx) => ({
    name: p.name,
    value: (idx + 1) * 20,
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const connectedCount = Object.keys(integrations).length;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">DropBoard</h1>
            <p className="text-xs text-gray-400">{user.storeName}</p>
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
        {/* Page Header - PERSONALIZED WELCOME */}
        <div className="space-y-2 mb-8">
          <h2 className="text-5xl font-bold text-white">
            Welcome back to <span className="text-accent">{user.storeName}</span>! 👋
          </h2>
          <p className="text-lg text-gray-400">
            {getWelcomeMessage(user.storeName, analytics.totalOrders)}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <span>📧 {user.email}</span>
            <span className="text-gray-700">•</span>
            <span>Account ID: {user.id.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Status Banner */}
        {connectedCount === 0 && (
          <div className="card bg-yellow-500/5 border border-yellow-500/30">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-yellow-400 mb-2">🚀 Get Started in 3 Steps</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Connect your store, add suppliers, and start automating orders.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Link href="/integrations" className="btn btn-primary text-sm flex items-center gap-2">
                    <Zap size={16} />
                    Setup Integrations
                  </Link>
                  <Link href="/help" className="btn btn-secondary text-sm flex items-center gap-2">
                    <BookOpen size={16} />
                    Read Guide
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-white">${analytics.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-green-400 mt-1">From {analytics.totalOrders} orders</p>
              </div>
              <DollarSign size={32} className="text-green-500/20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Net Profit</p>
                <p className="text-3xl font-bold text-accent">${analytics.totalProfit.toFixed(2)}</p>
                <p className="text-xs text-blue-400 mt-1">{analytics.profitMargin}% margin</p>
              </div>
              <TrendingUp size={32} className="text-accent/20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Cost</p>
                <p className="text-3xl font-bold text-orange-400">${analytics.totalCost.toFixed(2)}</p>
                <p className="text-xs text-orange-300 mt-1">Supplier expenses</p>
              </div>
              <Zap size={32} className="text-orange-500/20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-white">{analytics.totalOrders}</p>
                <p className="text-xs text-purple-400 mt-1">Avg ${analytics.avgOrderValue}</p>
              </div>
              <ShoppingCart size={32} className="text-blue-500/20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Active Products</p>
                <p className="text-3xl font-bold text-white">{analytics.totalProducts}</p>
                <p className="text-xs text-emerald-400 mt-1">In inventory</p>
              </div>
              <Package size={32} className="text-emerald-500/20" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">Connected Integrations</p>
                <p className="text-3xl font-bold text-white">{connectedCount}</p>
                <p className="text-xs text-pink-400 mt-1">Platforms connected</p>
              </div>
              <Users size={32} className="text-pink-500/20" />
            </div>
          </div>
        </div>

        {/* Trending Products Widget */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Flame size={28} className="text-orange-400" />
              🔥 Trending Right Now
            </h3>
            <Link href="/trending" className="text-accent hover:text-emerald-400 font-semibold transition text-sm">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Trending Product 1 */}
            <div className="card bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 group hover:border-accent transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-orange-400 font-bold">🔥 TRENDING #1</p>
                  <h4 className="text-base font-bold text-white">Programmer Coffee T-Shirt</h4>
                </div>
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded text-xs font-bold">9.2/10</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Perfect for developers</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">Est. Sales</p>
                  <p className="text-sm font-bold text-white">500+</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Margin</p>
                  <p className="text-sm font-bold text-green-400">58%</p>
                </div>
              </div>
              <Link href="/trending" className="w-full btn btn-primary text-xs flex items-center justify-center gap-2 py-2">
                <Plus size={14} />
                Add to Store
              </Link>
            </div>

            {/* Trending Product 2 */}
            <div className="card bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 group hover:border-accent transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-pink-400 font-bold">🔥 TRENDING #2</p>
                  <h4 className="text-base font-bold text-white">Dog Mom Hoodie</h4>
                </div>
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded text-xs font-bold">8.7/10</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">For dog lovers</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">Est. Sales</p>
                  <p className="text-sm font-bold text-white">800+</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Margin</p>
                  <p className="text-sm font-bold text-green-400">62%</p>
                </div>
              </div>
              <Link href="/trending" className="w-full btn btn-primary text-xs flex items-center justify-center gap-2 py-2">
                <Plus size={14} />
                Add to Store
              </Link>
            </div>

            {/* Trending Product 3 */}
            <div className="card bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/30 group hover:border-accent transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-green-400 font-bold">🔥 TRENDING #3</p>
                  <h4 className="text-base font-bold text-white">Yoga Zen Mug</h4>
                </div>
                <span className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-2 py-1 rounded text-xs font-bold">8.1/10</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Perfect for yoga lovers</p>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">Est. Sales</p>
                  <p className="text-sm font-bold text-white">1,200+</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Margin</p>
                  <p className="text-sm font-bold text-green-400">64%</p>
                </div>
              </div>
              <Link href="/trending" className="w-full btn btn-primary text-xs flex items-center justify-center gap-2 py-2">
                <Plus size={14} />
                Add to Store
              </Link>
            </div>
          </div>
        </div>

        {/* Charts */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div className="lg:col-span-2 card">
              <h3 className="text-lg font-bold text-white mb-4">Revenue Overview</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Orders */}
            <Link href="/orders" className="card group hover:border-accent transition">
              <ShoppingCart size={24} className="text-blue-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Orders</p>
              <p className="text-xs text-gray-400">{analytics.totalOrders} orders</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Manage <ArrowRight size={12} />
              </div>
            </Link>

            {/* Products */}
            <Link href="/products" className="card group hover:border-accent transition">
              <Package size={24} className="text-purple-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Products</p>
              <p className="text-xs text-gray-400">{analytics.totalProducts} products</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Manage <ArrowRight size={12} />
              </div>
            </Link>

            {/* Trending */}
            <Link href="/trending" className="card group hover:border-accent transition">
              <Flame size={24} className="text-orange-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Trending</p>
              <p className="text-xs text-gray-400">Hot products</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Discover <ArrowRight size={12} />
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

            {/* Revenue */}
            <Link href="/revenue" className="card group hover:border-accent transition">
              <DollarSign size={24} className="text-emerald-400 mb-2" />
              <p className="font-semibold text-white group-hover:text-accent transition">Revenue</p>
              <p className="text-xs text-gray-400">${analytics.totalProfit.toFixed(2)} profit</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                View <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>

        {/* New Features Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">💼 Business Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Product Manager */}
            <Link href="/products-manager" className="card group hover:border-accent transition">
              <LinkIcon size={24} className="text-blue-400 mb-2" />
              <h4 className="font-bold text-white mb-2">Product Manager</h4>
              <p className="text-xs text-gray-400 mb-4">Manage URLs, direct links for ads, bulk edit products</p>
              <div className="flex items-center gap-1 text-accent text-xs">
                Manage <ArrowRight size={12} />
              </div>
            </Link>

            {/* Social Media */}
            <Link href="/social-publish" className="card group hover:border-accent transition">
              <Share2 size={24} className="text-pink-400 mb-2" />
              <h4 className="font-bold text-white mb-2">Social Media</h4>
              <p className="text-xs text-gray-400 mb-4">Auto-publish to TikTok, Instagram, Facebook</p>
              <div className="flex items-center gap-1 text-accent text-xs">
                Publish <ArrowRight size={12} />
              </div>
            </Link>

            {/* Marketing */}
            <Link href="/marketing" className="card group hover:border-accent transition">
              <Smartphone size={24} className="text-green-400 mb-2" />
              <h4 className="font-bold text-white mb-2">Marketing</h4>
              <p className="text-xs text-gray-400 mb-4">Create campaigns, ads, track ROI</p>
              <div className="flex items-center gap-1 text-accent text-xs">
                Create <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Need Help?</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Help Card */}
            <Link href="/help" className="card bg-gradient-to-br from-blue-500/10 to-accent/10 border border-accent/30 group hover:border-accent transition">
              <BookOpen size={32} className="text-accent mb-3 group-hover:scale-110 transition" />
              <h4 className="text-lg font-bold text-white mb-2">Documentation</h4>
              <p className="text-sm text-gray-400 mb-4">
                Complete guides on getting started, setup, and best practices.
              </p>
              <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                Read Guides <ArrowRight size={16} />
              </div>
            </Link>

            {/* Suppliers Card */}
            <Link href="/suppliers" className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 group hover:border-accent transition">
              <Package size={32} className="text-purple-400 mb-3 group-hover:scale-110 transition" />
              <h4 className="text-lg font-bold text-white mb-2">Suppliers</h4>
              <p className="text-sm text-gray-400 mb-4">
                Manage your suppliers and integrate with fulfillment platforms.
              </p>
              <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                Manage <ArrowRight size={16} />
              </div>
            </Link>

            {/* Settings Card */}
            <Link href="/settings" className="card bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 group hover:border-accent transition">
              <Settings size={32} className="text-orange-400 mb-3 group-hover:scale-110 transition" />
              <h4 className="text-lg font-bold text-white mb-2">Settings</h4>
              <p className="text-sm text-gray-400 mb-4">
                Configure automations, notifications, and API integrations.
              </p>
              <div className="flex items-center gap-2 text-accent text-sm font-semibold">
                Configure <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {orders.length === 0 && products.length === 0 && (
          <div className="card text-center py-12">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Ready to get started?</h3>
            <p className="text-gray-400 mb-6">Add your first product and order to see your dashboard come alive</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/trending" className="btn btn-primary flex items-center gap-2">
                <Flame size={16} />
                Find Trending Products
              </Link>
              <Link href="/products" className="btn btn-secondary flex items-center gap-2">
                <Plus size={16} />
                Add Product
              </Link>
              <Link href="/help" className="btn btn-secondary flex items-center gap-2">
                <BookOpen size={16} />
                Read Guide
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
