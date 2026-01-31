'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, Check, AlertCircle, Eye, EyeOff, Loader, Info } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';

const INTEGRATIONS = [
  {
    id: 'printful',
    name: 'Printful',
    icon: '📦',
    category: 'Print-on-Demand',
    description: 'Connect Printful for custom print products and fulfillment',
    fields: [
      { 
        name: 'Client ID', 
        key: 'clientId', 
        type: 'text', 
        placeholder: '86b2a192758c2d8db39495f7df14fef3',
        help: 'Get from: Printful Dashboard → Apps → Your App → Credentials'
      },
      { 
        name: 'Client Secret', 
        key: 'clientSecret', 
        type: 'password', 
        placeholder: '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',
        help: 'Get from: Printful Dashboard → Apps → Your App → Credentials'
      },
    ],
    docs: 'https://developers.printful.com/docs',
    status: 'disconnected',
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    icon: '🎵',
    category: 'Social Commerce',
    description: 'Auto-publish videos to TikTok and sell directly',
    fields: [
      { 
        name: 'Client Key', 
        key: 'clientKey', 
        type: 'text', 
        placeholder: 'awlp8674jr02y4b4',
        help: 'Get from: TikTok Developers → Your App → App details → Credentials'
      },
      { 
        name: 'Client Secret', 
        key: 'clientSecret', 
        type: 'password', 
        placeholder: 'Q4a7y962CyIAmbcNNZi43GlKOckTTj1L',
        help: 'Get from: TikTok Developers → Your App → App details → Credentials'
      },
      { 
        name: 'Redirect URI (Optional)', 
        key: 'redirectUri', 
        type: 'text', 
        placeholder: 'https://yoursite.com/api/auth/tiktok/callback',
        help: 'Must match URI in TikTok app settings'
      },
    ],
    docs: 'https://developers.tiktok.com/doc/content-posting-api-reference-direct-post',
    status: 'disconnected',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    category: 'Store Integration',
    description: 'Integrate with your Shopify store to sync products and orders',
    fields: [
      { 
        name: 'Store URL', 
        key: 'storeUrl', 
        type: 'text', 
        placeholder: 'dropshipwithmonk.myshopify.com',
        help: 'Your Shopify store domain (WITHOUT https://)'
      },
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx',
        help: 'Get from: Shopify Admin → Settings → Apps and integrations → Develop apps → API credentials'
      },
    ],
    docs: 'https://shopify.dev/docs/admin-api/rest/reference',
    status: 'disconnected',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    category: 'Payment Processing',
    description: 'Accept payments from customers worldwide',
    fields: [
      { 
        name: 'Publishable Key', 
        key: 'publishableKey', 
        type: 'text', 
        placeholder: 'pk_live_...',
        help: 'Get from: Stripe Dashboard → Developers → API Keys'
      },
      { 
        name: 'Secret Key', 
        key: 'secretKey', 
        type: 'password', 
        placeholder: 'sk_live_...',
        help: 'Get from: Stripe Dashboard → Developers → API Keys'
      },
    ],
    docs: 'https://stripe.com/docs/keys',
    status: 'disconnected',
  },
  {
    id: 'instagram',
    name: 'Instagram Shop',
    icon: '📷',
    category: 'Social Commerce',
    description: 'Create shoppable posts on Instagram',
    fields: [
      { 
        name: 'Business Account ID', 
        key: 'businessAccountId', 
        type: 'text', 
        placeholder: 'Your Instagram Business Account ID',
        help: 'Get from: Meta Business Suite → Settings → Instagram Accounts'
      },
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'Your Instagram Access Token',
        help: 'Get from: Meta for Developers → Your App → Tools → Access Token'
      },
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
    fields: [
      { 
        name: 'Page ID', 
        key: 'pageId', 
        type: 'text', 
        placeholder: 'Your Facebook Page ID',
        help: 'Get from: Facebook Page → About → Page ID'
      },
      { 
        name: 'Access Token', 
        key: 'accessToken', 
        type: 'password', 
        placeholder: 'Your Facebook Access Token',
        help: 'Get from: Meta for Developers → Your App → Tools → Access Token'
      },
    ],
    docs: 'https://developers.facebook.com/docs/facebook-shop',
    status: 'disconnected',
  },
  {
    id: 'spocket',
    name: 'Spocket',
    icon: '🌍',
    category: 'Dropshipping',
    description: 'Connect verified US and EU suppliers',
    fields: [
      { 
        name: 'API Key', 
        key: 'apiKey', 
        type: 'password', 
        placeholder: 'Your Spocket API Key',
        help: 'Get from: Spocket Dashboard → Settings → API Keys'
      },
    ],
    docs: 'https://app.spocket.co/api',
    status: 'disconnected',
  },
  {
    id: 'gmail-smtp',
    name: 'Gmail / SMTP',
    icon: '📧',
    category: 'Email Marketing',
    description: 'Send emails through Gmail, Outlook, or custom SMTP',
    fields: [
      { 
        name: 'Email Address', 
        key: 'emailAddress', 
        type: 'email', 
        placeholder: 'your-email@gmail.com',
        help: 'Your email address for sending'
      },
      { 
        name: 'SMTP Host', 
        key: 'smtpHost', 
        type: 'text', 
        placeholder: 'smtp.gmail.com',
        help: 'SMTP server (smtp.gmail.com, smtp-mail.outlook.com, etc)'
      },
      { 
        name: 'SMTP Port', 
        key: 'smtpPort', 
        type: 'text', 
        placeholder: '587',
        help: 'Usually 587 (TLS) or 465 (SSL)'
      },
      { 
        name: 'App Password', 
        key: 'appPassword', 
        type: 'password', 
        placeholder: 'Your app-specific password',
        help: 'For Gmail: Enable 2FA and create app password'
      },
    ],
    docs: 'https://support.google.com/accounts/answer/185833',
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
  const [detailedError, setDetailedError] = useState('');

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

    // Check required fields
    const requiredFields = integration.fields.filter(f => f.name !== 'Redirect URI (Optional)');
    if (requiredFields.some(field => !data[field.key])) {
      setNotification('❌ Please fill in all required fields');
      return;
    }

    setLoading({ ...loading, [integrationId]: true });
    setDetailedError('');
    
    try {
      const response = await fetch(`/api/integrations/${integrationId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const saved = JSON.parse(localStorage.getItem('integrations') || '{}');
        saved[integrationId] = result.credentials || data;
        localStorage.setItem('integrations', JSON.stringify(saved));

        const updated = integrations.map(i => {
          if (i.id === integrationId) {
            return {
              ...i,
              status: 'connected',
              data: result.credentials || data,
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
        const errorMessage = result.error || 'Connection failed';
        setNotification(`❌ ${errorMessage}`);
        setDetailedError(errorMessage);
      }
    } catch (error) {
      console.error('Connection error:', error);
      const errorMsg = error.message || 'Unknown error';
      setNotification(`❌ Connection failed: ${errorMsg}`);
      setDetailedError(`Error details: ${errorMsg}`);
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
      setDetailedError('');
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
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            notification.includes('✅')
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification.includes('✅') ? <Check size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
            <div>
              <p>{notification}</p>
              {detailedError && <p className="text-xs mt-2 opacity-90">{detailedError}</p>}
            </div>
          </div>
        )}

        {/* Categories */}
        {['Print-on-Demand', 'Payment Processing', 'Social Commerce', 'Email Marketing', 'Dropshipping', 'Store Integration'].map(category => {
          const categoryIntegrations = integrations.filter(i => i.category === category);
          if (categoryIntegrations.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {category === 'Print-on-Demand' && '📦'}
                {category === 'Payment Processing' && '💳'}
                {category === 'Social Commerce' && '📱'}
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
                        <div className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          integration.status === 'connected'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {integration.status === 'connected' ? '✅ Connected' : '⭕ Disconnected'}
                        </div>
                      </div>

                      {integration.status === 'disconnected' && (
                        <p className="text-xs text-gray-500">Click to connect →</p>
                      )}
                    </div>

                    {/* Expanded Form */}
                    {expandedId === integration.id && integration.status === 'disconnected' && (
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
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
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
                            className="flex-1 btn btn-secondary text-sm text-center"
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
          <h3 className="text-lg font-bold text-white mb-4">🚀 Quick Start</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-white mb-2 flex items-center gap-2">
                <Info size={16} />
                Your Credentials:
              </p>
              <div className="bg-gray-800/50 rounded p-3 space-y-2 font-mono text-xs text-gray-300">
                <p><span className="text-gray-500">Shopify Store:</span> dropshipwithmonk.myshopify.com</p>
                <p><span className="text-gray-500">Shopify Client ID:</span> 86b2a192758c2d8db39495f7df14fef3</p>
                <p><span className="text-gray-500">TikTok Client Key:</span> awlp8674jr02y4b4</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Troubleshooting:</p>
              <ul className="text-gray-400 space-y-2 list-disc list-inside">
                <li>Double-check credentials copy/paste</li>
                <li>No extra spaces before/after</li>
                <li>Check browser console for errors</li>
                <li>Verify API keys are active</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
