'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, AlertCircle, Check, ArrowLeft, LogOut, User, Mail } from 'lucide-react';
import { getUser, getToken, logout } from '@/lib/auth';
import { db } from '@/lib/database';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('EST');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [activeTab, setActiveTab] = useState('store');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Automation settings
  const [autoOrderProcessing, setAutoOrderProcessing] = useState(true);
  const [autoInventoryUpdate, setAutoInventoryUpdate] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Notification settings
  const [emailOnOrder, setEmailOnOrder] = useState(true);
  const [emailOnLowStock, setEmailOnLowStock] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    loadSettings(currentUser);
  }, [router]);

  const loadSettings = (currentUser) => {
    // Load from localStorage user object
    setStoreName(currentUser.storeName || '');
    setEmail(currentUser.email || '');
    
    // Load other settings if available
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setCurrency(parsed.currency || 'USD');
      setTimezone(parsed.timezone || 'EST');
      setAutoOrderProcessing(parsed.autoOrderProcessing !== false);
      setAutoInventoryUpdate(parsed.autoInventoryUpdate !== false);
      setNotifyLowStock(parsed.notifyLowStock !== false);
      setLowStockThreshold(parsed.lowStockThreshold || 10);
      setEmailOnOrder(parsed.emailOnOrder !== false);
      setEmailOnLowStock(parsed.emailOnLowStock !== false);
      setDailySummary(parsed.dailySummary !== false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!user) return;

      // Validation
      if (!storeName.trim()) {
        setNotificationMessage('Store name cannot be empty');
        setNotificationType('error');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        setLoading(false);
        return;
      }

      // Save all settings to localStorage
      const allSettings = {
        storeName,
        email,
        currency,
        timezone,
        autoOrderProcessing,
        autoInventoryUpdate,
        notifyLowStock,
        lowStockThreshold,
        emailOnOrder,
        emailOnLowStock,
        dailySummary,
      };

      // Save settings object to localStorage
      localStorage.setItem('settings', JSON.stringify(allSettings));

      // Update user object with new store name and email
      const updatedUser = {
        ...user,
        storeName: storeName,
        email: email,
      };

      // Save updated user to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // IMPORTANT: Also update Firebase Firestore so changes persist after logout/login
      try {
        const firestoreDb = getFirestore();
        const userDocRef = doc(firestoreDb, 'users', user.id);
        
        await updateDoc(userDocRef, {
          storeName: storeName,
          email: email,
          settings: allSettings,
          updatedAt: new Date().toISOString(),
        });

        console.log('✅ Settings saved to Firebase Firestore');
      } catch (firestoreError) {
        console.error('Firebase save warning (non-critical):', firestoreError);
        // Don't fail if Firebase save fails, localStorage is backup
      }

      // Update state
      setUser(updatedUser);

      // Show success message
      setNotificationMessage('✅ Settings saved successfully! Refreshing...');
      setNotificationType('success');
      setShowNotification(true);

      // Wait 2 seconds then refresh page to show updated store name
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error saving settings:', error);
      setNotificationMessage('❌ Error saving settings. Please try again.');
      setNotificationType('error');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-xs text-gray-400">Configure your store and preferences</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-danger flex items-center gap-2">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {showNotification && (
          <div className={`p-4 rounded-lg flex items-center gap-2 animate-pulse ${
            notificationType === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notificationType === 'success' ? (
              <Check size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {notificationMessage}
          </div>
        )}

        {/* User Profile Card */}
        <div className="card bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
              <User size={32} className="text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.storeName}</h2>
              <p className="text-gray-400">{user.email}</p>
              <p className="text-xs text-gray-500 mt-1">Account ID: {user.id}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'store' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            Store Info
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'automation' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            Automation
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'notifications' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            Notifications
          </button>
        </div>

        {/* Store Information Tab */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="card max-w-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Store Information</h3>
              <div className="space-y-4">
                {/* Store Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    <User size={16} className="inline mr-2" />
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Your store name"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">This is how your store appears in the dashboard</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    <Mail size={16} className="inline mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact email for your account</p>
                </div>

                {/* Currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="input-field"
                    >
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>CAD (C$)</option>
                      <option>AUD (A$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="input-field"
                    >
                      <option>EST (UTC-5)</option>
                      <option>CST (UTC-6)</option>
                      <option>MST (UTC-7)</option>
                      <option>PST (UTC-8)</option>
                      <option>GMT (UTC+0)</option>
                      <option>CET (UTC+1)</option>
                      <option>IST (UTC+5:30)</option>
                      <option>SGT (UTC+8)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="space-y-6">
            <div className="card max-w-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Automation Settings</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoOrderProcessing}
                    onChange={(e) => setAutoOrderProcessing(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Auto-process orders from suppliers</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoInventoryUpdate}
                    onChange={(e) => setAutoInventoryUpdate(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Automatically update inventory</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyLowStock}
                    onChange={(e) => setNotifyLowStock(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Notify when product stock is low</span>
                </label>
                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value))}
                    className="input-field"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert when inventory falls below this number</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="card max-w-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailOnOrder}
                    onChange={(e) => setEmailOnOrder(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Email me when new orders arrive</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailOnLowStock}
                    onChange={(e) => setEmailOnLowStock(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Notify me when product inventory is low</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dailySummary}
                    onChange={(e) => setDailySummary(e.target.checked)}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Send daily sales summary report</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-3 pt-4 max-w-2xl">
          <button 
            onClick={() => router.push('/')}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

