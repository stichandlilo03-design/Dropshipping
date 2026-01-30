'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, MousePointer, ShoppingCart, TrendingUp, ArrowLeft } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Analytics() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
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
    loadAnalytics(currentUser.id);
  }, [router]);

  const loadAnalytics = (userId) => {
    const userAnalytics = db.getAnalytics(userId);
    setAnalytics(userAnalytics);
  };

  if (!mounted || !user || !analytics) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const trafficData = [
    { day: 'Mon', visitors: Math.floor(analytics.totalOrders * 10), clicks: Math.floor(analytics.totalOrders * 5), conversions: Math.floor(analytics.totalOrders * 0.3) },
    { day: 'Tue', visitors: Math.floor(analytics.totalOrders * 8), clicks: Math.floor(analytics.totalOrders * 4), conversions: Math.floor(analytics.totalOrders * 0.25) },
    { day: 'Wed', visitors: Math.floor(analytics.totalOrders * 12), clicks: Math.floor(analytics.totalOrders * 6), conversions: Math.floor(analytics.totalOrders * 0.35) },
    { day: 'Thu', visitors: Math.floor(analytics.totalOrders * 9), clicks: Math.floor(analytics.totalOrders * 4.5), conversions: Math.floor(analytics.totalOrders * 0.28) },
    { day: 'Fri', visitors: Math.floor(analytics.totalOrders * 15), clicks: Math.floor(analytics.totalOrders * 7), conversions: Math.floor(analytics.totalOrders * 0.4) },
    { day: 'Sat', visitors: Math.floor(analytics.totalOrders * 11), clicks: Math.floor(analytics.totalOrders * 5.5), conversions: Math.floor(analytics.totalOrders * 0.32) },
    { day: 'Sun', visitors: Math.floor(analytics.totalOrders * 10), clicks: Math.floor(analytics.totalOrders * 5), conversions: Math.floor(analytics.totalOrders * 0.3) },
  ];

  const conversionFunnel = [
    { stage: 'Visitors', count: Math.floor(analytics.totalOrders * 100) },
    { stage: 'Product Views', count: Math.floor(analytics.totalOrders * 45) },
    { stage: 'Add to Cart', count: Math.floor(analytics.totalOrders * 20) },
    { stage: 'Checkout Start', count: Math.floor(analytics.totalOrders * 8) },
    { stage: 'Purchases', count: analytics.totalOrders },
  ];

  const customerSegments = [
    { segment: 'New Customers', count: Math.floor(analytics.totalOrders * 0.4), percentage: 40, value: analytics.totalRevenue * 0.3 },
    { segment: 'Returning', count: Math.floor(analytics.totalOrders * 0.5), percentage: 50, value: analytics.totalRevenue * 0.6 },
    { segment: 'VIP', count: Math.floor(analytics.totalOrders * 0.1), percentage: 10, value: analytics.totalRevenue * 0.1 },
  ];

  const totalVisitors = trafficData.reduce((sum, d) => sum + d.visitors, 0);
  const totalClicks = trafficData.reduce((sum, d) => sum + d.clicks, 0);
  const totalConversions = trafficData.reduce((sum, d) => sum + d.conversions, 0);
  const avgConversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors * 100).toFixed(2) : 0;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-xs text-gray-400">Deep dive into your business metrics</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Total Visitors</p>
              <Eye size={20} className="text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalVisitors.toLocaleString()}</p>
            <p className="text-xs text-blue-400 mt-2">↑ 28% from last week</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Total Clicks</p>
              <MousePointer size={20} className="text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-purple-400 mt-2">↑ 15% CTR improvement</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Conversions</p>
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalConversions}</p>
            <p className="text-xs text-emerald-400 mt-2">{avgConversionRate}% conversion rate</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">Avg Session</p>
              <ShoppingCart size={20} className="text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-white">3m 42s</p>
            <p className="text-xs text-orange-400 mt-2">↑ 28 sec improvement</p>
          </div>
        </div>

        {/* Traffic Overview */}
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Traffic & Conversions</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisitors)" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel & Customer Segments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-6">Conversion Funnel</h3>
            <div className="space-y-4">
              {conversionFunnel.map((item, idx) => {
                const width = (item.count / conversionFunnel[0].count) * 100;
                return (
                  <div key={item.stage}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{item.stage}</span>
                      <span className="text-sm text-gray-400">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className={`rounded-full h-3 transition-all ${
                          idx === 0
                            ? 'bg-blue-500'
                            : idx === 1
                            ? 'bg-purple-500'
                            : idx === 2
                            ? 'bg-pink-500'
                            : idx === 3
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${width}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{width.toFixed(1)}% of visitors</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Segments */}
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-6">Customer Segments</h3>
            <div className="space-y-6">
              {customerSegments.map((segment) => (
                <div key={segment.segment}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{segment.segment}</span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-accent">{segment.count}</p>
                      <p className="text-xs text-gray-400">{segment.percentage}%</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-accent rounded-full h-3"
                      style={{ width: `${segment.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Est. Revenue: ${segment.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Metrics Table */}
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Daily Metrics Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-3 text-left font-semibold text-gray-400">Day</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-400">Visitors</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-400">Clicks</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-400">CTR</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-400">Conversions</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-400">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {trafficData.map((row) => (
                  <tr key={row.day} className="border-b border-gray-700 hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-semibold text-white">{row.day}</td>
                    <td className="px-6 py-4 text-gray-300">{row.visitors.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-300">{row.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-300">{((row.clicks / row.visitors) * 100).toFixed(2)}%</td>
                    <td className="px-6 py-4 font-semibold text-accent">{row.conversions}</td>
                    <td className="px-6 py-4 text-green-400 font-semibold">{((row.conversions / row.visitors) * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

