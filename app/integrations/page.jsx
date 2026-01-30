'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Settings, Check, AlertCircle, Copy, Eye, EyeOff, Loader } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';

// Integration configurations
const INTEGRATIONS = [
  {
    id: 'printful',
    name: 'Printful',
    icon: '📦',
    category: 'Print-on-Demand',
    description: 'Connect Printful for custom print products and fulfillment',
    color: 'from-blue-500 to-blue-600',
    fields: [
      { name: 'API Key', key: 'apiKey', type: 'password', placeholder: 'Your Printful API key' },
      { name: 'Store ID', key: 'storeId', type: 'text', placeholder: 'Your Printful store ID' },
    ],
    docs: 'https://www.printful.com/api',
    status: 'disconnected',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    category: 'Payment Processing',
    description: 'Accept payments from customers worldwide',
    color: 'from-purple-500 to-purple-600',
    fields: [
      { name: 'Publishable Key', key: 'publishableKey', type: 'text', placeholder: 'pk_live_...' },
      { name: 'Secret Key', key: 'secretKey', type: 'password', placeholder: 'sk_live_...' },
    ],
    docs: 'https://stripe.com/docs/keys',
    status: 'disconnected',
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    icon: '🎵',
    category: 'Social Commerce',
    description: 'Sell directly on TikTok Shop and access trending products',
    color: 'from-black to-gray-800',
    fields: [
      { name: 'Access Token', key: 'accessToken', type: 'password', placeholder: 'Your TikTok access token' },
      { name: 'Shop ID', key: 'shopId', type: 'text', placeholder: 'Your TikTok shop ID' },
    ],
    docs: 'https://developers.tiktok.com/doc/shop-api-overview',
    status: 'disconnected',
  },
  {
    id: 'instagram',
    name: 'Instagram Shop',
    icon: '📷',
    category: 'Social Commerce',
    description: 'Create shoppable posts on Instagram',
    color: 'from-pink-500 to-purple-600',
    fields: [
      { name: 'Business Account ID', key: 'businessAccountId', type: 'text', placeholder: 'Your Instagram business account ID' },
      { name: 'Access Token', key: 'accessToken', type: 'password', placeholder: 'Your Instagram access token' },
    ],
    docs: 'https://developers.facebook.com/docs/instagram-api',
    status: 'disconnected',
  },
  {
    id: 'facebook',
    name: 'Facebook Shop',
    icon: '👍',
    category: 'Social Commerce',
    description: 'Set up Facebook Shop for product sales',
    color: 'from-blue-600 to-blue-700',
    fields: [
      { name: 'Page ID', key: 'pageId', type: 'text', placeholder: 'Your Facebook page ID' },
      { name: 'Access Token', key: 'accessToken', type: 'password', placeholder: 'Your Facebook access token' },
    ],
    docs: 'https://developers.facebook.com/docs/facebook-shop',
    status: 'disconnected',
  },
  {
    id: 'google-trends',
    name: 'Google Trends',
    icon: '📈',
    category: 'Analytics & Trends',
    description: 'Get trending keywords and product insights',
    color: 'from-yellow-500 to-red-600',
    fields: [
      { name: 'API Key', key: 'apiKey', type: 'password', placeholder: 'Your Google Cloud API key' },
    ],
    docs: 'https://trends.google.com/trends/',
    status: 'disconnected',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    icon: '📧',
    category: 'Email Marketing',
    description: 'Send transactional and marketing emails',
    color: 'from-red-500 to-orange-600',
    fields: [
      { name: 'API Key', key: 'apiKey', type: 'password', placeholder: 'Your SendGrid API key' },
    ],
    docs: 'https://sendgrid.com/docs/for-developers/getting-started/api-authentication',
    status: 'disconnected',
  },
  {
    id: 'spocket',
    name: 'Spocket',
    icon: '🌍',
    category: 'Dropshipping',
    description: 'Connect verified US and EU suppliers',
    color: 'from-green-500 to-emerald-600',
    fields: [
      { name: 'API Key', key: 'apiKey', type: 'password', placeholder: 'Your Spocket API key' },
    ],
    docs: 'https://app.spocket.co/api',
    status: 'disconnected',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    category: 'Store Integration',
    description: 'Integrate with your Shopify store',
    color: 'from-green-600 to-teal-600',
    fields: [
      { name: 'Store URL', key: 'storeUrl', type: 'text', placeholder: 'your-store.myshopify.com' },
      { name: 'Access Token', key: 'accessToken', type: 'password', placeholder: 'Your Shopify access token' },
    ],
    docs: 'https://shopify.dev/docs/admin-api',
    status: 'disconnected',
  },
];

