'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Eye, ArrowLeft, LogOut, Settings, ShoppingCart, Heart, Bell } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function CustomerAccountContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[CustomerAccount] Starting load...');
        setLoading(true);

        // Get customer data from localStorage
        const customerData = localStorage.getItem('customer');
        const token = localStorage.getItem('customerToken');

        console.log('[CustomerAccount] Customer data:', customerData);

        if (!customerData || !token) {
          console.log('[CustomerAccount] No customer data, redirecting to login');
          router.push('/customer/login');
          return;
        }

        const parsedCustomer = JSON.parse(customerData);
        console.log('[CustomerAccount] Parsed customer:', parsedCustomer);
        setCustomer(parsedCustomer);

        // Load orders directly from Firestore
        await loadCustomerOrdersFromFirestore(parsedCustomer.id, parsedCustomer.email);
        setLoading(false);
      } catch (error) {
        console.error('[CustomerAccount] Error:', error);
        setDebugInfo(`Error: ${error.message}`);
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const loadCustomerOrdersFromFirestore = async (customerId, customerEmail) => {
    try {
      console.log('[CustomerAccount] Loading orders from Firestore');
      console.log('Looking for customerId:', customerId);
      console.log('Looking for customerEmail:', customerEmail);

      const ordersRef = collection(db, 'orders');
      const ordersSnap = await getDocs(ordersRef);

      let foundOrders = [];
      let debugMessages = [];

      ordersSnap.forEach((doc, index) => {
        const orderData = doc.data();
        
        // Log first 2 orders for debugging
        if (index < 2) {
          console.log(`[Order ${index}] Keys:`, Object.keys(orderData));
          console.log(`[Order ${index}] Data:`, orderData);
          debugMessages.push(`Order ${index} fields: ${Object.keys(orderData).join(', ')}`);
        }

        // Universal matching - check multiple possible field names
        const matchesCustomer = 
          // Check by customerId
          (orderData.customerId && orderData.customerId === customerId) ||
          (orderData.customer_id && orderData.customer_id === customerId) ||
          (orderData.userId && orderData.userId === customerId) ||
          (orderData.user_id && orderData.user_id === customerId) ||
          (orderData.uid && orderData.uid === customerId) ||
          // Check by email
          (orderData.customerEmail && orderData.customerEmail === customerEmail) ||
          (orderData.customer_email && orderData.customer_email === customerEmail) ||
          (orderData.email && orderData.email === customerEmail) ||
          // Check by customer object
          (orderData.customer && orderData.customer.id === customerId) ||
          (orderData.customer && orderData.customer.email === customerEmail);

        if (matchesCustomer) {
          console.log('[CustomerAccount] ✅ Order matched:', doc.id);
          foundOrders.push({
            id: doc.id,
            ...orderData,
          });
        }
      });

      console.log('[CustomerAccount] Total orders found:', foundOrders.length);
      setOrders(foundOrders);
      setDebugInfo(debugMessages.join('\n'));

      // If no orders found, show ALL orders for debugging
      if (foundOrders.length === 0) {
        console.warn('[CustomerAccount] ⚠️ No matching orders found. Showing sample orders for debugging:');
        const allOrders = [];
        ordersSnap.forEach((doc) => {
          allOrders.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        console.log('All orders in database:', allOrders.length);
        if (allOrders.length > 0) {
          console.log('Sample order structure:', allOrders[0]);
        }
      }
    } catch (err) {
      console.error('[CustomerAccount] Error loading orders:', err);
      setDebugInfo(`Firestore error: ${err.message}`);
      setOrders([]);
    }
  };

  const getStatusColor = (status) => {
    const statusStr = String(status || '').toLowerCase();
    if (statusStr.includes('completed') || statusStr.includes('paid')) return 'bg-green-500/10 text-green-400';
    if (statusStr.includes('processing')) return 'bg-yellow-500/10 text-yellow-400';
    if (statusStr.includes('shipped')) return 'bg-blue-500/10 text-blue-400';
    if (statusStr.includes('pending')) return 'bg-orange-500/10 text-orange-400';
    return 'bg-gray-500/10 text-gray-400';
  };

  const getDisplayStatus = (status) => {
    if (!status) return 'Unknown';
    const str = String(status);
    if (str === 'pending_payment') return 'Pending Payment';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      String(order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(order.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || String(order.status) === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to view your account</p>
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
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">👤 My Account</h1>
              <p className="text-xs text-gray-400">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <Settings size={20} className="text-gray-400" />
            </Link>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Debug Info */}
        {debugInfo && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
            <p className="text-yellow-400 text-sm whitespace-pre-wrap">{debugInfo}</p>
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Full Name</p>
              <p className="text-white font-semibold">{customer.firstName} {customer.lastName || ''}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white font-semibold">{customer.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Phone</p>
              <p className="text-white font-semibold">{customer.phone || 'Not added'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Customer ID</p>
              <p className="text-white font-mono text-sm">{customer.id?.substring(0, 12)}...</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{orders.length}</p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Total Spent</p>
            <p className="text-3xl font-bold text-green-400 mt-2">
              ${orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <p className="text-gray-400 text-sm">Pending Orders</p>
            <p className="text-3xl font-bold text-orange-400 mt-2">
              {orders.filter(o => {
                const status = String(o.status || '').toLowerCase();
                return status.includes('pending');
              }).length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 flex gap-4">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingCart size={18} />
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'wishlist'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Heart size={18} />
            Wishlist
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Bell size={18} />
            Notifications
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="w-full px-4 py-2 pl-10 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
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
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Order ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Product</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Date</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400">Status</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4 text-sm font-mono text-white">{String(order.id).substring(0, 8)}...</td>
                          <td className="px-6 py-4 text-sm text-gray-300 line-clamp-1">{order.productName || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-400">
                            ${parseFloat(order.total || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {getDisplayStatus(order.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowModal(true);
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
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          {orders.length === 0 ? 'No orders yet. Start shopping! 🛍️' : 'No orders match your search'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
            <Heart size={40} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No items in wishlist yet</p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Notification Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-500" />
                <span className="text-gray-300">Order confirmation emails</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-500" />
                <span className="text-gray-300">Shipment tracking notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-blue-500" />
                <span className="text-gray-300">Promotional offers</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-8 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Order ID</p>
                  <p className="text-white font-mono text-sm">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Date</p>
                  <p className="text-white font-semibold">
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Product</p>
                <p className="text-white font-semibold">{selectedOrder.productName || 'N/A'}</p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-gray-400 text-sm mb-3">Financial Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">Subtotal</p>
                    <p className="text-blue-400 text-lg font-bold">${parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Tax</p>
                    <p className="text-yellow-400 text-lg font-bold">${parseFloat(selectedOrder.tax || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Total</p>
                    <p className="text-green-400 text-lg font-bold">${parseFloat(selectedOrder.total || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-gray-400 text-sm mb-2">Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                  {getDisplayStatus(selectedOrder.status)}
                </span>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition mt-4"
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

function AccountSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function CustomerAccountPage() {
  return (
    <Suspense fallback={<AccountSuspense />}>
      <CustomerAccountContent />
    </Suspense>
  );
}
