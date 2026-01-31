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
        placeholder: 'app-6260333',
        help: 'Get from: Printful Dashboard → Apps → Your App → Credentials'
      },
      { 
        name: 'Secret Key', 
        key: 'clientSecret', 
        type: 'password', 
        placeholder: 'Og0yW9XwuRlHt0...',
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
        placeholder: 'your-store.myshopify.com',
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

    // Check required fields
    const requiredFields = integration.fields.filter(f => !f.name.includes('Optional'));
    if (requiredFields.some(field => !data[field.key])) {
      setNotification('❌ Please fill in all required fields');
      return;
    }

    setLoading({ ...loading, [integrationId]: true });
    
    try {
      console.log(`[${integrationId}] Sending request to API...`);
      console.log(`[${integrationId}] Payload:`, data);

      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log(`[${integrationId}] Response status:`, response.status);
      console.log(`[${integrationId}] Response headers:`, {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });

      // Get response as text first
      const responseText = await response.text();
      console.log(`[${integrationId}] Response text length:`, responseText.length);
      console.log(`[${integrationId}] Response text (first 200 chars):`, responseText.substring(0, 200));

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        console.error(`[${integrationId}] Empty response from API`);
        setNotification(`❌ Empty response from server. Check server logs.`);
        setLoading({ ...loading, [integrationId]: false });
        return;
      }

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log(`[${integrationId}] Parsed JSON successfully`);
      } catch (parseError) {
        console.error(`[${integrationId}] Failed to parse JSON:`, parseError);
        console.error(`[${integrationId}] Response was:`, responseText);
        
        // Check if it's HTML (error page)
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          setNotification(`❌ Server returned an error page. Check if the API endpoint exists.`);
        } else {
          setNotification(`❌ Invalid response from server: ${responseText.substring(0, 100)}`);
        }
        
        setLoading({ ...loading, [integrationId]: false });
        return;
      }

      // Check if response indicates success
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
        // Handle error response
        const errorMessage = result.error || result.message || 'Unknown error';
        console.error(`[${integrationId}] Error response:`, result);
        setNotification(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error(`[${integrationId}] Fetch error:`, error);
      setNotification(`❌ Connection failed: ${error.message}`);
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
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            notification.includes('✅')
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification.includes('✅') ? <Check size={20} className="mt-0.5" /> : <AlertCircle size={20} className="mt-0.5" />}
            <p>{notification}</p>
          </div>
        )}

        {/* Categories */}
        {['Print-on-Demand', 'Payment Processing', 'Social Commerce', 'Store Integration'].map(category => {
          const categoryIntegrations = integrations.filter(i => i.category === category);
          if (categoryIntegrations.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {category === 'Print-on-Demand' && '📦'}
                {category === 'Payment Processing' && '💳'}
                {category === 'Social Commerce' && '📱'}
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

        {/* Info Card */}
        <div className="card bg-gradient-to-br from-accent/10 to-blue-500/10 border border-accent/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Info size={20} />
            Connection Tips
          </h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Make sure your credentials are correct (no extra spaces)</p>
            <p>• Check browser DevTools Console (F12) for error details</p>
            <p>• If connection fails, reload the page and try again</p>
            <p>• Your credentials are saved securely in localStorage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

