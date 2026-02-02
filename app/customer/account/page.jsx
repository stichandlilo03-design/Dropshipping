'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, MapPin, LogOut, Edit2, Save, X, Heart, Package, Zap, Settings, AlertCircle, Loader, CheckCircle, Eye, ShoppingCart, Trash2, Search, Filter, Download, Truck, Clock, Star } from 'lucide-react';

export default function CustomerAccount() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredWishlist, setFilteredWishlist] = useState([]);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'United States'
    }
  });

  // Load Customer Data
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        
        const storedCustomer = localStorage.getItem('customer');
        const token = localStorage.getItem('customerToken');

        if (!storedCustomer || !token) {
          router.push('/customer/login');
          return;
        }

        const customerData = JSON.parse(storedCustomer);
        setCustomer(customerData);
        
        setFormData(prev => ({
          ...prev,
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          phone: customerData.phone || '',
        }));

        // Load orders
        await loadOrders(customerData.id, token);
        
        // Load wishlist
        await loadWishlist(token);

      } catch (err) {
        console.error('[Account] Error:', err);
        router.push('/customer/login');
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [router]);

  const loadOrders = async (customerId, token) => {
    try {
      const response = await fetch(`/api/orders/list?customerId=${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        applyOrderFilters(data.orders);
      }
    } catch (err) {
      console.error('[Orders] Error:', err);
    }
  };

  const loadWishlist = async (token) => {
    try {
      const response = await fetch('/api/customers/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success && data.customer.wishlist) {
        setWishlist(data.customer.wishlist);
        
        const productsData = {};
        for (const productId of data.customer.wishlist) {
          try {
            const productRes = await fetch(`/api/products/${productId}`);
            if (productRes.ok) {
              const productData = await productRes.json();
              productsData[productId] = productData;
            }
          } catch (err) {
            console.error('Error fetching product:', err);
          }
        }
        setProducts(productsData);
        applyWishlistFilters(data.customer.wishlist, productsData);
      }
    } catch (err) {
      console.error('[Wishlist] Error:', err);
    }
  };

  const applyOrderFilters = (ordersToFilter) => {
    let filtered = ordersToFilter;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id?.includes(searchTerm) || 
        order.status?.includes(searchTerm)
      );
    }

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'highest') {
      filtered.sort((a, b) => b.total - a.total);
    }

    setFilteredOrders(filtered);
  };

  const applyWishlistFilters = (wishlistToFilter, productsData) => {
    const filtered = wishlistToFilter.filter(id => {
      const product = productsData[id];
      if (!product) return false;
      return product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFilteredWishlist(filtered);
  };

  useEffect(() => {
    applyOrderFilters(orders);
  }, [statusFilter, sortBy, searchTerm, orders]);

  useEffect(() => {
    applyWishlistFilters(wishlist, products);
  }, [searchTerm, wishlist, products]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address_')) {
      const addressField = name.replace('address_', '');
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('customerToken');
      
      const response = await fetch('/api/customers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Profile updated successfully!');
        setEditing(false);
        
        const updatedCustomer = {
          ...customer,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        setCustomer(updatedCustomer);
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const token = localStorage.getItem('customerToken');

      const response = await fetch('/api/customers/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();
      
      if (data.success) {
        setWishlist(prev => prev.filter(id => id !== productId));
        setSuccess('Removed from wishlist');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to remove from wishlist');
    }
  };

  const addToCart = (product) => {
    try {
      const cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]');
      const existingItem = cart.find(item => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          ...product,
          quantity: 1,
          cartId: Date.now()
        });
      }

      localStorage.setItem('shoppingCart', JSON.stringify(cart));
      setSuccess('Added to cart!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add to cart');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/customer/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-900/30 border-yellow-500/30 text-yellow-400',
      'pending_payment': 'bg-orange-900/30 border-orange-500/30 text-orange-400',
      'paid': 'bg-blue-900/30 border-blue-500/30 text-blue-400',
      'shipped': 'bg-purple-900/30 border-purple-500/30 text-purple-400',
      'delivered': 'bg-green-900/30 border-green-500/30 text-green-400',
      'cancelled': 'bg-red-900/30 border-red-500/30 text-red-400',
    };
    return colors[status] || colors['pending'];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader size={40} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-4">Authentication Error</p>
          <Link href="/customer/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                <User size={32} />
                Welcome, {customer.firstName}!
              </h1>
              <p className="text-blue-100 mt-1">{customer.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-900/30 border-b border-green-500 text-green-200 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-30">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border-b border-red-500 text-red-200 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-30">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-6 sm:mb-8 border-b border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Package size={18} />
            <span>Orders</span>
            {orders.length > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{orders.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'wishlist'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Heart size={18} />
            <span>Wishlist</span>
            {wishlist.length > 0 && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">{wishlist.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-2">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <User size={28} className="text-blue-400" />
                    Profile Information
                  </h2>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition font-semibold"
                    >
                      <Edit2 size={18} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}
                </div>

                {editing ? (
                  <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Email (Cannot Change)</label>
                        <input
                          type="email"
                          value={customer.email}
                          disabled
                          className="w-full px-4 py-2 bg-slate-700 text-gray-400 border border-slate-600 rounded-lg opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 mt-6 flex items-center gap-2">
                        <MapPin size={22} />
                        Shipping Address
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-300 mb-2">Street Address</label>
                          <input
                            type="text"
                            name="address_street"
                            value={formData.address.street}
                            onChange={handleInputChange}
                            placeholder="123 Main Street"
                            className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            disabled={saving}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">City</label>
                            <input
                              type="text"
                              name="address_city"
                              value={formData.address.city}
                              onChange={handleInputChange}
                              placeholder="New York"
                              className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                              disabled={saving}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">State</label>
                            <input
                              type="text"
                              name="address_state"
                              value={formData.address.state}
                              onChange={handleInputChange}
                              placeholder="NY"
                              className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">ZIP Code</label>
                            <input
                              type="text"
                              name="address_zip"
                              value={formData.address.zip}
                              onChange={handleInputChange}
                              placeholder="10001"
                              className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                              disabled={saving}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Country</label>
                            <select
                              name="address_country"
                              value={formData.address.country}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                              disabled={saving}
                            >
                              <option>United States</option>
                              <option>Canada</option>
                              <option>United Kingdom</option>
                              <option>Australia</option>
                              <option>Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-slate-700">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition font-semibold"
                      >
                        {saving ? (
                          <>
                            <Loader size={18} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition font-semibold"
                      >
                        <X size={18} />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">First Name</p>
                        <p className="text-white font-semibold text-lg">{customer.firstName}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1">Last Name</p>
                        <p className="text-white font-semibold text-lg">{customer.lastName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                          <Mail size={16} />
                          Email
                        </p>
                        <p className="text-white font-semibold">{customer.email}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                          <Phone size={16} />
                          Phone
                        </p>
                        <p className="text-white font-semibold">{customer.phone || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package size={24} className="text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Orders</h3>
                </div>
                <p className="text-4xl font-bold text-blue-400">{customer.order_count || 0}</p>
                <p className="text-gray-400 text-sm mt-2">Total orders placed</p>
              </div>

              <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap size={24} className="text-green-400" />
                  <h3 className="text-lg font-bold text-white">Spending</h3>
                </div>
                <p className="text-4xl font-bold text-green-400">${(customer.clv || 0).toFixed(2)}</p>
                <p className="text-gray-400 text-sm mt-2">Total spent</p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart size={24} className="text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Favorites</h3>
                </div>
                <p className="text-4xl font-bold text-purple-400">{wishlist.length}</p>
                <p className="text-gray-400 text-sm mt-2">Saved products</p>
              </div>

              <button
                onClick={() => setActiveTab('orders')}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-center font-semibold transition"
              >
                View Orders
              </button>

              <Link
                href="/trending"
                className="block w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-center font-semibold transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {/* Filters */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <Filter size={16} />
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
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

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Search</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                    <div className="p-4 sm:p-6 border-b border-slate-700">
                      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs text-gray-400">Order ID</p>
                            <p className="font-mono text-white font-bold">{order.id?.slice(0, 12)}...</p>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg border ${getStatusColor(order.status)} flex items-center gap-2 text-sm font-semibold`}>
                          {getStatusIcon(order.status)}
                          {order.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>

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

                    <div className="px-4 sm:px-6 py-4 space-y-2 text-sm bg-slate-700/50">
                      <div className="flex justify-between text-gray-300">
                        <span>Total</span>
                        <span className="text-green-400 font-bold">${order.total?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>

                    {order.tracking_number && (
                      <div className="px-4 sm:px-6 py-4 bg-green-900/20 border-t border-green-500/30">
                        <p className="text-sm font-semibold text-green-400">📦 Tracking: {order.tracking_number}</p>
                      </div>
                    )}

                    <div className="px-4 sm:px-6 py-4 border-t border-slate-700 flex gap-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition text-sm"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                      <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition text-sm">
                        <Download size={16} />
                        Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WISHLIST TAB */}
        {activeTab === 'wishlist' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your favorites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Wishlist */}
            {filteredWishlist.length === 0 ? (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
                <Heart size={48} className="text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-6">
                  {wishlist.length === 0 ? 'Your wishlist is empty' : 'No matching products'}
                </p>
                <Link href="/trending" className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition font-semibold">
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWishlist.map(productId => {
                  const product = products[productId];
                  if (!product) return null;

                  return (
                    <div key={productId} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-red-500 transition group">
                      {product.image && (
                        <div className="h-48 overflow-hidden bg-slate-700 relative">
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                      )}

                      <div className="p-4 space-y-4">
                        <div>
                          <h3 className="font-semibold text-white line-clamp-2 group-hover:text-red-400 transition text-sm sm:text-base mb-2">
                            {product.name}
                          </h3>
                          {product.category && (
                            <p className="text-xs text-gray-400">{product.category}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xl sm:text-2xl font-bold text-green-400">
                            ${parseFloat(product.price || 0).toFixed(2)}
                          </p>
                          {product.rating && (
                            <div className="flex items-center gap-1">
                              <Star size={16} className="fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-400">{product.rating}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-slate-700">
                          <button
                            onClick={() => addToCart(product)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <ShoppingCart size={14} />
                            <span className="hidden sm:inline">Add</span>
                          </button>
                          <Link
                            href={`/p/${productId}`}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                          <button
                            onClick={() => removeFromWishlist(productId)}
                            className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Settings size={28} className="text-gray-400" />
              Account Settings
            </h2>
            
            <div className="space-y-4 mb-8">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-white font-semibold mb-2">Email Notifications</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-blue-500" defaultChecked />
                  <span className="text-gray-400 text-sm">Receive order updates via email</span>
                </label>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-white font-semibold mb-2">Marketing Emails</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-blue-500" />
                  <span className="text-gray-400 text-sm">Receive promotions and special offers</span>
                </label>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <p className="text-white font-semibold mb-2">SMS Notifications</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-blue-500" />
                  <span className="text-gray-400 text-sm">Receive shipping updates via SMS</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
