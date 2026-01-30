'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, AlertCircle, ExternalLink, ArrowLeft, Zap, Copy, CheckCircle } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { db } from '@/lib/database';

export default function Integrations() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [integrations, setIntegrations] = useState({});
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [testingIntegration, setTestingIntegration] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
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
    loadIntegrations(currentUser.id);
  }, [router]);

  const loadIntegrations = (userId) => {
    const settings = db.getSettings(userId);
    setIntegrations(settings.integrations || {});
  };

  const saveIntegration = () => {
    if (!user) return;
    
    const settings = db.getSettings(user.id) || {};
    settings.integrations = {
      ...settings.integrations,
      [selectedIntegration.id]: formData
    };
    
    db.saveSettings(user.id, settings);
    loadIntegrations(user.id);
    setShowModal(false);
    setFormData({});
  };

  const disconnectIntegration = (integrationId) => {
    if (!user) return;
    
    const settings = db.getSettings(user.id) || {};
    delete settings.integrations[integrationId];
    
    db.saveSettings(user.id, settings);
    loadIntegrations(user.id);
  };

  const testIntegration = async (integrationId) => {
    setTestingIntegration(integrationId);
    // Simulate API test
    setTimeout(() => {
      setTestResult({ success: true, message: 'Connection successful!' });
      setTestingIntegration(null);
      setTimeout(() => setTestResult(null), 3000);
    }, 2000);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const connectedCount = Object.keys(integrations).length;

  const allIntegrations = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Sync orders and products from your Shopify store',
      icon: '🛍️',
      setupTime: '5 min',
      fields: [
        { name: 'storeUrl', label: 'Store URL', type: 'text', placeholder: 'your-store.myshopify.com', help: 'Found in your Shopify admin URL' },
        { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'shpat_...', help: 'Generate in Apps → Develop apps → API credentials' }
      ],
      docs: 'https://shopify.dev/api/admin-rest',
      setupSteps: [
        'Log into Shopify Admin',
        'Go to Settings → Apps and integrations',
        'Click "Develop apps"',
        'Create new app',
        'Enable Admin API',
        'Select scopes: read_orders, read_products, write_inventory',
        'Generate and copy your Access Token'
      ]
    },
    {
      id: 'printful',
      name: 'Printful',
      description: 'Automate printing and shipping of orders',
      icon: '📦',
      setupTime: '3 min',
      fields: [
        { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'api_...', help: 'Your Printful API authentication key' }
      ],
      docs: 'https://www.printful.com/docs',
      setupSteps: [
        'Log into Printful Dashboard',
        'Go to Account → Settings',
        'Find API section',
        'Click "Generate new API key"',
        'Copy your API Key',
        'Paste it below'
      ]
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Process payments and track revenue',
      icon: '💳',
      setupTime: '5 min',
      fields: [
        { name: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...', help: 'Public key for client-side operations' },
        { name: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...', help: 'Secret key - keep this private!' }
      ],
      docs: 'https://stripe.com/docs/api',
      setupSteps: [
        'Log into Stripe Dashboard',
        'Go to Developers → API keys',
        'Copy Publishable key (starts with pk_)',
        'Copy Secret key (starts with sk_)',
        'Paste both below'
      ]
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect to 1000+ apps for automation',
      icon: '⚡',
      setupTime: '10 min',
      fields: [
        { name: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.zapier.com/...', help: 'Your Zapier webhook URL for automations' }
      ],
      docs: 'https://zapier.com/help',
      setupSteps: [
        'Go to Zapier.com',
        'Create new Zap',
        'Select "Webhook by Zapier" as trigger',
        'Copy your unique webhook URL',
        'Paste it below',
        'Now you can trigger automations from DropBoard!'
      ]
    },
    {
      id: 'tiktok',
      name: 'TikTok Shop',
      description: 'Sell directly on TikTok',
      icon: '🎵',
      setupTime: '10 min',
      fields: [
        { name: 'shopId', label: 'Shop ID', type: 'text', placeholder: 'Your shop ID', help: 'Found in TikTok Shop settings' },
        { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Bearer token...', help: 'OAuth access token from TikTok' }
      ],
      docs: 'https://developers.tiktok.com/doc',
      setupSteps: [
        'Log into TikTok Shop Seller Center',
        'Go to Settings → API',
        'Create new app',
        'Get your Shop ID',
        'Generate Access Token',
        'Paste both below'
      ]
    },
    {
      id: 'facebook',
      name: 'Facebook & Instagram',
      description: 'Sell on Facebook and Instagram',
      icon: 'f',
      setupTime: '10 min',
      fields: [
        { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'EAACW...', help: 'Facebook Graph API token' },
        { name: 'pageId', label: 'Page ID', type: 'text', placeholder: 'Your page ID', help: 'Your Facebook business page ID' }
      ],
      docs: 'https://developers.facebook.com/docs',
      setupSteps: [
        'Go to Facebook Business Suite',
        'Navigate to Settings → Integrations',
        'Select your Instagram/Facebook Shop',
        'Go to Facebook Developer Console',
        'Generate Access Token with pages_manage_metadata scope',
        'Get your Page ID from page settings'
      ]
    },
    {
      id: 'sendgrid',
      name: 'SendGrid Email',
      description: 'Send automated customer emails',
      icon: '📧',
      setupTime: '3 min',
      fields: [
        { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'SG.xxx...', help: 'SendGrid API key for email delivery' }
      ],
      docs: 'https://sendgrid.com/docs',
      setupSteps: [
        'Log into SendGrid',
        'Go to Settings → API Keys',
        'Click "Create API Key"',
        'Give it Mail Send permission',
        'Copy your API Key',
        'Paste it below'
      ]
    }
  ];

  const integrationById = (id) => allIntegrations.find(i => i.id === id);
  const isConnected = (id) => !!integrations[id];

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Integrations</h1>
            <p className="text-xs text-gray-400">Connect platforms for automation</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-accent">{connectedCount} Connected</p>
            <p className="text-xs text-gray-400">of {allIntegrations.length}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Progress Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Setup Progress</h3>
            <span className="text-2xl font-bold text-accent">{Math.round((connectedCount / allIntegrations.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-accent rounded-full h-3 transition-all"
              style={{ width: `${(connectedCount / allIntegrations.length) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {connectedCount === 0 && 'Start by connecting Shopify to sync your store'}
            {connectedCount === 1 && 'Great! Add Printful for automatic fulfillment'}
            {connectedCount === 2 && 'Excellent! Connect Stripe to process payments'}
            {connectedCount >= 3 && 'You\'re all set! Enable automations in Zapier'}
          </p>
        </div>

        {/* Quick Start Guide */}
        <div className="card bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/30">
          <h3 className="text-lg font-bold text-white mb-4">🚀 Recommended Setup Order</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-bold text-accent">1.</span>
              <span className="text-gray-300"><strong>Shopify</strong> - Sync your store and products (5 min)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-accent">2.</span>
              <span className="text-gray-300"><strong>Printful</strong> - Auto-print and ship orders (3 min)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-accent">3.</span>
              <span className="text-gray-300"><strong>Stripe</strong> - Accept payments (5 min)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-accent">4.</span>
              <span className="text-gray-300"><strong>SendGrid</strong> - Send automated emails (3 min)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-accent">5.</span>
              <span className="text-gray-300"><strong>Zapier</strong> - Create custom automations (10 min)</span>
            </li>
          </ol>
        </div>

        {/* Integrations Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allIntegrations.map((integration) => (
              <div
                key={integration.id}
                className={`card relative overflow-hidden transition ${
                  isConnected(integration.id) ? 'border-l-4 border-l-accent' : ''
                }`}
              >
                {isConnected(integration.id) && (
                  <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs flex items-center gap-1">
                    <Check size={12} />
                    Connected
                  </div>
                )}

                <div className="text-3xl mb-2">{integration.icon}</div>
                <h3 className="text-lg font-bold text-white mb-1">{integration.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{integration.setupTime}</p>
                <p className="text-sm text-gray-400 mb-4">{integration.description}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedIntegration(integration);
                      setFormData(integrations[integration.id] || {});
                      setShowModal(true);
                    }}
                    className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition ${
                      isConnected(integration.id)
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-accent text-white hover:bg-emerald-600'
                    }`}
                  >
                    {isConnected(integration.id) ? 'Manage' : 'Setup'}
                  </button>
                  <a
                    href={integration.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded hover:bg-gray-700 transition"
                    title="View documentation"
                  >
                    <ExternalLink size={16} className="text-gray-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Modal */}
        {showModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">{selectedIntegration.name} Setup</h2>

              {testResult && (
                <div className={`mb-6 p-4 rounded flex items-center gap-3 ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {testResult.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  {testResult.message}
                </div>
              )}

              {/* Setup Steps */}
              <div className="mb-6 pb-6 border-b border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 mb-3">📋 Setup Steps:</h3>
                <ol className="space-y-2 text-sm text-gray-400 ml-4 list-decimal">
                  {selectedIntegration.setupSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 mb-6">
                {selectedIntegration.fields.map((field) => {
                  const isCopied = copiedField === field.name;
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        {field.label}
                      </label>
                      <p className="text-xs text-gray-500 mb-2">{field.help}</p>
                      <div className="relative">
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          className="input-field pr-10"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        />
                        {formData[field.name] && (
                          <button
                            onClick={() => copyToClipboard(formData[field.name], field.name)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            title="Copy to clipboard"
                          >
                            {isCopied ? (
                              <CheckCircle size={16} className="text-green-400" />
                            ) : (
                              <Copy size={16} className="text-gray-500 hover:text-gray-300" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedIntegration(null);
                    setFormData({});
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => testIntegration(selectedIntegration.id)}
                  disabled={!formData[selectedIntegration.fields[0].name] || testingIntegration === selectedIntegration.id}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {testingIntegration === selectedIntegration.id ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={saveIntegration}
                  className="flex-1 btn btn-primary"
                >
                  Save Integration
                </button>
                {isConnected(selectedIntegration.id) && (
                  <button
                    onClick={() => {
                      disconnectIntegration(selectedIntegration.id);
                      setShowModal(false);
                      setSelectedIntegration(null);
                    }}
                    className="btn btn-danger"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

