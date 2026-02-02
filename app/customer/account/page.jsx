'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, MapPin, LogOut, Edit2, Save, X, Heart, Package, Zap, Settings, AlertCircle, Loader, CheckCircle } from 'lucide-react';

export default function CustomerAccount() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  
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

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        
        // Get customer from localStorage
        const storedCustomer = localStorage.getItem('customer');
        const token = localStorage.getItem('customerToken');

        if (!storedCustomer || !token) {
          router.push('/customer/login');
          return;
        }

        const customerData = JSON.parse(storedCustomer);
        setCustomer(customerData);
        
        // Initialize form with customer data
        setFormData(prev => ({
          ...prev,
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          phone: customerData.phone || '',
        }));

      } catch (err) {
        console.error('[Account] Error:', err);
        router.push('/customer/login');
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [router]);

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
        
        // Update localStorage
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

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/customer/login');
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

      {/* Success/Error Messages */}
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

        {/* Profile Tab */}
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
                    {/* Name Fields */}
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

                    {/* Email & Phone */}
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

                    {/* Address */}
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

                    {/* Buttons */}
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
                    {/* Display Mode */}
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

              <Link
                href="/orders"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-center font-semibold transition"
              >
                View All Orders
              </Link>

              <Link
                href="/"
                className="block w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg text-center font-semibold transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Package size={28} className="text-blue-400" />
              Your Orders
            </h2>
            <p className="text-gray-400 text-center py-8">
              Coming soon! Your orders will appear here.
            </p>
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Heart size={28} className="text-red-400" />
              Your Wishlist
            </h2>
            <p className="text-gray-400 text-center py-8">
              Coming soon! Save your favorite products here.
            </p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Settings size={28} className="text-gray-400" />
              Account Settings
            </h2>
            
            <div className="space-y-4">
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

              <button
                onClick={handleLogout}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
