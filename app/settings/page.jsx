'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, AlertCircle, Check, ArrowLeft, LogOut } from 'lucide-react';
import { getUser, getToken, logout } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [showNotification, setShowNotification] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
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
    loadSettings(currentUser.id);
  }, [router]);

  const loadSettings = (userId) => {
    const userSettings = db.getSettings(userId);
    setSettings({
      storeName: user?.storeName || '',
      email: user?.email || '',
      currency: 'USD',
      timezone: 'EST',
      autoOrderProcessing: true,
      autoInventoryUpdate: true,
      notifyLowStock: true,
      lowStockThreshold: 10,
      emailOnOrder: true,
      emailOnLowStock: true,
      dailySummary: true,
      ...userSettings,
    });
  };

  const handleSave = (userId) => {
    db.saveSettings(userId, settings);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
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
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2 animate-slide-up">
            <Check size={20} />
            Settings saved successfully
          </div>
        )}

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
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-3 font-semibold transition whitespace-nowrap ${activeTab === 'api' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            API Keys
          </button>
        </div>

        {/* Store Information Tab */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="card max-w-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Store Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Store Name</label>
                  <input
                    type="text"
                    value={settings.storeName || ''}
                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Currency</label>
                    <select
                      value={settings.currency || 'USD'}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      className="input-field"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>CAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Timezone</label>
                    <select
                      value={settings.timezone || 'EST'}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="input-field"
                    >
                      <option>EST</option>
                      <option>CST</option>
                      <option>PST</option>
                      <option>UTC</option>
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
                    checked={settings.autoOrderProcessing || false}
                    onChange={(e) => setSettings({ ...settings, autoOrderProcessing: e.target.checked })}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Auto-process orders from suppliers</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoInventoryUpdate || false}
                    onChange={(e) => setSettings({ ...settings, autoInventoryUpdate: e.target.checked })}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Automatically update inventory</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifyLowStock || false}
                    onChange={(e) => setSettings({ ...settings, notifyLowStock: e.target.checked })}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                  />
                  <span className="text-gray-300">Notify when product stock is low</span>
                </label>
                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={settings.lowStockThreshold || 10}
                    onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) })}
                    className="input-field"
                  />
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
                {[
                  { key: 'emailOnOrder', label: 'Email me when new orders arrive' },
                  { key: 'emailOnLowStock', label: 'Notify me when product inventory is low' },
                  { key: 'dailySummary', label: 'Send daily sales summary report' },
                ].map((option) => (
                  <label key={option.key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[option.key] || false}
                      onChange={(e) => setSettings({ ...settings, [option.key]: e.target.checked })}
                      className="w-4 h-4 rounded accent-green-500 cursor-pointer"
                    />
                    <span className="text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Configuration Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="card max-w-2xl">
              <h3 className="text-lg font-bold text-white mb-6">API Configuration</h3>
              <div className="space-y-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Shopify Store URL</p>
                  <input
                    type="text"
                    placeholder="your-store.myshopify.com"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-2">Get this from your Shopify dashboard</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Shopify API Token</p>
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-2">From: Shopify Admin → Settings</p>
                </div>
              </div>
            </div>

            <div className="card bg-blue-500/5 border border-blue-500/30 max-w-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-sm font-bold text-blue-400 mb-2">API Security</h4>
                  <p className="text-xs text-gray-400">Never share your API keys. Keep them secure.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-3 pt-4 max-w-2xl">
          <button className="flex-1 btn btn-secondary">Cancel</button>
          <button onClick={() => handleSave(user.id)} className="flex-1 btn btn-primary flex items-center justify-center gap-2">
            <Save size={20} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

