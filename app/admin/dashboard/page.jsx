'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp, Zap, Users, LogOut, Settings, Download, BookOpen, ArrowRight, Plus, Flame, AlertCircle, CheckCircle, Clock, Lock, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalCost: 0,
    totalOrders: 0,
    profitMargin: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/admin/login');
        return;
      }

      console.log('[Admin Dashboard] User authenticated:', currentUser.uid);
      setUser(currentUser);
      await loadData();
    });

    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[Admin Dashboard] Loading orders...');

      // Get ALL orders
      const ordersRef = collection(firebaseDb, 'orders');
      const ordersSnap = await getDocs(ordersRef);
      
      const loadedOrders = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('[Admin Dashboard] Orders loaded:', loadedOrders.length);
      setOrders(loadedOrders);

      // Calculate stats
      const totalRevenue = loadedOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
      const totalCost = loadedOrders.reduce((sum, order) => sum + (parseFloat(order.shipping) || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
      const avgOrderValue = loadedOrders.length > 0 ? (totalRevenue / loadedOrders.length).toFixed(2) : 0;

      setStats({
        totalRevenue: totalRevenue.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalCost: totalCost.toFixed(2),
        totalOrders: loadedOrders.length,
        profitMargin,
        avgOrderValue,
      });

      setLoading(false);
    } catch (error) {
      console.error('[Admin Dashboard] Error loading data:', error);
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <Link href="/admin/login" className="text-yellow-400 hover:underline">
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={28} className="text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">DropBoard Admin</h1>
              <p className="text-xs text-gray-400">Dashboard & Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="p-2 hover:bg-slate-700 rounded-lg transition" title="Orders">
              <ShoppingCart size={20} className="text-gray-400" />
            </Link>
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
        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-5xl font-bold text-white">Welcome Admin! 👋</h2>
          <p className="text-lg text-gray-400">
            Here's your business overview
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
            <span>📧 {user.email || 'Admin'}</span>
            <span className="text-gray-700">•</span>
            <span>ID: {user.uid?.substring(0, 8)}...</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Total Orders</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Revenue</p>
            <p className="text-2xl font-bold text-green-400">${stats.totalRevenue}</p>
            <p className="text-xs text-gray-500 mt-1">Total sales</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Profit</p>
            <p className="text-2xl font-bold text-blue-400">${stats.totalProfit}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.profitMargin}% margin</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Cost</p>
            <p className="text-2xl font-bold text-orange-400">${stats.totalCost}</p>
            <p className="text-xs text-gray-500 mt-1">Shipping & COGS</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Avg Order Value</p>
            <p className="text-2xl font-bold text-pink-400">${stats.avgOrderValue}</p>
            <p className="text-xs text-gray-500 mt-1">Per order</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs">Status</p>
            <p className="text-2xl font-bold text-green-400">✅ Online</p>
            <p className="text-xs text-gray-500 mt-1">Platform active</p>
          </div>
        </div>

        {/* Orders Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Recent Orders</h3>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Product</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 text-sm font-mono text-white">{order.id.substring(0, 8)}...</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{order.customerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{order.productName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-400">${order.total?.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            order.status === 'paid' || order.status === 'completed'
                              ? 'bg-green-500/10 text-green-400'
                              : order.status === 'pending_payment'
                              ? 'bg-orange-500/10 text-orange-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {order.status === 'pending_payment' ? 'Pending' : order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href="/admin/orders" className="text-blue-400 text-xs font-semibold hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        No orders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {orders.length > 10 && (
            <div className="mt-4 text-center">
              <Link href="/admin/orders" className="text-blue-400 font-semibold hover:underline">
                View all {orders.length} orders →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-6">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/orders" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-6 transition">
              <ShoppingCart size={28} className="text-blue-400 mb-3" />
              <p className="font-semibold text-white">Manage Orders</p>
              <p className="text-xs text-gray-400 mt-1">View and update all orders</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-4">
                Go <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/products" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-6 transition">
              <Package size={28} className="text-purple-400 mb-3" />
              <p className="font-semibold text-white">Products</p>
              <p className="text-xs text-gray-400 mt-1">Manage your catalog</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-4">
                Go <ArrowRight size={12} />
              </div>
            </Link>

            <Link href="/settings" className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg p-6 transition">
              <Settings size={28} className="text-yellow-400 mb-3" />
              <p className="font-semibold text-white">Settings</p>
              <p className="text-xs text-gray-400 mt-1">Configure your store</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs mt-4">
                Go <ArrowRight size={12} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
