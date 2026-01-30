'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, ExternalLink, ArrowLeft, BookOpen, Zap, TrendingUp, DollarSign } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';

export default function Help() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('getting-started');
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
  }, [router]);

  const helpContent = {
    'getting-started': {
      title: 'Getting Started',
      icon: BookOpen,
      sections: [
        {
          id: 'gs1',
          title: 'What is DropBoard?',
          content: 'DropBoard is an all-in-one dropshipping automation platform. We automate 95% of the work - order processing, fulfillment, payments, customer notifications - so you can focus on marketing and growing your business.'
        },
        {
          id: 'gs2',
          title: 'How does DropBoard work?',
          content: `1. You add products to your store
2. Customer places order
3. Order automatically syncs to supplier (Printful, Spocket, etc.)
4. Supplier prints and ships
5. Tracking updates automatically
6. Customer gets notifications
7. You profit the difference!`
        },
        {
          id: 'gs3',
          title: 'Do I need to be technical?',
          content: 'No! DropBoard is designed for complete beginners. All integrations have step-by-step guides, and you can get help 24/7 from our support team. Most users are set up in 1-2 hours.'
        },
        {
          id: 'gs4',
          title: 'How much can I earn?',
          content: 'This depends on: traffic volume, conversion rate, product pricing, and competition. Beginners typically make $500-$5,000/month in their first 3 months. Some users reach $50K+/month by scaling.'
        },
        {
          id: 'gs5',
          title: 'Is there a setup fee?',
          content: 'No setup fees! DropBoard is free during beta. Once we exit beta, we charge 2-3% commission per order (only on successful sales). You can cancel anytime.'
        }
      ]
    },
    'setup': {
      title: 'Setup & Integration',
      icon: Zap,
      sections: [
        {
          id: 'setup1',
          title: 'How to connect Shopify',
          content: `1. Go to Integrations → Shopify → Setup
2. Log into Shopify Admin
3. Go to Settings → Apps and integrations
4. Click "Develop apps"
5. Create a new app
6. Enable Admin API scopes: read_orders, read_products, write_inventory
7. Copy your Access Token
8. Paste it in DropBoard and save

Takes about 5 minutes!`
        },
        {
          id: 'setup2',
          title: 'How to connect Printful',
          content: `1. Go to Integrations → Printful → Setup
2. Log into Printful
3. Go to Account → Settings → API
4. Click "Generate new API key"
5. Copy your API Key
6. Paste it in DropBoard and save

We'll automatically sync orders for printing and shipping!`
        },
        {
          id: 'setup3',
          title: 'How to set up payments with Stripe',
          content: `1. Go to Integrations → Stripe → Setup
2. Log into Stripe
3. Go to Developers → API keys
4. Copy your Publishable Key and Secret Key
5. Paste both in DropBoard and save

Now you can accept payments from customers!`
        },
        {
          id: 'setup4',
          title: 'Which suppliers can I use?',
          content: `DropBoard integrates with:
- Printful (T-shirts, mugs, hoodies)
- Spocket (US/EU suppliers)
- Oberlo (AliExpress products)
- Custom suppliers (DIY fulfillment)

You can connect multiple suppliers and we automatically route orders to the cheapest option!`
        },
        {
          id: 'setup5',
          title: 'How to set up TikTok Shop',
          content: `1. Go to Integrations → TikTok Shop → Setup
2. Log into TikTok Shop Seller Center
3. Go to Settings → API
4. Get your Shop ID and Access Token
5. Paste in DropBoard and save

Your TikTok sales will automatically sync to DropBoard!`
        }
      ]
    },
    'operations': {
      title: 'Running Your Business',
      icon: TrendingUp,
      sections: [
        {
          id: 'ops1',
          title: 'How do I add products?',
          content: `Option 1 (Easiest): Products sync automatically from your Shopify store
Option 2 (Manual): Go to Products → Add Product → Fill in details

For each product set:
- Name
- SKU (unique code)
- Price (what customers pay)
- Cost (what you pay supplier)
- Inventory (how many you have)
- Category

DropBoard automatically calculates profit margin!`
        },
        {
          id: 'ops2',
          title: 'How is profit calculated?',
          content: `Profit = Revenue - Product Cost - Shipping - Payment Fees - Commission

Example:
Customer pays: $50
Product cost: $12
Shipping: $5
Payment fee (Stripe 2.9%): $1.45
DropBoard commission: $1.50
YOUR PROFIT: $30.05

We show this for every order so you know exactly how much you make!`
        },
        {
          id: 'ops3',
          title: 'What\'s automated and what\'s manual?',
          content: `FULLY AUTOMATED:
✓ Order processing
✓ Payment collection
✓ Supplier fulfillment
✓ Shipping tracking
✓ Customer notifications
✓ Inventory updates

YOU NEED TO DO:
• Marketing (get traffic)
• Product selection (find winners)
• Price optimization (stay competitive)
• Customer support (respond to inquiries)

We handle the back-end operations!`
        },
        {
          id: 'ops4',
          title: 'How often should I check my dashboard?',
          content: `Recommended routine:
Daily: Check new orders and revenue
Weekly: Review best-selling products, update prices
Monthly: Analyze metrics, plan next month

You can set up email alerts so you don't have to check constantly!`
        },
        {
          id: 'ops5',
          title: 'What if a customer complains?',
          content: `Customers will email your store address. DropBoard provides templates for:
- Shipping delays
- Product quality issues
- Missing items
- Refund requests

We recommend responding within 24 hours. Printful handles most complaints about production/shipping quality.`
        }
      ]
    },
    'growth': {
      title: 'Marketing & Growth',
      icon: DollarSign,
      sections: [
        {
          id: 'growth1',
          title: 'How do I get my first sales?',
          content: `Step 1: Pick a trending product
- Check Google Trends, TikTok, YouTube
- Look for 2-3x search interest

Step 2: Create content
- Post 3-5 videos on TikTok/Instagram
- Show the product in action
- Target your niche

Step 3: Run ads
- Start with $5-10/day Facebook ads
- Target similar interests
- Test different audiences

Step 4: Optimize
- What converts? Do more of that
- What flops? Kill it
- Scale winners to $50/day

Most new sellers get their first 10 sales in 1-2 weeks!`
        },
        {
          id: 'growth2',
          title: 'Best free traffic sources',
          content: `1. TikTok (BEST FOR BEGINNERS)
- Post trend-jacking videos
- 0 cost, high viral potential
- Use trending sounds & effects

2. YouTube Shorts
- Similar to TikTok
- Easier monetization long-term
- Smaller audience but loyal

3. Pinterest
- Great for fashion & home goods
- Passive traffic (evergreen)
- Requires quality images

4. Instagram Reels
- Good for niche communities
- Hashtag strategy important

5. Reddit
- Niche communities
- Be helpful, not salesy`
        },
        {
          id: 'growth3',
          title: 'What\'s a good conversion rate?',
          content: `Industry Benchmarks:
- Beginners: 0.5-1% (normal!)
- Average store: 1-2%
- Good optimization: 2-3%
- Excellent: 3-5%

How to improve:
• Better product photos
• Customer reviews/testimonials
• Faster shipping guarantee
• Money-back guarantee
• Clear product description
• Social proof (best-seller badge)

Even 0.5% conversion at high traffic = $5K+/month!`
        },
        {
          id: 'growth4',
          title: 'How to find trending products',
          content: `1. Google Trends
- Search your niche
- See what's trending up
- Great seasonal products

2. TikTok Trends
- Watch #FYP for viral products
- Look for \"link in bio\" videos
- Note the product + hashtags

3. Shopify Exchanges
- See what stores are selling
- Copy their product selection (not their whole site)

4. Ali Baba
- New product categories
- Check supplier prices
- Future trends

5. DropBoard Dashboard
- We show trending products
- Sorted by search volume
- Data from your niche

Pro tip: Don't pick products YOU like. Pick products with DEMAND!`
        },
        {
          id: 'growth5',
          title: 'How to scale from $1K to $10K/month',
          content: `Phase 1 ($0-$1K): Launch 
- Pick 1 trending product
- Get first 100 sales
- Prove the model works
Time: 1-2 months

Phase 2 ($1K-$5K): Scale
- Double your ad spend when profitable
- Add complementary products (2-3 more)
- Build email list
Time: 2-3 months

Phase 3 ($5K-$10K): Expand
- Test new traffic sources
- Launch influencer partnerships
- Expand to TikTok Shop & Facebook
- Build repeat customer base
Time: 2-3 months

Total: 4-6 months to $10K/month with consistent effort!`
        }
      ]
    }
  };

  const tabs = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'setup', label: 'Setup & Integration', icon: Zap },
    { id: 'operations', label: 'Running Business', icon: TrendingUp },
    { id: 'growth', label: 'Growth Strategies', icon: DollarSign }
  ];

  const currentContent = helpContent[activeTab];

  const filteredSections = currentContent.sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading help...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Help & Documentation</h1>
            <p className="text-xs text-gray-400">Everything you need to succeed</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search help topics..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700 overflow-x-auto">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={`px-4 py-3 font-semibold transition whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <TabIcon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Welcome Message */}
        {searchTerm === '' && activeTab === 'getting-started' && (
          <div className="card bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/30">
            <h2 className="text-2xl font-bold text-white mb-3">Welcome to DropBoard! 🚀</h2>
            <p className="text-gray-300 mb-4">
              You're now part of an automated dropshipping platform that handles 95% of the work. 
              Here's your quick start:
            </p>
            <ol className="space-y-2 text-sm text-gray-300 ml-4 list-decimal">
              <li><strong>Connect your store</strong> (Shopify, etc.) in Integrations</li>
              <li><strong>Add suppliers</strong> (Printful, Spocket, etc.)</li>
              <li><strong>List products</strong> that are trending</li>
              <li><strong>Drive traffic</strong> from TikTok, Facebook, Google</li>
              <li><strong>Monitor dashboard</strong> - we handle everything else!</li>
            </ol>
          </div>
        )}

        {/* FAQ Sections */}
        <div className="space-y-4">
          {filteredSections.length > 0 ? (
            filteredSections.map((section) => (
              <div key={section.id} className="card">
                <button
                  onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                  {expandedId === section.id ? (
                    <ChevronUp size={20} className="text-accent flex-shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedId === section.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-300 whitespace-pre-line">{section.content}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No results found for "{searchTerm}"</p>
            </div>
          )}
        </div>

        {/* Support Card */}
        <div className="card bg-green-500/5 border border-green-500/30">
          <h3 className="text-lg font-bold text-green-400 mb-3">Need Live Help?</h3>
          <p className="text-gray-400 mb-4">
            Our support team is available 24/7 to help you get set up and answer questions.
          </p>
          <div className="space-y-2 text-sm text-gray-300">
            <p>📧 <strong>Email:</strong> support@dropboard.io</p>
            <p>💬 <strong>Live Chat:</strong> Available in dashboard (bottom right)</p>
            <p>📞 <strong>Phone:</strong> +1 (555) 123-4567</p>
            <p>⏰ <strong>Response:</strong> Usually within 1 hour</p>
          </div>
        </div>

        {/* Resources */}
        {searchTerm === '' && (
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Additional Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a href="#" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">📚</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Complete Setup Guide</h4>
                <p className="text-sm text-gray-400 mt-2">Step-by-step guide to launch your first store</p>
              </a>
              <a href="#" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">🎥</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Video Tutorials</h4>
                <p className="text-sm text-gray-400 mt-2">Watch how to set up integrations and automations</p>
              </a>
              <a href="#" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">⭐</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Success Stories</h4>
                <p className="text-sm text-gray-400 mt-2">Learn from sellers making $5K-$50K/month</p>
              </a>
              <a href="#" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">👥</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Community Forum</h4>
                <p className="text-sm text-gray-400 mt-2">Connect with other sellers and get tips</p>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

