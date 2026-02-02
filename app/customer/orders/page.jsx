'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Truck, CheckCircle, Clock, AlertCircle, Loader, Download, Eye, Filter } from 'lucide-react';

export default function CustomerOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const customer = localStorage.getItem('customer');
        const token = localStorage.getItem('customerToken');

        if (!customer || !token) {
          router.push('/customer/login');
          return;
        }

        const customerData = JSON.parse(customer);
        const customerId = customerData.id;

        // Fetch orders for this customer
        const response = await fetch(`/api/orders/list?customerId=${customerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.orders) {
          setOrders(data.orders);
          applyFilters(data.orders, statusFilter, sortBy);
        } else {
          setOrders([]);
          setFilteredOrders([]);
        }
      } catch (err) {
        console.error('[Orders] Error:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [router]);

  const applyFilters = (ordersToFilter, status, sort) => {
    let filtered = ordersToFilter;

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(order => order.status === status);
    }

    // Sort
    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'highest') {
      filtered.sort((a, b) => b.total - a.total);
    } else if (sort === 'lowest') {
      filtered.sort((a, b) => a.total - b.total);
    }

    setFilteredOrders(filtered);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    applyFilters(orders, newStatus, sortBy);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    applyFilters(orders, statusFilter, newSort);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-900/30 border-yellow-500/30 text-yellow-400';
      case 'pending_payment': return 'bg-orange-900/30 border-orange-500/30 text-orange-400';
      case 'paid': return 'bg-blue-900/30 border-blue-500/30 text-blue-400';
      case 'shipped': return 'bg-purple-900/30 border-purple-500/30 text-purple-400';
      case 'delivered': return 'bg-green-900/30 border-green-500/30 text-green-400';
      case 'cancelled': return 'bg-red-900/30 border-red-500/30 text-red-400';
      default: return 'bg-gray-900/30 border-gray-500/30 text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock size={16} />;
      case 'pending_payment': return <AlertCircle size={16} />;
      case 'paid': return <CheckCircle size={16} />;
      case 'shipped': return <Truck size={16} />;
      case 'delivered': return <CheckCircle size={16} />;
      case 'cancelled': return <AlertCircle size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getStatusLabel = (status) => {
    return status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader size={40} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Package size={32} />
              Your Orders
            </h1>
            <Link href="/customer/account" className="text-blue-100 hover:text-white text-sm font-medium transition">
              Back to Account
            </Link>
          </div>
          <p className="text-blue-100 mt-2">
            {filteredOrders.length} {statusFilter === 'all' ? 'total' : statusFilter} order{filteredOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border-b border-red-500 text-red-200 px-4 sm:px-6 py-4 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filters & Sort */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Filter size={16} />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 rounded-lg p-4 border border-blue-500/30 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">
                  ${filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
                </p>
                <p className="text-gray-400 text-xs mt-1">Total Amount</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <Package size={48} className="text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">
              {orders.length === 0 ? 'No orders yet' : `No ${statusFilter} orders`}
            </p>
            <Link href="/trending" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition font-semibold">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition">
                {/* Order Header */}
                <div className="p-4 sm:p-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-xs text-gray-400">Order ID</p>
                        <p className="font-mono text-white font-bold">{order.id?.slice(0, 12)}...</p>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg border ${getStatusColor(order.status)} flex items-center gap-2`}>
                      {getStatusIcon(order.status)}
                      <span className="font-semibold text-sm">{getStatusLabel(order.status)}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="px-4 sm:px-6 py-4 bg-slate-700/30">
                  <p className="text-sm text-gray-400 mb-3">{order.items?.length || 1} item(s)</p>
                  {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0 text-sm">
                      <div>
                        <p className="text-white font-medium">{item.name || item.productName}</p>
                        <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-green-400 font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="px-4 sm:px-6 py-4 space-y-2 text-sm bg-slate-700/50">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>${order.shipping?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span>${order.tax?.toFixed(2) || '0.00'}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Discount</span>
                      <span>-${order.discount?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-bold">
                    <span>Total</span>
                    <span className="text-green-400">${order.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                {/* Tracking Info */}
                {(order.tracking_number || order.shipping_carrier) && (
                  <div className="px-4 sm:px-6 py-4 bg-green-900/20 border-t border-green-500/30">
                    <p className="text-sm font-semibold text-green-400 mb-2">📦 Tracking Information</p>
                    {order.shipping_carrier && (
                      <p className="text-sm text-gray-300">Carrier: <span className="font-medium">{order.shipping_carrier}</span></p>
                    )}
                    {order.tracking_number && (
                      <p className="text-sm text-gray-300">Tracking: <span className="font-mono font-medium">{order.tracking_number}</span></p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 sm:px-6 py-4 border-t border-slate-700 flex gap-2 flex-wrap">
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex-1 min-w-[150px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Eye size={18} />
                    <span>View Details</span>
                  </Link>
                  {(order.status === 'shipped' || order.status === 'delivered') && order.tracking_number && (
                    <a
                      href={`https://www.shippo.com/tracking/${order.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[150px] bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Truck size={18} />
                      <span>Track</span>
                    </a>
                  )}
                  <button className="flex-1 min-w-[150px] bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition">
                    <Download size={18} />
                    <span>Invoice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
