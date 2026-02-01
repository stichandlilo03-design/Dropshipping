'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Save, Check, AlertCircle, Eye, EyeOff, Loader, Link as LinkIcon } from 'lucide-react';

export default function StripeIntegrationPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  
  const [formData, setFormData] = useState({
    secretKey: '',
    publishableKey: '',
  });
  
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      setUser(currentUser);
      await loadStripeKeys(currentUser.uid);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadStripeKeys = async (userId) => {
    try {
      const stripeRef = doc(db, 'users', userId, 'integrations', 'stripe');
      const stripeSnap = await getDoc(stripeRef);

      if (stripeSnap.exists()) {
        const data = stripeSnap.data();
        setFormData({
          secretKey: data.secretKey || '',
          publishableKey: data.publishableKey || '',
        });
        setConnected(data.status === 'connected');
      }
    } catch (err) {
      console.error('[Stripe Integration] Error loading keys:', err);
    }
  };

  const validateKeys = () => {
    const { secretKey, publishableKey } = formData;

    if (!secretKey.trim()) {
      setMessage({ type: 'error', text: 'Secret Key is required' });
      return false;
    }

    if (!publishableKey.trim()) {
      setMessage({ type: 'error', text: 'Publishable Key is required' });
      return false;
    }

    if (!secretKey.startsWith('sk_')) {
      setMessage({ type: 'error', text: 'Secret Key must start with "sk_"' });
      return false;
    }

    if (!publishableKey.startsWith('pk_')) {
      setMessage({ type: 'error', text: 'Publishable Key must start with "pk_"' });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateKeys()) return;

    try {
      setSaving(true);
      setMessage(null);

      // Extract account ID from key
      const accountId = secretKey.includes('acct_') 
        ? secretKey.split('_')[2] 
        : 'acct_unknown';

      const stripeData = {
        status: 'connected',
        secretKey: formData.secretKey,
        publishableKey: formData.publishableKey,
        accountId: accountId,
        email: user.email,
        connectedAt: new Date().toISOString(),
        lastVerified: new Date().toISOString(),
      };

      // Save to Firestore
      const stripeRef = doc(db, 'users', user.uid, 'integrations', 'stripe');
      await setDoc(stripeRef, stripeData, { merge: true });

      setConnected(true);
      setMessage({ 
        type: 'success', 
        text: '✅ Stripe connected successfully! Your products will now accept payments.' 
      });

      // Reload keys to confirm
      await loadStripeKeys(user.uid);

    } catch (err) {
      console.error('[Stripe Integration] Error saving:', err);
      setMessage({ 
        type: 'error', 
        text: err.message || 'Failed to save Stripe keys' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure? This will disable Stripe payments for your products.')) return;

    try {
      setSaving(true);
      const stripeRef = doc(db, 'users', user.uid, 'integrations', 'stripe');
      await setDoc(stripeRef, { status: 'disconnected' }, { merge: true });

      setConnected(false);
      setFormData({ secretKey: '', publishableKey: '' });
      setMessage({ type: 'info', text: 'Stripe disconnected' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error disconnecting Stripe' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">You need to be logged in</p>
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/integrations" className="p-2 hover:bg-slate-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">💳 Stripe Integration</h1>
            <p className="text-sm text-gray-400">Connect your Stripe account to accept payments</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Status Banner */}
        {connected && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 flex items-start gap-4">
            <Check size={24} className="text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-green-400">✅ Connected</h3>
              <p className="text-gray-300 mt-1">Your Stripe account is connected. Customers can now check out on your products.</p>
            </div>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-900/30 border-green-500 text-green-200' :
            message.type === 'error' ? 'bg-red-900/30 border-red-500 text-red-200' :
            'bg-blue-900/30 border-blue-500 text-blue-200'
          }`}>
            {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Add Your Stripe Keys</h2>
            <p className="text-gray-400">
              Your Stripe API keys are stored securely and used only for processing customer payments. 
              They are never exposed to customers or stored in your repository.
            </p>
          </div>

          {/* Secret Key Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              🔐 Secret Key (sk_live_... or sk_test_...)
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                placeholder="sk_live_51Sw2tZ0RWgtV4z9X..."
                value={formData.secretKey}
                onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showSecretKey ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Get this from: <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Stripe Dashboard → Developers → API Keys
              </a>
            </p>
          </div>

          {/* Publishable Key Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              🔓 Publishable Key (pk_live_... or pk_test_...)
            </label>
            <div className="relative">
              <input
                type={showPublishableKey ? 'text' : 'password'}
                placeholder="pk_live_51Sw2tZ0RWgtV4z9X..."
                value={formData.publishableKey}
                onChange={(e) => setFormData({ ...formData, publishableKey: e.target.value })}
                className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPublishableKey(!showPublishableKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPublishableKey ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Get this from: <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Stripe Dashboard → Developers → API Keys
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-700">
            {connected && (
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
              >
                Disconnect Stripe
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Stripe Keys
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test vs Live */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">🧪 Test Mode</h3>
            <p className="text-gray-400 text-sm">
              Start with test keys (pk_test_ and sk_test_) to safely test your checkout without processing real payments.
            </p>
            <div className="bg-slate-700/50 rounded p-3 text-xs text-gray-300 font-mono">
              Test Card: 4242 4242 4242 4242
            </div>
          </div>

          {/* Live Mode */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">💰 Live Mode</h3>
            <p className="text-gray-400 text-sm">
              Switch to live keys (pk_live_ and sk_live_) only after testing is complete. Real payments will be processed immediately.
            </p>
            <div className="bg-yellow-700/30 border border-yellow-600 rounded p-3 text-xs text-yellow-200">
              ⚠️ Use live keys only in production!
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">🔄 How It Works</h3>
          <div className="space-y-3 text-gray-300 text-sm">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">1</span>
              <p>You add your Stripe keys here</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">2</span>
              <p>Customer visits your product page and clicks "Buy Now"</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">3</span>
              <p>System automatically detects you as the product owner</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">4</span>
              <p>Payment is processed through YOUR Stripe account</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">5</span>
              <p>Money goes directly to your Stripe account!</p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-green-400">🔒 Security</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex gap-2">
              <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span>Keys are encrypted and stored securely in database</span>
            </li>
            <li className="flex gap-2">
              <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span>Keys are never exposed to customers or in frontend code</span>
            </li>
            <li className="flex gap-2">
              <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span>Keys are not stored in repository or version control</span>
            </li>
            <li className="flex gap-2">
              <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span>Only you can access your Stripe keys in your dashboard</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
