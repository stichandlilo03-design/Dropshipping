'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, ArrowLeft } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Revenue() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
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
    const userAnalytics = db.getAnalytics(userId);
    const userProducts = db.getProducts(userId);
    const userOrders = db.getOrders(userId);
    
    setAnalytics(userAnalytics);
    setProducts(userProducts);
    setOrders(userOrders);
  };

  if (!mounted || !user || !analytics) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading revenue...</p>
        </div>
      </div>
    );
  }

  const monthlyData = [
    { month: 'Mon', revenue: analytics.totalRevenue * 0.1, profit: analytics.totalProfit * 0.1, orders: Math.floor(analytics.totalOrders * 0.15), cost: analytics.totalCost * 0.1 },
    { month: 'Tue', revenue: analytics.totalRevenue * 0.12, profit: analytics.totalProfit * 0.12, orders: Math.floor(analytics.totalOrders * 0.17), cost: analytics.totalCost * 0.12 },
    { month: 'Wed', revenue: analytics.totalRevenue * 0.18, profit: analytics.totalProfit * 0.18, orders: Math.floor(analytics.totalOrders * 0.2), cost: analytics.totalCost * 0.18 },
    { month: 'Thu', revenue: analytics.totalRevenue * 0.15, profit: analytics.totalProfit * 0.15, orders: Math.floor(analytics.totalOrders * 0.18), cost: analytics.totalCost * 0.15 },
    { month: 'Fri', revenue: analytics.totalRevenue * 0.2, profit: analytics.totalProfit * 0.2, orders: Math.floor(analytics.totalOrders * 0.2), cost: analytics.totalCost * 0.2 },
    { month: 'Sat', revenue: analytics.totalRevenue * 0.15, profit: analytics.totalProfit * 0.15, orders: Math.floor(analytics.totalOrders * 0.15), cost: analytics.totalCost * 0.15 },
  ];

  const productRevenue = products.map(p => ({
    name: p.name || 'Product',
    revenue: (p.price || 0) * 10,
    profit: ((p.price || 0) - (p.cost || 0)) * 10,
    cost: (p.cost || 0) * 10,
    percentage: Math.floor(((p.price || 0) * 10) / (analytics.totalRevenue || 1) * 100),
    margin: p.margin || 0,
  })).filter(p => p.revenue > 0);

  const profitMarginData = products.map(p => ({
    product: p.name || 'Product',
    cost: p.cost || 0,
    price: p.price || 0,
    margin: p.margin || 0,
  })).filter(p => p.margin > 0);

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Revenue & Profit</h1>
            <p className="text-xs text-gray-400">Analyze your earnings and profitability</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400">Total Revenue</h3>
              <DollarSign size={20} className="text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">${analytics.totalRevenue.toFixed(2)}</p>
            <div className="flex items-center gap-1 text-green-400 text-sm mt-2">
              <TrendingUp size={16} />
              <span>+28% vs last period</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400">Total Profit</h3>
              <Target size={20} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">${analytics.totalProfit.toFixed(2)}</p>
            <div className="flex items-center gap-1 text-green-400 text-sm mt-2">
              <TrendingUp size={16} />
              <span>+34% vs last period</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400">Avg Profit Margin</h3>
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{analytics.profitMargin}%</p>
            <div className="flex items-center gap-1 text-blue-400 text-sm mt-2">
              <span>⭐ Excellent range</span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400">Profit per Order</h3>
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">${analytics.totalOrders > 0 ? (analytics.totalProfit / analytics.totalOrders).toFixed(2) : '0.00'}</p>
            <div className="flex items-center gap-1 text-purple-400 text-sm mt-2">
              <span>Based on {analytics.totalOrders} orders</span>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        {monthlyData.some(d => d.revenue > 0) && (
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-4">Daily Revenue & Profit Trend</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: '8px' }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#8b5cf6"
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue by Product */}
        {productRevenue.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="card">
              <h3 className="text-lg font-bold text-white mb-4">Revenue by Product</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="profit" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Margin */}
            <div className="card">
              <h3 className="text-lg font-bold text-white mb-4">Profit Margins by Product</h3>
              <div className="space-y-3">
                {profitMarginData.map((item) => (
                  <div key={item.product}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{item.product}</span>
                      <span className="text-sm text-accent font-bold">{item.margin}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-accent to-emerald-500 rounded-full h-3 transition-all"
                        style={{ width: `${item.margin}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-400">
                      <span>Cost: ${item.cost.toFixed(2)}</span>
                      <span>Price: ${item.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Product Revenue Details */}
        {productRevenue.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-4">Detailed Revenue Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Product</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Revenue</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Cost</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Profit</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Margin</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productRevenue.map((product) => (
                    <tr key={product.name} className="border-b border-gray-700 hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-white">{product.name}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-accent">${product.revenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-orange-400">${product.cost.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-400">${product.profit.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-blue-400">{product.margin}%</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-accent rounded-full h-2"
                              style={{ width: `${product.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-400">{product.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {analytics.totalOrders === 0 && (
          <div className="card text-center py-12">
            <DollarSign size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No revenue yet</h3>
            <p className="text-gray-400">Add your first order to see revenue analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}

