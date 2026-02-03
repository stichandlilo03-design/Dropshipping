'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Check, AlertCircle, Eye, EyeOff, Loader, RefreshCw, Settings, Zap } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';

const INTEGRATIONS = [
  // ============================================================================
  // EXISTING INTEGRATIONS
  // ============================================================================
  {
    id: 'printful',
    name: 'Printful',
    icon: '📦',
    category: 'Print-on-Demand & Fulfillment',
    description: 'Auto-sync orders and auto-generate shipping labels',
    fields: [
      { 
        name: 'API Token', 
        key: 'apiToken', 
        type: 'password', 
        placeholder: '4tQzSCatHFK4n5uP0JklFjzB5hzccJK68CmSaVDXXLtRrhhT8vYyaqv7NxfZJDUd',
        help: 'Get from: Printful Dashboard → Settings → API'
      },
    ],
    docs: 'https://developers.printful.com/docs',
    status: 'existing',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    category: 'Store Integration',
    description: 'Integrate with your Shopify store for product sync',
    fields: [
      { 
        name: 'Store URL', 
        key: 'storeUrl', 
        type: 'text', 
        placeholder: 'your-store.myshopify.com',
        help: 'Your store domain'
      },
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'shpat_...',
        help: 'From Shopify Admin'
      },
    ],
    docs: 'https://shopify.dev/docs/admin-api',
    status: 'existing',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    category: 'Payment Processing',
    description: 'Accept and process customer payments',
    fields: [
      { 
        name: 'Publishable Key', 
        key: 'publishableKey', 
        type: 'text', 
        placeholder: 'pk_live_...',
        help: 'From Stripe Dashboard'
      },
      { 
        name: 'Secret Key', 
        key: 'secretKey', 
        type: 'password', 
        placeholder: 'sk_live_...',
        help: 'From Stripe Dashboard'
      },
    ],
    docs: 'https://stripe.com/docs/keys',
    status: 'existing',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    icon: '⚡',
    category: 'Workflow Automation',
    description: 'Trigger workflows on new orders and events',
    fields: [
      { 
        name: 'Webhook URL', 
        key: 'webhookUrl', 
        type: 'text', 
        placeholder: 'https://hooks.zapier.com/hooks/catch/...',
        help: 'From Zapier → Make a Zap'
      },
    ],
    docs: 'https://zapier.com/help/create/basic/trigger-workflows-with-webhooks',
    status: 'existing',
  },

  // ============================================================================
  // NEW AUTOMATION INTEGRATIONS
  // ============================================================================
  {
    id: 'gmail-smtp',
    name: 'Gmail SMTP',
    icon: '📧',
    category: 'Email Automation',
    description: 'Send order confirmations, shipping & delivery emails (auto-fallback)',
    fields: [
      { 
        name: 'Email Address', 
        key: 'email', 
        type: 'text', 
        placeholder: 'your-email@gmail.com',
        help: 'Your Gmail address'
      },
      { 
        name: 'App Password', 
        key: 'appPassword', 
        type: 'password', 
        placeholder: 'xxxx xxxx xxxx xxxx',
        help: 'From Google Account → App Passwords (2FA required)'
      },
    ],
    docs: 'https://support.google.com/accounts/answer/185833',
    status: 'new',
    note: '🚀 NEW: Automatic fallback email system. Tries SendGrid first, then Gmail SMTP. No email delays!'
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    icon: '📨',
    category: 'Email Automation',
    description: 'Primary email service for order notifications (optional with Gmail fallback)',
    fields: [
      { 
        name: 'API Key', 
        key: 'apiKey', 
        type: 'password', 
        placeholder: 'SG.xxxxx...',
        help: 'From SendGrid Dashboard → API Keys'
      },
    ],
    docs: 'https://docs.sendgrid.com/for-developers/sending-email/api-overview',
    status: 'new',
    note: '🚀 NEW: Optional primary email service. Falls back to Gmail if unavailable.'
  },

  // ============================================================================
  // SOCIAL MEDIA INTEGRATIONS
  // ============================================================================
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    icon: '🎵',
    category: 'Social Commerce',
    description: 'One-click publish products to TikTok',
    fields: [
      { 
        name: 'Client Key', 
        key: 'clientKey', 
        type: 'text', 
        placeholder: 'awlp...',
        help: 'From TikTok Developers'
      },
      { 
        name: 'Client Secret', 
        key: 'clientSecret', 
        type: 'password', 
        placeholder: 'Q4a7...',
        help: 'From TikTok Developers'
      },
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'eyJ0...',
        help: 'Get after authorizing'
      },
    ],
    docs: 'https://developers.tiktok.com',
    status: 'new',
    note: '🚀 NEW: Auto-post products with AI captions & hashtags. Click publish on any product!'
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    icon: '📷',
    category: 'Social Commerce',
    description: 'Publish to Instagram feed with captions',
    fields: [
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'IGQVJ...',
        help: 'From Meta Business Suite'
      },
      { 
        name: 'Account ID', 
        key: 'accountId', 
        type: 'text', 
        placeholder: '17841406338772892',
        help: 'Your Instagram Business Account ID'
      },
    ],
    docs: 'https://developers.facebook.com/docs/instagram-api',
    status: 'new',
    note: '🚀 NEW: Auto-post products with professional captions. Reach your Instagram audience!'
  },
  {
    id: 'facebook',
    name: 'Facebook Page',
    icon: '👥',
    category: 'Social Commerce',
    description: 'Publish to Facebook page with product links',
    fields: [
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'EAAD...',
        help: 'From Meta Business Suite'
      },
      { 
        name: 'Page ID', 
        key: 'pageId', 
        type: 'text', 
        placeholder: '1234567890',
        help: 'Your Facebook Page ID'
      },
    ],
    docs: 'https://developers.facebook.com/docs/facebook-login/access-tokens',
    status: 'new',
    note: '🚀 NEW: Auto-post products to Facebook. Drive traffic from your community!'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: '📌',
    category: 'Social Commerce',
    description: 'Pin products to Pinterest boards',
    fields: [
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'c74...',
        help: 'From Pinterest Developer Console'
      },
      { 
        name: 'Board ID', 
        key: 'boardId', 
        type: 'text', 
        placeholder: '1234567890/my-board',
        help: 'Your Pinterest Board ID'
      },
    ],
    docs: 'https://developers.pinterest.com/docs/api/overview',
    status: 'new',
    note: '🚀 NEW: Auto-pin products. Pinterest drives high-quality traffic & sales!'
  },

  // ============================================================================
  // AUTOMATION CRON JOBS
  // ============================================================================
  {
    id: 'cron-shipping',
    name: 'Shipping Auto-Sync Cron',
    icon: '🚚',
    category: 'Automation Jobs',
    description: 'Auto-check shipping status every 6 hours & send tracking emails',
    fields: [
      { 
        name: 'Cron Secret', 
        key: 'cronSecret', 
        type: 'password', 
        placeholder: 'your-super-secret-key-123',
        help: 'Secret key for cron job authorization'
      },
    ],
    docs: '/api/cron/shipping-update',
    status: 'new',
    note: '🚀 NEW: Runs every 6 hours. Automatically checks Printful for tracking updates and sends emails to customers!'
  },
  {
    id: 'cron-delivery',
    name: 'Delivery Check Cron',
    icon: '📦',
    category: 'Automation Jobs',
    description: 'Auto-check delivery status daily & send confirmation emails',
    fields: [
      { 
        name: 'Cron Secret', 
        key: 'cronSecret', 
        type: 'password', 
        placeholder: 'your-super-secret-key-123',
        help: 'Same secret key as Shipping Cron'
      },
    ],
    docs: '/api/cron/delivery-check',
    status: 'new',
    note: '🚀 NEW: Runs daily. Automatically checks if orders have been delivered and sends confirmation emails!'
  },
];

