'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Check, AlertCircle, Eye, EyeOff, Loader, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db as firebaseDb } from '@/lib/firebase';

const INTEGRATIONS = [
  {
    id: 'printful',
    name: 'Printful',
    icon: '📦',
    category: 'Print-on-Demand',
    description: 'Connect Printful for custom print products and fulfillment',
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
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    category: 'Store Integration',
    description: 'Integrate with your Shopify store',
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
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    category: 'Payment Processing',
    description: 'Accept payments from customers',
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
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    icon: '🎵',
    category: 'Social Commerce',
    description: 'Auto-publish videos to TikTok',
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
    ],
    docs: 'https://developers.tiktok.com',
  },
  {
    id: 'gmail-smtp',
    name: 'Gmail SMTP',
    icon: '📧',
    category: 'Email & Notifications',
    description: 'Send transactional emails',
    fields: [
      { 
        name: 'Email Address', 
        key: 'email', 
        type: 'text', 
        placeholder: 'your-email@gmail.com',
        help: 'Your Gmail email'
      },
      { 
        name: 'App Password', 
        key: 'appPassword', 
        type: 'password', 
        placeholder: 'xxxx xxxx xxxx xxxx',
        help: 'From Google Account'
      },
    ],
    docs: 'https://support.google.com/accounts/answer/185833',
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

      // Call validator
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();
      console.log(`Response:`, result);

      if (!response.ok || !result.success) {
        showNotification(`❌ ${result.error || 'Connection failed'}`, 'error');
        setLoading({ ...loading, [integrationId]: false });
        return;
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
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const connected = Object.keys(integrations).filter(k => integrations[k]?.status === 'connected').length;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">🔗 Integrations</h1>
              <p className="text-xs text-gray-400">Connect your platforms</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-red-400">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg ${
            notification.includes('✅') 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification}
          </div>
        )}

        {/* Status */}
        <div className="card bg-accent/10 border border-accent/30">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Connected</h3>
              <p className="text-sm text-gray-400">{connected} of {INTEGRATIONS.length}</p>
            </div>
            <p className="text-3xl font-bold text-accent">{connected}</p>
          </div>
        </div>

        {/* Integrations */}
        {['Print-on-Demand', 'Store Integration', 'Payment Processing', 'Social Commerce', 'Email & Notifications'].map(category => {
          const categoryIntegrations = INTEGRATIONS.filter(i => i.category === category);
          if (categoryIntegrations.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-white">{category}</h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryIntegrations.map(integration => {
                  const isConnected = integrations[integration.id]?.status === 'connected';

                  return (
                    <div
                      key={integration.id}
                      className={`card cursor-pointer transition ${
                        expandedId === integration.id ? 'ring-2 ring-accent' : 'hover:border-accent'
                      }`}
                    >
                      <div onClick={() => setExpandedId(expandedId === integration.id ? null : integration.id)}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-2xl mb-2">{integration.icon}</p>
                            <h3 className="font-bold text-white">{integration.name}</h3>
                            <p className="text-xs text-gray-400 mt-1">{integration.description}</p>
                          </div>
                          <span className={`px-3 py-1 rounded text-xs font-bold ${
                            isConnected 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {isConnected ? '✅' : '⭕'}
                          </span>
                        </div>
                      </div>

                      {/* Form */}
                      {expandedId === integration.id && !isConnected && (
                        <div className="pt-4 border-t border-gray-700 space-y-3">
                          {integration.fields.map(field => (
                            <div key={field.key}>
                              <label className="block text-xs font-semibold text-gray-300 mb-1">{field.name}</label>
                              <div className="relative">
                                <input
                                  type={showKeys[`${integration.id}-${field.key}`] ? 'text' : field.type}
                                  value={formData[integration.id]?.[field.key] || ''}
                                  onChange={(e) => handleInputChange(integration.id, field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="input-field w-full text-sm pr-10"
                                />
                                {field.type === 'password' && (
                                  <button
                                    onClick={() => setShowKeys({
                                      ...showKeys,
                                      [`${integration.id}-${field.key}`]: !showKeys[`${integration.id}-${field.key}`],
                                    })}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                  >
                                    {showKeys[`${integration.id}-${field.key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
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
                              className="flex-1 btn btn-primary text-sm disabled:opacity-50"
                            >
                              {loading[integration.id] ? (
                                <Loader size={16} className="animate-spin mx-auto" />
                              ) : (
                                <>
                                  <Check size={16} className="inline mr-1" />
                                  Connect
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Connected */}
                      {isConnected && (
                        <div className="pt-4 border-t border-gray-700 space-y-3">
                          <div className="bg-green-500/10 p-3 rounded">
                            <p className="text-xs text-green-400 font-semibold">✅ Connected</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(integrations[integration.id]?.connectedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDisconnect(integration.id)}
                            className="w-full btn btn-danger text-sm"
                          >
                            Disconnect
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
