'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, Smartphone, Share2, Link as LinkIcon, Eye, AlertCircle, CheckCircle, Clock, Lock } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [featureStatus, setFeatureStatus] = useState({});
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

      console.log('Loading data for userId:', userId);

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
        console.log('Orders loaded:', ordersData.length);
        setOrders(ordersData);
        calculateStats(ordersData, products);
      } catch (ordersError) {
        console.error('Error loading orders:', ordersError);
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
        console.log('Products loaded:', productsData.length);
        setProducts(productsData);
        calculateStats(orders, productsData);
      } catch (productsError) {
        console.error('Error loading products:', productsError);
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
        console.log('Integrations loaded:', Object.keys(integrationsData).length);
        setIntegrations(integrationsData);

        // Calculate feature availability based on connected APIs
        calculateFeatureStatus(integrationsData);
      } catch (integrationsError) {
        console.error('Error loading integrations:', integrationsError);
        setIntegrations({});
        setFeatureStatus({});
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFeatureStatus = (integrationsData) => {
    const connected = {};
    Object.keys(integrationsData).forEach(key => {
      if (integrationsData[key]?.status === 'connected') {
        connected[key] = true;
      }
    });

    console.log('Connected APIs:', Object.keys(connected));

    // Define feature dependencies
    const features = {
      // Trending Products needs at least one store (Shopify or TikTok) + Printful for fulfillment
      trendingProducts: {
        required: ['printful', 'shopify'],
        optional: ['tiktok'],
        available: (connected[`printful`] || false) && ((connected[`shopify`] || false) || (connected[`tiktok`] || false)),
        missingAPIs: [],
      },
      
      // Orders management needs Shopify or TikTok
      orders: {
        required: ['shopify'],
        optional: ['tiktok'],
        available: (connected[`shopify`] || false) || (connected[`tiktok`] || false),
        missingAPIs: [],
      },
      
      // Products management needs Shopify or TikTok
      products: {
        required: ['shopify'],
        optional: ['tiktok'],
        available: (connected[`shopify`] || false) || (connected[`tiktok`] || false),
        missingAPIs: [],
      },
      
      // Analytics needs orders (Shopify or TikTok)
      analytics: {
        required: ['shopify'],
        optional: ['tiktok'],
        available: (connected[`shopify`] || false) || (connected[`tiktok`] || false),
        missingAPIs: [],
      },
      
      // Social Media posting needs TikTok + optional Printful
      socialPublish: {
        required: ['tiktok'],
        optional: ['printful'],
        available: connected[`tiktok`] || false,
        missingAPIs: !connected[`tiktok`] ? ['TikTok'] : [],
      },
      
      // Product Manager (bulk edit, URLs) needs Shopify or TikTok
      productManager: {
        required: ['shopify'],
        optional: ['tiktok'],
        available: (connected[`shopify`] || false) || (connected[`tiktok`] || false),
        missingAPIs: [],
      },
      
      // Marketing campaigns need Shopify for store data
      marketing: {
        required: ['shopify', 'stripe'],
        optional: ['tiktok'],
        available: (connected[`shopify`] || false) && (connected[`stripe`] || false),
        missingAPIs: [],
      },
      
      // Payments/Revenue needs Stripe
      revenue: {
        required: ['stripe'],
        optional: [],
        available: connected[`stripe`] || false,
        missingAPIs: !connected[`stripe`] ? ['Stripe'] : [],
      },
      
      // Email notifications need Gmail
      emailNotifications: {
        required: ['gmail-smtp'],
        optional: [],
        available: connected[`gmail-smtp`] || false,
        missingAPIs: !connected[`gmail-smtp`] ? ['Gmail SMTP'] : [],
      },
    };

    // Calculate missing APIs for each feature
    Object.keys(features).forEach(feature => {
      const required = features[feature].required;
      const connectedRequired = required.filter(api => connected[api]);
      
      features[feature].missingAPIs = required
        .filter(api => !connected[api])
        .map(api => {
          const apiNames = {
            printful: 'Printful',
            shopify: 'Shopify',
            stripe: 'Stripe',
            tiktok: 'TikTok Shop',
            'gmail-smtp': 'Gmail SMTP',
          };
          return apiNames[api] || api;
        });
      
      features[feature].available = features[feature].missingAPIs.length === 0;
    });

    console.log('Feature Status:', features);
    setFeatureStatus(features);
  };

  const calculateStats = (ordersData, productsData) => {
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
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
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
    const required = ['printful', 'shopify', 'stripe'];
    const connected = Object.keys(integrations).filter(key =>
      integrations[key]?.status === 'connected'
    );
    return {
      total: Object.keys(integrations).length,
      required: required.filter(r => connected.some(c => c.includes(r))).length,
    };
  };

  // Feature wrapper component
  const FeatureCard = ({ feature, href, children, locked = false, missingAPIs = [] }) => {
    if (locked) {
      return (
        <div className="card opacity-60 cursor-not-allowed relative group">
          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10 group-hover:bg-black/60 transition">
            <div className="text-center">
              <Lock size={32} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-white text-sm font-bold">Feature Locked</p>
              <p className="text-xs text-gray-300 mt-1">
                {missingAPIs.length === 1 
                  ? `Connect ${missingAPIs[0]}` 
                  : `Connect: ${missingAPIs.join(', ')}`}
              </p>
            </div>
          </div>
          {children}
        </div>
      );
    }

    return (
      <Link href={href} className="card group hover:border-accent transition">
        {children}
      </Link>
    );
  };

  const intStatus = getIntegrationStatus();
  const isFullySetup = intStatus.required === 3 && Object.keys(integrations).length >= 3;

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
        console.warn('Error processing order for chart:', e);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You need to be logged in to view this page</p>
          <Link href="/auth/login" className="text-accent hover:underline">
            Go to Login
          </Link>
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
            <p className="text-xs text-gray-400">Dropshipping Automation Platform</p>
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
            <span>📧 {user.email || 'User'}</span>
            <span className="text-gray-700">•</span>
            <span>Account ID: {user.uid ? user.uid.substring(0, 8) : 'N/A'}...</span>
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
                  {intStatus.required === 3
                    ? 'Great! Core integrations connected. Add more platforms to expand.'
                    : `Connect ${3 - intStatus.required} more integration(s) for full automation`}
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
                <p className="text-2xl font-bold text-yellow-400">{intStatus.total}/{intStatus.required + 3}</p>
                <p className="text-xs text-gray-400">Integrations</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
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

        {/* Trending Products Section - WITH API DETECTION */}
        {featureStatus.trendingProducts?.available ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Flame size={28} className="text-orange-400" />
                🔥 Trending Products
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
        ) : (
          <div className="card bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-4">
              <Lock size={24} className="text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-400">🔒 Trending Products Locked</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Connect {featureStatus.trendingProducts?.missingAPIs?.join(' and ')} to access trending products
                </p>
                <Link href="/integrations" className="text-accent text-xs font-semibold mt-2 inline-block hover:underline">
                  Go to Integrations →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Integration Status */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Integration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                {integrations.printful?.status === 'connected' ? 'Connected' : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.printful?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

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
                {integrations.shopify?.status === 'connected' ? 'Connected' : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.shopify?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

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
                {integrations.stripe?.status === 'connected' ? 'Connected' : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.stripe?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">🎵 TikTok</p>
                {integrations.tiktok?.status === 'connected' ? (
                  <CheckCircle size={16} className="text-green-400" />
                ) : (
                  <Clock size={16} className="text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {integrations.tiktok?.status === 'connected' ? 'Connected' : 'Not connected'}
              </p>
              <Link href="/integrations" className="text-accent text-xs font-semibold hover:underline">
                {integrations.tiktok?.status === 'connected' ? 'Manage →' : 'Connect →'}
              </Link>
            </div>

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
                {integrations['gmail-smtp']?.status === 'connected' ? 'Connected' : 'Not connected'}
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
            <div className="lg:col-span-2 card">
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
            <FeatureCard
              feature="orders"
              href="/orders"
              locked={!featureStatus.orders?.available}
              missingAPIs={featureStatus.orders?.missingAPIs}
            >
              <ShoppingCart size={24} className="text-blue-400 mb-2" />
              <p className="font-semibold text-white">Orders</p>
              <p className="text-xs text-gray-400">{stats.totalOrders} orders</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                View <ArrowRight size={12} />
              </div>
            </FeatureCard>

            <FeatureCard
              feature="products"
              href="/products"
              locked={!featureStatus.products?.available}
              missingAPIs={featureStatus.products?.missingAPIs}
            >
              <Package size={24} className="text-purple-400 mb-2" />
              <p className="font-semibold text-white">Products</p>
              <p className="text-xs text-gray-400">{stats.totalProducts} products</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Manage <ArrowRight size={12} />
              </div>
            </FeatureCard>

            <FeatureCard
              feature="trending"
              href="/trending"
              locked={!featureStatus.trendingProducts?.available}
              missingAPIs={featureStatus.trendingProducts?.missingAPIs}
            >
              <Flame size={24} className="text-orange-400 mb-2" />
              <p className="font-semibold text-white">Trending</p>
              <p className="text-xs text-gray-400">Hot products</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Discover <ArrowRight size={12} />
              </div>
            </FeatureCard>

            <FeatureCard
              feature="analytics"
              href="/analytics"
              locked={!featureStatus.analytics?.available}
              missingAPIs={featureStatus.analytics?.missingAPIs}
            >
              <TrendingUp size={24} className="text-green-400 mb-2" />
              <p className="font-semibold text-white">Analytics</p>
              <p className="text-xs text-gray-400">Insights</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                View <ArrowRight size={12} />
              </div>
            </FeatureCard>

            <Link href="/integrations" className="card group hover:border-accent transition">
              <Zap size={24} className="text-yellow-400 mb-2" />
              <p className="font-semibold text-white">Integrations</p>
              <p className="text-xs text-gray-400">{Object.keys(integrations).length} connected</p>
              <div className="flex items-center gap-1 text-accent text-xs mt-3">
                Setup <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>

        {/* Business Tools Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">💼 Business Tools</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              feature="productManager"
              href="/products-manager"
              locked={!featureStatus.productManager?.available}
              missingAPIs={featureStatus.productManager?.missingAPIs}
            >
              <LinkIcon size={24} className="text-blue-400 mb-2" />
              <h4 className="font-bold text-white mb-2">Product Manager</h4>
              <p className="text-xs text-gray-400 mb-4">Manage URLs, direct links for ads, bulk edit products</p>
              <div className="flex items-center gap-1 text-accent text-xs">
                Manage <ArrowRight size={12} />
              </div>
            </FeatureCard>

            <FeatureCard
              feature="socialPublish"
              href="/social-publish"
              locked={!featureStatus.socialPublish?.available}
              missingAPIs={featureStatus.socialPublish?.missingAPIs}
            >
              <Share2 size={24} className="text-pink-400 mb-2" />
              <h4 className="font-bold text-white mb-2">Social Media</h4>
              <p className="text-xs text-gray-400 mb-4">Auto-publish to TikTok, Instagram, Facebook</p>
              <div className="flex items-center gap-1 text-accent text-xs">
                Publish <ArrowRight size={12} />
              </div>
            </FeatureCard>

            <FeatureCard
              feature="marketing"
              href="/marketing"
              locked={!featureStatus.marketing?.available}
              missingAPIs={featureStatus.marketing?.missingAPIs}
            >
              <Smartphone size={24} className="text-green-400 mb-2" />
              <h4 className="font-bold text-white mb-2">Marketing</h4>
              <p className="text-xs text-gray-400 mb-4">Create campaigns, ads, track ROI</p>
              <div className="flex items-center gap-1 text-accent text-xs">
                Create <ArrowRight size={12} />
              </div>
            </FeatureCard>
          </div>
        </div>

        {/* Help Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Need Help?</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
