'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Package, Truck, CheckCircle, Clock, AlertCircle, MapPin, Calendar, Phone, Mail, Home } from 'lucide-react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function OrderTrackingContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const customerData = localStorage.getItem('customer');
      if (!customerData) {
        router.push('/customer/login');
        return;
      }

      const parsedCustomer = JSON.parse(customerData);
      setCustomer(parsedCustomer);

      await loadOrders(parsedCustomer.id, parsedCustomer.email);
      setLoading(false);
    } catch (error) {
      console.error('[Tracking] Error:', error);
      setLoading(false);
    }
  };

  const loadOrders = async (customerId, customerEmail) => {
    try {
      const ordersRef = collection(db, 'orders');
      const allDocs = await getDocs(ordersRef);

      const loadedOrders = [];
      allDocs.forEach((doc) => {
        const orderData = doc.data();
        const matchesCustomer =
          (orderData.customerId && String(orderData.customerId).trim() === String(customerId).trim()) ||
          (orderData.customerEmail && String(orderData.customerEmail).trim() === String(customerEmail).trim()) ||
          (orderData.email && String(orderData.email).trim() === String(customerEmail).trim());

        if (matchesCustomer) {
          loadedOrders.push({ id: doc.id, ...orderData });
        }
      });

      // Sort by date (newest first)
      loadedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(loadedOrders);
      applyFilter(loadedOrders, 'all');
    } catch (error) {
      console.error('[Orders] Error:', error);
    }
  };

  useEffect(() => {
    applyFilter(orders, filterStatus);
  }, [filterStatus, orders]);

  const applyFilter = (ordersList, status) => {
    if (status === 'all') {
      setFilteredOrders(ordersList);
    } else {
      const filtered = ordersList.filter((order) => {
        const orderStatus = String(order.status || '').toLowerCase();
        return orderStatus === status.toLowerCase();
      });
      setFilteredOrders(filtered);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  const getStatusTimeline = (status) => {
    const statusStr = String(status || '').toLowerCase();
    
    const steps = [
      { name: 'Order Placed', icon: CheckCircle, color: 'green', completed: true },
      { name: 'Confirmed', icon: CheckCircle, color: 'green', completed: ['confirmed', 'processing', 'shipped', 'completed'].includes(statusStr) },
      { name: 'Processing', icon: Clock, color: 'blue', completed: ['processing', 'shipped', 'completed'].includes(statusStr) },
      { name: 'Shipped', icon: Truck, color: 'purple', completed: ['shipped', 'completed'].includes(statusStr) },
      { name: 'Delivered', icon: Package, color: 'green', completed: statusStr === 'completed' },
    ];

    return steps;
  };

  const getStatusBadge = (status) => {
    const statusStr = String(status || '').toLowerCase();

    const badges = {
      'pending_payment': { label: '⏳ Pending Payment', color: 'yellow', bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
      'paid': { label: '✅ Confirmed', color: 'green', bg: 'bg-green-600/20', text: 'text-green-400' },
      'confirmed': { label: '✅ Confirmed', color: 'green', bg: 'bg-green-600/20', text: 'text-green-400' },
      'processing': { label: '⚙️ Processing', color: 'blue', bg: 'bg-blue-600/20', text: 'text-blue-400' },
      'shipped': { label: '🚚 Shipped', color: 'purple', bg: 'bg-purple-600/20', text: 'text-purple-400' },
      'completed': { label: '📦 Delivered', color: 'green', bg: 'bg-green-600/20', text: 'text-green-400' },
      'cancelled_payment': { label: '❌ Cancelled', color: 'red', bg: 'bg-red-600/20', text: 'text-red-400' },
    };

    const badge = badges[statusStr] || { label: statusStr, color: 'gray', bg: 'bg-gray-600/20', text: 'text-gray-400' };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getProgressPercentage = (status) => {
    const statusStr = String(status || '').toLowerCase();
    
    const progress = {
      'pending_payment': 0,
      'paid': 20,
      'confirmed': 40,
      'processing': 60,
      'shipped': 80,
      'completed': 100,
      'cancelled_payment': 0,
    };

    return progress[statusStr] || 0;
  };

  const estimatedDelivery = (createdDate) => {
    const date = new Date(createdDate);
    date.setDate(date.getDate() + 7); // 7 days from order
    return date;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading order tracking...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to track your orders</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/customer/dashboard" className="p-2 hover:bg-slate-700 rounded-lg transition">
                <ArrowLeft size={20} className="text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">📦 Order Tracking</h1>
                <p className="text-xs text-gray-400">Track your confirmed and shipped orders</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
              <LogOut size={20} />
            </button>
          </div>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterStatus === 'confirmed'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setFilterStatus('processing')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterStatus === 'processing'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              Processing
            </button>
            <button
              onClick={() => setFilterStatus('shipped')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterStatus === 'shipped'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              Shipped
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap text-sm ${
                filterStatus === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
              }`}
            >
              Delivered
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const progressPercent = getProgressPercentage(order.status);
              const estimatedDate = estimatedDelivery(order.createdAt);

              return (
                <div key={order.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">Order #{order.id.substring(0, 8).toUpperCase()}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={14} />
                          {order.items?.length || 0} items
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                      <p className="text-green-400 font-bold text-xl mt-2">${parseFloat(order.total || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 py-4 border-b border-slate-700">
                    <div className="mb-3">
                      <div className="flex justify-between mb-2">
                        <p className="text-gray-400 text-sm font-semibold">Delivery Progress</p>
                        <p className="text-blue-400 text-sm font-semibold">{progressPercent}%</p>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {order.status !== 'pending_payment' && order.status !== 'cancelled_payment' && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">Order Date</p>
                          <p className="text-white font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Est. Delivery</p>
                          <p className="text-white font-semibold">{estimatedDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="px-6 py-4 border-b border-slate-700">
                    <div className="space-y-3">
                      {getStatusTimeline(order.status).map((step, idx) => {
                        const Icon = step.icon;
                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8">
                              <Icon
                                size={20}
                                className={step.completed ? `text-${step.color}-400` : 'text-gray-500'}
                                fill={step.completed ? 'currentColor' : 'none'}
                              />
                            </div>
                            <div className="flex-1">
                              <p className={step.completed ? 'text-white font-semibold' : 'text-gray-500'}>{step.name}</p>
                            </div>
                            {step.completed && (
                              <div className="text-xs text-gray-400">
                                {step.name === 'Order Placed' && '✓'}
                                {step.name === 'Confirmed' && order.status !== 'pending_payment' && '✓'}
                                {step.name === 'Processing' && ['processing', 'shipped', 'completed'].includes(String(order.status || '').toLowerCase()) && '✓'}
                                {step.name === 'Shipped' && ['shipped', 'completed'].includes(String(order.status || '').toLowerCase()) && '✓'}
                                {step.name === 'Delivered' && String(order.status || '').toLowerCase() === 'completed' && '✓'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-6 py-4 border-b border-slate-700">
                    <h4 className="font-bold text-white mb-3">Items in This Order</h4>
                    <div className="space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-700/30 rounded p-3">
                          <div className="flex-1">
                            <p className="text-white font-semibold text-sm">{item.productName}</p>
                            <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-green-400 font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {order.shippingAddress && (
                    <div className="px-6 py-4 border-b border-slate-700">
                      <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                        <MapPin size={16} />
                        Shipping Address
                      </h4>
                      <div className="bg-slate-700/30 rounded p-3 text-sm text-gray-300 space-y-1">
                        <p>{order.shippingAddress.address}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                        <p>{order.shippingAddress.country}</p>
                      </div>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="px-6 py-4">
                    <h4 className="font-bold text-white mb-3">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        <div>
                          <p className="text-gray-400">Email</p>
                          <p className="text-white">{order.customerEmail}</p>
                        </div>
                      </div>
                      {order.customerPhone && (
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          <div>
                            <p className="text-gray-400">Phone</p>
                            <p className="text-white">{order.customerPhone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tracking Info (if available) */}
                  {String(order.status || '').toLowerCase() === 'shipped' && (
                    <div className="px-6 py-4 bg-blue-900/20 border-t border-blue-500/30">
                      <div className="flex items-start gap-3">
                        <Truck size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-blue-300 font-semibold">Your order is on the way!</p>
                          <p className="text-blue-200 text-sm mt-1">
                            📦 Tracking ID: {order.trackingId || 'Tracking information will be updated soon'}
                          </p>
                          {order.trackingUrl && (
                            <Link
                              href={order.trackingUrl}
                              target="_blank"
                              className="text-blue-400 hover:text-blue-300 text-sm font-semibold mt-2 inline-block"
                            >
                              Track Package →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* View Details Button */}
                  <div className="px-6 py-3 bg-slate-700/50 flex justify-between items-center">
                    <p className="text-gray-400 text-sm">Order Total: <span className="text-white font-bold">${parseFloat(order.total || 0).toFixed(2)}</span></p>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-semibold transition"
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-4">
              {filterStatus === 'all' ? 'No orders found' : `No ${filterStatus} orders`}
            </p>
            <Link href="/customer/dashboard" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-8 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-700/30 rounded p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Order ID</p>
                    <p className="text-white font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Order Date</p>
                    <p className="text-white">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div>
                    <p className="text-gray-400">Total</p>
                    <p className="text-green-400 font-bold text-lg">${parseFloat(selectedOrder.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackingSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<TrackingSuspense />}>
      <OrderTrackingContent />
    </Suspense>
  );
}