export default function Integrations() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [notification, setNotification] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState({});
  const [formData, setFormData] = useState({});
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    loadIntegrations();
  }, [router]);

  const loadIntegrations = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('integrations') || '{}');
      const updated = integrations.map(integration => {
        if (saved[integration.id]) {
          return {
            ...integration,
            status: 'connected',
            data: saved[integration.id],
          };
        }
        return integration;
      });
      setIntegrations(updated);
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const handleConnect = async (integrationId) => {
    const integration = integrations.find(i => i.id === integrationId);
    const data = formData[integrationId] || {};

    if (integration.fields.some(field => !data[field.key])) {
      setNotification('❌ Please fill in all fields');
      return;
    }

    setLoading({ ...loading, [integrationId]: true });
    try {
      // Validate connection
      const response = await fetch(`/api/integrations/${integrationId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Save to localStorage
        const saved = JSON.parse(localStorage.getItem('integrations') || '{}');
        saved[integrationId] = data;
        localStorage.setItem('integrations', JSON.stringify(saved));

        // Update state
        const updated = integrations.map(i => {
          if (i.id === integrationId) {
            return {
              ...i,
              status: 'connected',
              data,
            };
          }
          return i;
        });
        setIntegrations(updated);
        setExpandedId(null);
        setFormData({ ...formData, [integrationId]: {} });
        setNotification(`✅ ${integration.name} connected successfully!`);
        setTimeout(() => setNotification(''), 3000);
      } else {
        setNotification(`❌ Failed to connect. Check your credentials.`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setNotification('❌ Connection failed. Try again later.');
    } finally {
      setLoading({ ...loading, [integrationId]: false });
    }
  };

  const handleDisconnect = (integrationId) => {
    try {
      const saved = JSON.parse(localStorage.getItem('integrations') || '{}');
      delete saved[integrationId];
      localStorage.setItem('integrations', JSON.stringify(saved));

      const updated = integrations.map(i => {
        if (i.id === integrationId) {
          return {
            ...i,
            status: 'disconnected',
            data: undefined,
          };
        }
        return i;
      });
      setIntegrations(updated);
      setNotification('✅ Integration disconnected');
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleInputChange = (integrationId, field, value) => {
    setFormData({
      ...formData,
      [integrationId]: {
        ...formData[integrationId],
        [field]: value,
      },
    });
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading integrations...</p>
        </div>
      </div>
    );
  }

  const connected = integrations.filter(i => i.status === 'connected').length;

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
              <h1 className="text-2xl font-bold text-white">🔗 Integrations</h1>
              <p className="text-xs text-gray-400">Connect your favorite tools and platforms</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{connected}/{integrations.length} Connected</p>
            <p className="text-xs text-gray-400">Ready to scale</p>
          </div>
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

        {/* Categories */}
        {['Print-on-Demand', 'Payment Processing', 'Social Commerce', 'Analytics & Trends', 'Email Marketing', 'Dropshipping', 'Store Integration'].map(category => {
          const categoryIntegrations = integrations.filter(i => i.category === category);
          if (categoryIntegrations.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {category === 'Print-on-Demand' && '📦'}
                {category === 'Payment Processing' && '💳'}
                {category === 'Social Commerce' && '📱'}
                {category === 'Analytics & Trends' && '📊'}
                {category === 'Email Marketing' && '📧'}
                {category === 'Dropshipping' && '🌍'}
                {category === 'Store Integration' && '🛍️'}
                {category}
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryIntegrations.map(integration => (
                  <div
                    key={integration.id}
                    className={`card cursor-pointer transition ${
                      expandedId === integration.id
                        ? 'ring-2 ring-accent'
                        : 'hover:border-accent'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedId(expandedId === integration.id ? null : integration.id)}
                      className="space-y-3"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-2xl mb-2">{integration.icon}</p>
                          <h3 className="font-bold text-white">{integration.name}</h3>
                          <p className="text-xs text-gray-400 mt-1">{integration.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          integration.status === 'connected'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {integration.status === 'connected' ? '✅ Connected' : '⭕ Disconnected'}
                        </div>
                      </div>

                      {/* Expand indicator */}
                      {integration.status === 'disconnected' && (
                        <p className="text-xs text-gray-500">Click to connect →</p>
                      )}
                    </div>

                    {/* Expanded Form */}
                    {expandedId === integration.id && integration.status === 'disconnected' && (
                      <div className="pt-4 border-t border-gray-700 space-y-4">
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
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                  {showKeys[`${integration.id}-${field.key}`] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleConnect(integration.id)}
                            disabled={loading[integration.id]}
                            className="flex-1 btn btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading[integration.id] ? (
                              <>
                                <Loader size={16} className="animate-spin" />
                                Connecting...
                              </>
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
                            className="flex-1 btn btn-secondary text-sm"
                          >
                            📖 Docs
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Connected Info */}
                    {integration.status === 'connected' && (
                      <div className="pt-4 border-t border-gray-700 space-y-3">
                        <div className="bg-green-500/10 rounded p-3">
                          <p className="text-xs text-green-400 font-semibold mb-1">✅ Status: Connected</p>
                          <p className="text-xs text-gray-400">Connected on {new Date().toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => handleDisconnect(integration.id)}
                          className="w-full btn btn-danger text-sm flex items-center justify-center gap-2"
                        >
                          <LogOut size={16} />
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Summary Card */}
        <div className="card bg-gradient-to-br from-accent/10 to-blue-500/10 border border-accent/30">
          <h3 className="text-lg font-bold text-white mb-4">🚀 Next Steps</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-white mb-2">Recommended Priority:</p>
              <ol className="text-gray-400 space-y-1 list-decimal list-inside">
                <li>Printful (Print-on-Demand)</li>
                <li>Stripe (Accept payments)</li>
                <li>TikTok Shop (Social selling)</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">After connecting APIs:</p>
              <ul className="text-gray-400 space-y-1 list-disc list-inside">
                <li>Trending products auto-populate</li>
                <li>Social publishing activates</li>
                <li>Payment processing works</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

