'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Settings, Bell, Mail, Lock, User, Eye, EyeOff, Save, X, CheckCircle } from 'lucide-react';

function SettingsContent() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    shippingUpdates: true,
    promotionalOffers: true,
    accountUpdates: true,
    privacyMode: false,
    twoFactorAuth: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

      // Load form data
      setFormData({
        firstName: parsedCustomer.firstName || '',
        lastName: parsedCustomer.lastName || '',
        email: parsedCustomer.email || '',
        phone: parsedCustomer.phone || '',
        password: '',
        confirmPassword: '',
      });

      // Load preferences
      const savedPreferences = localStorage.getItem('userPreferences');
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          console.error('Error parsing preferences:', error);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('[Settings] Error:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    router.push('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePreferenceChange = (key) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      // Validate
      if (!formData.firstName || !formData.lastName) {
        setMessageText('Please fill in all required fields');
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000);
        setSaving(false);
        return;
      }

      // Check password match if changing
      if (formData.password && formData.password !== formData.confirmPassword) {
        setMessageText('Passwords do not match');
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000);
        setSaving(false);
        return;
      }

      // Update customer data
      const updatedCustomer = {
        ...customer,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
      };

      localStorage.setItem('customer', JSON.stringify(updatedCustomer));
      setCustomer(updatedCustomer);

      setMessageText('Profile updated successfully!');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
    } catch (error) {
      console.error('[Save] Error:', error);
      setMessageText('Error saving profile');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);

      localStorage.setItem('userPreferences', JSON.stringify(preferences));

      setMessageText('Preferences saved successfully!');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } catch (error) {
      console.error('[Preferences] Error:', error);
      setMessageText('Error saving preferences');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to access settings</p>
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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/customer/account" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings size={24} />
                Settings
              </h1>
              <p className="text-xs text-gray-400">Manage your account and preferences</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Success Message */}
        {showMessage && (
          <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 flex items-center gap-3 animate-in fade-in">
            <CheckCircle size={20} className="text-green-400" />
            <p className="text-green-300">{messageText}</p>
          </div>
        )}

        {/* PROFILE SETTINGS */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <User size={24} className="text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Profile Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 bg-slate-700 text-gray-400 border border-slate-600 rounded-lg cursor-not-allowed opacity-60"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>

        {/* NOTIFICATION PREFERENCES */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell size={24} className="text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-gray-400" />
                <div>
                  <p className="text-white font-semibold">Email Notifications</p>
                  <p className="text-gray-400 text-sm">Receive notifications via email</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('emailNotifications')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.emailNotifications ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.emailNotifications ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-gray-400" />
                <div>
                  <p className="text-white font-semibold">Push Notifications</p>
                  <p className="text-gray-400 text-sm">Receive browser push notifications</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('pushNotifications')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.pushNotifications ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.pushNotifications ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-gray-400" />
                <div>
                  <p className="text-white font-semibold">SMS Notifications</p>
                  <p className="text-gray-400 text-sm">Receive text message notifications</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('smsNotifications')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.smsNotifications ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.smsNotifications ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            <hr className="border-slate-600 my-4" />

            {/* Order Updates */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-blue-400" />
                <div>
                  <p className="text-white font-semibold">Order Updates</p>
                  <p className="text-gray-400 text-sm">Notifications about order status</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('orderUpdates')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.orderUpdates ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.orderUpdates ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            {/* Shipping Updates */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-purple-400" />
                <div>
                  <p className="text-white font-semibold">Shipping Updates</p>
                  <p className="text-gray-400 text-sm">Notifications about shipment tracking</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('shippingUpdates')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.shippingUpdates ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.shippingUpdates ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            {/* Promotional Offers */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-green-400" />
                <div>
                  <p className="text-white font-semibold">Promotional Offers</p>
                  <p className="text-gray-400 text-sm">Special deals and discounts</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('promotionalOffers')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.promotionalOffers ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.promotionalOffers ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            {/* Account Updates */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-red-400" />
                <div>
                  <p className="text-white font-semibold">Account Updates</p>
                  <p className="text-gray-400 text-sm">Important account notifications</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('accountUpdates')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.accountUpdates ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.accountUpdates ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>

        {/* SECURITY SETTINGS */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={24} className="text-red-400" />
            <h2 className="text-2xl font-bold text-white">Security Settings</h2>
          </div>

          <div className="space-y-4">
            {/* Privacy Mode */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Eye size={20} className="text-gray-400" />
                <div>
                  <p className="text-white font-semibold">Privacy Mode</p>
                  <p className="text-gray-400 text-sm">Hide your activity from your profile</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('privacyMode')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.privacyMode ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.privacyMode ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition">
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-gray-400" />
                <div>
                  <p className="text-white font-semibold">Two-Factor Authentication</p>
                  <p className="text-gray-400 text-sm">Add an extra layer of security</p>
                </div>
              </div>
              <button
                onClick={() => handlePreferenceChange('twoFactorAuth')}
                className={`relative w-12 h-7 rounded-full transition ${
                  preferences.twoFactorAuth ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition ${
                    preferences.twoFactorAuth ? 'translate-x-5' : ''
                  }`}
                ></div>
              </button>
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Security Settings'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-red-300">Danger Zone</h3>
          <p className="text-red-200 text-sm">Irreversible actions</p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSuspense />}>
      <SettingsContent />
    </Suspense>
  );
}