export default function Integrations() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [integrations, setIntegrations] = useState({});
  const [notification, setNotification] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState({});
  const [formData, setFormData] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('existing');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      setUser(currentUser);
      await loadIntegrations(currentUser.uid);
      setPageLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadIntegrations = async (userId) => {
    try {
      console.log('📥 Loading integrations...');
      
      const integrationsRef = collection(firebaseDb, 'users', userId, 'integrations');
      const snapshot = await getDocs(integrationsRef);
      
      const data = {};
      snapshot.forEach(doc => {
        console.log('✅ Found:', doc.id, doc.data());
        data[doc.id] = doc.data();
      });

      console.log('✅ Loaded:', Object.keys(data));
      setIntegrations(data);
    } catch (error) {
      console.error('❌ Load error:', error);
    }
  };

  const handleConnect = async (integrationId) => {
    const integration = INTEGRATIONS.find(i => i.id === integrationId);
    const credentials = formData[integrationId];

    if (!credentials || Object.keys(credentials).length === 0) {
      showNotification('❌ Please fill in all fields', 'error');
      return;
    }

    setLoading({ ...loading, [integrationId]: true });

    try {
      console.log(`🧪 Testing ${integrationId}...`);

      // For cron jobs, skip API validation
      let result = { success: true };

      if (!integrationId.startsWith('cron-')) {
        // Call validator for regular integrations
        const response = await fetch(`/api/integrations/${integrationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        result = await response.json();
        console.log(`Response:`, result);

        if (!response.ok || !result.success) {
          showNotification(`❌ ${result.error || 'Connection failed'}`, 'error');
          setLoading({ ...loading, [integrationId]: false });
          return;
        }
      }

      console.log(`💾 Saving to Firestore...`);

      // Save to Firestore
      const docRef = doc(
        firebaseDb,
        'users',
        user.uid,
        'integrations',
        integrationId
      );

      const docData = {
        integrationId,
        integrationName: integration.name,
        status: 'connected',
        credentials: credentials,
        connectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      };

      await setDoc(docRef, docData, { merge: true });

      console.log(`✅ Saved!`);

      // Update local state
      setIntegrations(prev => ({
        ...prev,
        [integrationId]: docData,
      }));

      setExpandedId(null);
      setFormData(prev => ({
        ...prev,
        [integrationId]: {},
      }));

      showNotification(`✅ ${integration.name} connected!`, 'success');

      // Reload to verify
      setTimeout(() => {
        loadIntegrations(user.uid);
      }, 500);

    } catch (error) {
      console.error('❌ Error:', error);
      showNotification(`❌ ${error.message}`, 'error');
    } finally {
      setLoading({ ...loading, [integrationId]: false });
    }
  };

  const handleDisconnect = async (integrationId) => {
    try {
      console.log(`🔌 Disconnecting ${integrationId}...`);

      const docRef = doc(
        firebaseDb,
        'users',
        user.uid,
        'integrations',
        integrationId
      );

      await deleteDoc(docRef);
      console.log(`✅ Deleted!`);

      setIntegrations(prev => {
        const updated = { ...prev };
        delete updated[integrationId];
        return updated;
      });

      showNotification('✅ Disconnected', 'success');
    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('❌ Failed to disconnect', 'error');
    }
  };

  const handleInputChange = (integrationId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [field]: value,
      },
    }));
  };

  const showNotification = (message, type = 'info') => {
    setNotification(message);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/auth/login');
  };

  if (pageLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const connected = Object.keys(integrations).filter(k => integrations[k]?.status === 'connected').length;
  const categories = ['Print-on-Demand & Fulfillment', 'Store Integration', 'Payment Processing', 'Workflow Automation', 'Email Automation', 'Social Commerce', 'Automation Jobs'];
  const existingIntegrations = INTEGRATIONS.filter(i => i.status === 'existing');
  const newIntegrations = INTEGRATIONS.filter(i => i.status === 'new');

  const getTabIntegrations = () => {
    if (activeTab === 'existing') return existingIntegrations;
    if (activeTab === 'new') return newIntegrations;
    if (activeTab === 'all') return INTEGRATIONS;
    return [];
  };

  const displayIntegrations = getTabIntegrations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">🔗 Integrations Hub</h1>
              <p className="text-sm text-gray-400">Connect all platforms for 100% automation</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-red-400 hover:text-red-300 transition">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            notification.includes('✅') 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification.includes('✅') ? <Check size={20} /> : <AlertCircle size={20} />}
            {notification}
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <p className="text-blue-300 text-sm font-semibold">Total Connected</p>
            <p className="text-4xl font-bold text-blue-400 mt-2">{connected}</p>
            <p className="text-xs text-gray-400 mt-1">of {INTEGRATIONS.length} integrations</p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <p className="text-green-300 text-sm font-semibold">🚀 New Features</p>
            <p className="text-4xl font-bold text-green-400 mt-2">{newIntegrations.length}</p>
            <p className="text-xs text-gray-400 mt-1">Email + Social Automation</p>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
            <p className="text-purple-300 text-sm font-semibold">⚙️ Cron Jobs</p>
            <p className="text-4xl font-bold text-purple-400 mt-2">2</p>
            <p className="text-xs text-gray-400 mt-1">Shipping & Delivery Auto-Sync</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('existing')}
            className={`px-4 py-3 font-semibold transition border-b-2 ${
              activeTab === 'existing'
                ? 'text-blue-400 border-blue-500'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            ✅ Existing ({existingIntegrations.length})
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-3 font-semibold transition border-b-2 ${
              activeTab === 'new'
                ? 'text-green-400 border-green-500'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            🚀 NEW ({newIntegrations.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-semibold transition border-b-2 ${
              activeTab === 'all'
                ? 'text-purple-400 border-purple-500'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            All Integrations ({INTEGRATIONS.length})
          </button>
        </div>

        {/* Integrations by Category */}
        {categories.map(category => {
          const categoryIntegrations = displayIntegrations.filter(i => i.category === category);
          if (categoryIntegrations.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {category.includes('Automation') && '⚡'}
                {category.includes('Social') && '📱'}
                {category.includes('Email') && '📧'}
                {category.includes('Payment') && '💳'}
                {category.includes('Print') && '📦'}
                {category.includes('Store') && '🛍️'}
                {category.includes('Workflow') && '🔄'}
                {category}
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryIntegrations.map(integration => {
                  const isConnected = integrations[integration.id]?.status === 'connected';

                  return (
                    <div
                      key={integration.id}
                      className={`rounded-lg border transition ${
                        expandedId === integration.id 
                          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-slate-700/50' 
                          : 'border-slate-700 bg-slate-800/50 hover:border-blue-500'
                      } p-5 flex flex-col`}
                    >
                      {/* Header */}
                      <div onClick={() => setExpandedId(expandedId === integration.id ? null : integration.id)} className="cursor-pointer mb-3">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-3xl mb-2">{integration.icon}</p>
                            <h3 className="font-bold text-white text-lg">{integration.name}</h3>
                            <p className="text-xs text-gray-400 mt-1">{integration.description}</p>
                            {integration.note && (
                              <p className="text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded px-2 py-1 mt-2">{integration.note}</p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${
                            isConnected 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {isConnected ? '✅ Connected' : '⭕ Not Connected'}
                          </span>
                        </div>
                      </div>

                      {/* Form - Expanded */}
                      {expandedId === integration.id && !isConnected && (
                        <div className="pt-4 border-t border-slate-600 space-y-3">
                          {integration.fields.map(field => (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-gray-300 mb-1">{field.name}</label>
                              <div className="relative">
                                <input
                                  type={showKeys[`${integration.id}-${field.key}`] ? 'text' : field.type}
                                  value={formData[integration.id]?.[field.key] || ''}
                                  onChange={(e) => handleInputChange(integration.id, field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 pr-10"
                                />
                                {field.type === 'password' && (
                                  <button
                                    onClick={() => setShowKeys({
                                      ...showKeys,
                                      [`${integration.id}-${field.key}`]: !showKeys[`${integration.id}-${field.key}`],
                                    })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                  >
                                    {showKeys[`${integration.id}-${field.key}`] ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{field.help}</p>
                            </div>
                          ))}

                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleConnect(integration.id)}
                              disabled={loading[integration.id]}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold text-sm transition flex items-center justify-center gap-2"
                            >
                              {loading[integration.id] ? (
                                <Loader size={16} className="animate-spin" />
                              ) : (
                                <>
                                  <Check size={16} />
                                  Connect
                                </>
                              )}
                            </button>
                            <a
                              href={integration.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded font-semibold text-sm transition"
                            >
                              📖
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Connected Status */}
                      {isConnected && (
                        <div className="pt-4 border-t border-slate-600 space-y-3">
                          <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
                            <p className="text-xs text-green-400 font-semibold">✅ Connected</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(integrations[integration.id]?.connectedAt).toLocaleDateString()} at {new Date(integrations[integration.id]?.connectedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDisconnect(integration.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold text-sm transition"
                            >
                              Disconnect
                            </button>
                            <a
                              href={integration.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded font-semibold text-sm transition"
                            >
                              📖
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Setup Guide */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-blue-300 mb-3">🚀 Getting Started with Automation</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <p>✅ Connect <strong>Printful</strong> for auto-fulfillment</p>
            <p>✅ Connect <strong>Gmail SMTP</strong> for automatic email notifications</p>
            <p>✅ Connect <strong>Social Media</strong> platforms to publish products with one click</p>
            <p>✅ Set up <strong>Cron Jobs</strong> in your environment variables for automated shipping updates</p>
            <p>✅ Click <strong>Publish</strong> on any product to post across all platforms instantly!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
