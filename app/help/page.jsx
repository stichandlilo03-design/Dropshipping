'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, ExternalLink, ArrowLeft, BookOpen, Zap, TrendingUp, DollarSign, Mail, Share2, Zap as ZapIcon } from 'lucide-react';
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
          content: 'DropBoard is an all-in-one dropshipping automation platform. We automate 95% of the work - order processing, fulfillment, payments, customer notifications, social media publishing - so you can focus on marketing and growing your business.'
        },
        {
          id: 'gs2',
          title: 'How does DropBoard work?',
          content: `1. You add products to your store
2. Customer places order
3. Order automatically syncs to supplier (Printful, Shopify, etc.)
4. Supplier prints and ships
5. Tracking updates automatically (every 6 hours)
6. Customer gets email notifications
7. Social media updates automatically
8. You profit the difference!`
        },
        {
          id: 'gs3',
          title: 'Do I need to be technical?',
          content: 'No! DropBoard is designed for complete beginners. All integrations have step-by-step guides with direct links to all APIs. Most users are set up in 2-3 hours. We have 24/7 support to help you!'
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
        },
        {
          id: 'gs6',
          title: '🆕 What\'s New in Latest Update?',
          content: `NEW FEATURES IN v1.1:
✨ Email Automation - Auto-send order confirmations, shipping updates, delivery confirmations
✨ Social Media Publishing - One-click publish to TikTok, Instagram, Facebook, Pinterest
✨ Shipping Auto-Sync - Automatic tracking updates every 6 hours via Cron Jobs
✨ AI Captions - Auto-generate product descriptions and hashtags
✨ Enhanced Dashboard - Real-time automation metrics and status
✨ 12+ API Integrations - Printful, Shopify, Stripe, SendGrid, Gmail, and more!`
        }
      ]
    },
    'setup': {
      title: 'Setup & Integration',
      icon: Zap,
      sections: [
        {
          id: 'setup0',
          title: '🆕 Complete API Setup Guide',
          content: `START HERE! Follow these steps in order:

PHASE 1: REQUIRED (30 minutes)
1. Firebase: https://console.firebase.google.com
   - Create project, enable Firestore & Auth
   - Get 6 credentials

2. Stripe: https://dashboard.stripe.com/register
   - Sign up, get API keys
   - 2 credentials

3. Printful: https://www.printful.com/signup
   - Sign up, get API key
   - 1 credential

4. Email (Choose ONE):
   - SendGrid: https://sendgrid.com/free (1 key)
   - OR Gmail SMTP: https://myaccount.google.com/apppasswords (3 credentials)

PHASE 2: OPTIONAL (1 hour)
5. Shopify: https://www.shopify.com/partners (for trending products)
6. TikTok: https://developers.tiktok.com (for social posting)
7. Instagram: https://business.facebook.com (for social)
8. Facebook: https://business.facebook.com (for social)
9. Pinterest: https://developers.pinterest.com (for social)

See "API Links & Instructions" section for detailed steps!`
        },
        {
          id: 'setup1',
          title: 'How to connect Firebase (Database)',
          content: `STEP 1: Go to Firebase Console
Link: https://console.firebase.google.com/

STEP 2: Create Project
1. Click "Add project"
2. Name: dropboard
3. Click "Create project"

STEP 3: Enable Firestore
1. Left menu → Firestore Database
2. Click "Create database"
3. Select "Production mode"
4. Region: us-central1
5. Click "Create"

STEP 4: Enable Authentication
1. Left menu → Authentication
2. Click "Get started"
3. Enable "Email/Password"
4. Click "Save"

STEP 5: Get Your Credentials
1. Click ⚙️ Settings → Project settings
2. Scroll to "Your apps" section
3. Copy these 6 values:
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID

4. Add to Vercel Environment Variables

Done! Database is connected!`
        },
        {
          id: 'setup2',
          title: 'How to connect Stripe (Payments)',
          content: `STEP 1: Create Stripe Account
Link: https://dashboard.stripe.com/register
1. Email, password
2. Business name
3. Click "Create account"

STEP 2: Get API Keys
Link: https://dashboard.stripe.com/apikeys
1. Click "Reveal live key" (or use test mode)
2. Copy "Secret Key" → STRIPE_SECRET_KEY
3. Copy "Publishable Key" → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

STEP 3: Add to Vercel
1. Go to Vercel project settings
2. Add both keys to environment variables
3. Deploy!

TEST CARD (for testing):
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits

Takes 5 minutes! Now accept payments!`
        },
        {
          id: 'setup3',
          title: 'How to connect Printful (Fulfillment) 🆕',
          content: `STEP 1: Create Printful Account
Link: https://www.printful.com/signup
1. Email, password
2. Business type
3. Click "Create account"

STEP 2: Get API Key
Link: https://www.printful.com/dashboard/settings/api
1. Dashboard → Account → Settings → API
2. Click "Show API key"
3. Copy the full key

STEP 3: Add to Vercel
1. Vercel project → Environment Variables
2. Add PRINTFUL_API_KEY
3. Deploy!

NOW AUTOMATIC:
✓ Orders auto-sync to Printful
✓ Shipping labels auto-generated
✓ Tracking updates every 6 hours
✓ Customers notified automatically

Takes 5 minutes! Auto-fulfillment enabled!`
        },
        {
          id: 'setup4',
          title: 'How to set up Email Automation 🆕',
          content: `CHOOSE ONE OR BOTH:

OPTION A: SendGrid (Recommended - faster)
Link: https://sendgrid.com/free

1. Sign up with email
2. Go to Settings → API Keys
3. Create API Key
4. Copy key → SENDGRID_API_KEY
5. Add to Vercel
6. Deploy!

OPTION B: Gmail SMTP (Free fallback)
Link: https://myaccount.google.com/apppasswords

1. Enable 2-Factor Authentication on Gmail
2. Go to App Passwords
3. Select: Mail + Windows Computer
4. Click "Generate"
5. Copy 16-character password
6. Add to Vercel:
   - GMAIL_USER=your-email@gmail.com
   - GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
   - GMAIL_REPLY_TO=support@yoursite.com
7. Deploy!

NOW AUTOMATIC:
✓ Order confirmations sent
✓ Shipping tracking sent
✓ Delivery confirmations sent
✓ Falls back to Gmail if SendGrid down

Takes 2-5 minutes! Email automation ready!`
        },
        {
          id: 'setup5',
          title: '🆕 How to set up Social Media Publishing',
          content: `PUBLISH PRODUCTS TO 4 PLATFORMS IN 1 CLICK!

TIKTOK SHOP (10 min)
Link: https://developers.tiktok.com
1. Sign up for developer account
2. Create new app
3. Get: TIKTOK_ACCESS_TOKEN, TIKTOK_CLIENT_KEY
4. Add to Vercel
5. In Products Hub → Click "Publish" → Select TikTok
6. Auto-posts with AI caption!

INSTAGRAM (10 min)
Link: https://business.facebook.com
1. Convert Instagram to business account
2. Create Meta app
3. Get: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID
4. Add to Vercel
5. Products Hub → Publish → Select Instagram
6. Posts automatically!

FACEBOOK (10 min)
Link: https://business.facebook.com
1. Create business page
2. Get: FACEBOOK_ACCESS_TOKEN, FACEBOOK_PAGE_ID
3. Add to Vercel
4. Products Hub → Publish → Select Facebook
5. Drive traffic!

PINTEREST (10 min)
Link: https://developers.pinterest.com
1. Create developer app
2. Get: PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID
3. Add to Vercel
4. Products Hub → Publish → Select Pinterest
5. Generate high-quality traffic!

NEW DASHBOARD FEATURES:
✓ See how many times each product posted
✓ Track social media reach
✓ AI generates platform-specific captions
✓ Auto-hashtags for each platform
✓ One-click multi-platform publishing

Takes 30 minutes! Social automation enabled!`
        },
        {
          id: 'setup6',
          title: 'How to connect Shopify (Products)',
          content: `STEP 1: Create Shopify Partners Account
Link: https://www.shopify.com/partners
1. Sign up (free)
2. Create development store

STEP 2: Create App
1. Go to "Develop apps"
2. Name: DropBoard
3. Go to Configuration
4. Enable scopes:
   - read_products
   - write_products
   - read_orders
   - write_orders

STEP 3: Get Credentials
1. Install app
2. Go to API credentials
3. Copy Access Token
4. Note Store URL: your-store.myshopify.com

STEP 4: Add to Vercel
1. SHOPIFY_STORE_URL=your-store.myshopify.com
2. SHOPIFY_ACCESS_TOKEN=your_token
3. Deploy!

NOW:
✓ Products auto-import from Shopify
✓ Trending products auto-sync
✓ Inventory updates auto-sync
✓ Orders appear in DropBoard dashboard

Takes 10 minutes! Product sync enabled!`
        },
        {
          id: 'setup7',
          title: '🆕 Cron Jobs (Automation Scheduler)',
          content: `WHAT ARE CRON JOBS?
Automated tasks that run on a schedule without you!

WHAT WE AUTOMATE:
✓ Shipping updates (every 6 hours)
  - Check Printful for tracking
  - Update Firebase
  - Send email to customer
  
✓ Delivery checks (daily)
  - Check if order delivered
  - Update status
  - Send confirmation email

HOW TO SETUP:
If using Vercel (AUTOMATIC):
1. We already configured it!
2. Just add: CRON_SECRET=your-secret-key
3. Deploy!
4. Cron jobs run automatically

If using external service:
Link: https://www.easycron.com
1. Create account (free)
2. Create new cron:
   - URL: https://yoursite.com/api/cron/shipping-update?secret=YOUR_SECRET
   - Schedule: Every 6 hours
   - Save
3. Create another for delivery check (daily)

WHAT HAPPENS AUTOMATICALLY:
Every 6 hours:
- Check all shipped orders
- Get tracking from Printful
- Update Firebase
- Email customer with tracking

Every day:
- Check for delivered orders
- Send delivery confirmation
- Update order status

NO MANUAL WORK NEEDED!`
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
          content: `Option 1 (Easiest): Products sync automatically from Shopify
Option 2 (Manual): Go to Products → Add Product → Fill in details

FOR EACH PRODUCT SET:
- Name
- SKU (unique code)
- Price (what customers pay)
- Cost (what you pay supplier)
- Inventory (how many)
- Category
- Image

NEW FEATURES:
✨ DropBoard auto-calculates profit margin
✨ See sales, views, ratings per product
✨ One-click publish to social media
✨ Track social media posts on dashboard`
        },
        {
          id: 'ops2',
          title: '🆕 Social Media Publishing',
          content: `HOW TO PUBLISH:
1. Go to Products Hub
2. Find product
3. Click "Publish" button (purple)
4. Select platforms (TikTok, Instagram, Facebook, Pinterest)
5. Click "Publish (4)" to post all at once
6. Wait 1 minute - posts appear!

WHAT HAPPENS AUTOMATICALLY:
✓ AI generates platform-specific captions
✓ Auto-adds trending hashtags
✓ Optimizes image size for each platform
✓ Posts to all selected platforms
✓ Tracks posts in dashboard

VIEW YOUR POSTS:
- Products Hub → Each product shows post count
- Admin Dashboard → See total social posts
- Click product → View all social posts
- Analytics show reach & engagement

BEST PRACTICES:
• Publish products during peak hours (6pm-10pm)
• Post 2-3 times per week
• Use trending sounds on TikTok
• Tag relevant hashtags on Instagram
• Post to Pinterest for evergreen traffic`
        },
        {
          id: 'ops3',
          title: '🆕 Automated Email Notifications',
          content: `WHAT CUSTOMERS RECEIVE AUTOMATICALLY:

EMAIL 1: ORDER CONFIRMATION
When: Immediately after purchase
Contains: Order summary, total price, tracking

EMAIL 2: SHIPPING NOTIFICATION
When: When order ships (automatically detected)
Contains: Tracking number, carrier, estimated delivery

EMAIL 3: DELIVERY CONFIRMATION
When: When Printful confirms delivery
Contains: Delivery date, thank you message

HOW IT WORKS:
1. Customer buys product
2. Stripe processes payment
3. Order automatically syncs to Printful
4. Email 1 sent to customer
5. Printful ships order
6. Cron job detects shipment
7. Email 2 sent automatically
8. Package delivered
9. Cron job detects delivery
10. Email 3 sent automatically

NO ACTION NEEDED! All automated!

CUSTOMIZE EMAILS:
Go to Integrations → Email
Edit templates for:
- Order confirmation
- Shipping notification
- Delivery confirmation

EMAIL SENDING:
- Primary: SendGrid (fast, reliable)
- Fallback: Gmail SMTP (if SendGrid down)
- Guaranteed delivery!`
        },
        {
          id: 'ops4',
          title: '🆕 Real-Time Automation Dashboard',
          content: `NEW DASHBOARD SHOWS:

AUTOMATION STATUS:
📧 Emails Sent - How many confirmations/tracking emails
🚚 Orders Shipped - How many orders being tracked
📱 Social Posts - How many products published
📦 Printful Synced - How many orders auto-synced

AUTOMATION FEATURES:
✓ Email Automation (Gmail SMTP or SendGrid)
✓ Auto-Shipping (Printful + Cron Jobs)
✓ Social Publishing (TikTok, Instagram, Facebook, Pinterest)
✓ Printful Auto-Sync (orders auto-sync)

Each shows:
- Status (Active or Locked)
- Required integrations
- Quick setup links

WHAT'S AUTOMATED TODAY:
✓ Order processing (Stripe)
✓ Payment collection (Stripe)
✓ Supplier fulfillment (Printful)
✓ Shipping tracking (Cron)
✓ Email notifications (SendGrid/Gmail)
✓ Social publishing (4 platforms)
✓ Inventory updates (Shopify)

YOU JUST:
• Market (drive traffic)
• Pick products (find winners)
• Monitor (check dashboard)

WE HANDLE: Everything else!`
        },
        {
          id: 'ops5',
          title: 'How is profit calculated?',
          content: `Profit = Revenue - Product Cost - Shipping - Payment Fees - Commission

Example:
Customer pays: $50
Product cost: $12
Shipping: $5
Payment fee (Stripe 2.9%): $1.45
DropBoard commission: $1.50
YOUR PROFIT: $30.05

We show this for every order so you know exactly how much you make!

EACH PRODUCT SHOWS:
- Sales (how many sold)
- Revenue (total earned)
- Profit (after costs)
- Profit margin (percentage)
- Profit per sale`
        },
        {
          id: 'ops6',
          title: 'What if a customer complains?',
          content: `Customers will email your store address. DropBoard provides templates for:
- Shipping delays
- Product quality issues
- Missing items
- Refund requests

We recommend responding within 24 hours. Printful handles most complaints about production/shipping quality.

Printful handles:
✓ Print quality issues
✓ Shipping delays
✓ Lost packages
✓ Damaged products

You handle:
• Responding to customer
• Arranging reprint/refund
• Keeping customer happy`
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

ADVANCED: Use DropBoard Social Publishing
- Post to TikTok, Instagram, Facebook, Pinterest
- One-click multi-platform posting
- AI-generated captions
- Automatic hashtags

Most new sellers get their first 10 sales in 1-2 weeks!`
        },
        {
          id: 'growth2',
          title: '🆕 How to use Social Publishing for Growth',
          content: `VIRAL POSTING STRATEGY:

TIKTOK (BEST FOR BEGINNERS)
1. Create trending product video
2. Use trending sounds & effects
3. Click "Publish" in Products Hub
4. Optimized caption auto-generated
5. Posts immediately
6. Hashtags auto-added
7. Watch views roll in!

Viral potential: Very high
Time to create: 30 seconds
Effort: Minimal (1 click)
ROI: 10-50x possible

INSTAGRAM REELS
1. Create product carousel video
2. Show product in action
3. Click "Publish" → Select Instagram
4. Professional caption auto-generated
5. Hashtags optimized for Instagram
6. Longer-lasting content

Viral potential: Medium
Time to create: 2 minutes
Effort: Low (1 click)
ROI: 5-20x

FACEBOOK
1. Create product showcase
2. Tell story of product
3. Click "Publish" → Facebook
4. Community engagement
5. Drive traffic to store

Viral potential: High
Time to create: 2 minutes
Effort: Low (1 click)
ROI: 3-10x

PINTEREST (PASSIVE INCOME)
1. Create product pin
2. Link to product page
3. Click "Publish" → Pinterest
4. Evergreen traffic for MONTHS
5. No audience needed

Viral potential: Medium (but long-term)
Time to create: 5 minutes
Effort: Very low (1 click)
ROI: 5-30x (over time)

POSTING ROUTINE:
Daily:
- Post 1-2 trending videos to TikTok
- Check DropBoard for engagement

Weekly:
- Post 3-4 Instagram Reels
- Post 2-3 Facebook posts
- Pin 2-3 items to Pinterest

Monthly:
- Review top-performing posts
- Scale successful products
- Kill underperforming items

AUTOMATED FEATURES:
✓ AI captions (save 5 min per post)
✓ Auto-hashtags (save 2 min per post)
✓ One-click publishing (save 3 min per post)
✓ Multi-platform posting (do 4 at once!)

RESULT: Post 10 products, make 50+ posts, reach 1M+ people = $5K-$20K sales possible!`
        },
        {
          id: 'growth3',
          title: 'Best free traffic sources',
          content: `1. TikTok (BEST FOR BEGINNERS)
- Post trend-jacking videos
- 0 cost, high viral potential
- Use trending sounds & effects
- Use "Publish" feature in DropBoard

2. YouTube Shorts
- Similar to TikTok
- Easier monetization long-term
- Smaller audience but loyal

3. Pinterest
- Great for fashion & home goods
- Passive traffic (evergreen)
- Use "Publish" feature for easy posting
- One post = traffic for months

4. Instagram Reels
- Good for niche communities
- Hashtag strategy important
- Use "Publish" feature with auto-hashtags

5. Reddit
- Niche communities
- Be helpful, not salesy

6. Email List (Build it!)
- Ask customers to subscribe
- Send product updates
- Free, high-converting traffic`
        },
        {
          id: 'growth4',
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

USING DROPBOARD TO IMPROVE:
✓ Social publishing increases trust (more reach)
✓ Email notifications increase confidence
✓ Automated tracking improves satisfaction
✓ Professional fulfillment = happy customers

Even 0.5% conversion at high traffic = $5K+/month!`
        },
        {
          id: 'growth5',
          title: 'How to find trending products',
          content: `1. Google Trends
- Search your niche
- See what's trending up
- Great seasonal products
Link: https://trends.google.com

2. TikTok Trends
- Watch #FYP for viral products
- Look for \"link in bio\" videos
- Note the product + hashtags

3. Shopify Exchanges
- See what stores are selling
- Copy their product selection

4. Ali Baba
- New product categories
- Check supplier prices
- Future trends
Link: https://www.alibaba.com

5. DropBoard Dashboard
- We show trending products
- Sorted by search volume
- Data from your niche

Pro tip: Don't pick products YOU like. Pick products with DEMAND!`
        },
        {
          id: 'growth6',
          title: 'How to scale from $1K to $10K/month',
          content: `Phase 1 ($0-$1K): Launch 
- Pick 1 trending product
- Get first 100 sales
- Use social publishing (DropBoard)
- Prove the model works
Time: 1-2 months

Phase 2 ($1K-$5K): Scale
- Double your ad spend when profitable
- Add complementary products (2-3 more)
- Post to all 4 social platforms daily
- Build email list
Time: 2-3 months

Phase 3 ($5K-$10K): Expand
- Test new traffic sources
- Launch influencer partnerships
- Expand to TikTok Shop & Facebook
- Build repeat customer base
- Use automation (DropBoard handles ops)
Time: 2-3 months

Total: 4-6 months to $10K/month with consistent effort!

DROPBOARD HELPS BY:
✓ Eliminating 95% of manual work
✓ Automating email notifications
✓ Automating social posting
✓ Automating fulfillment
✓ Real-time analytics
✓ Integration with all platforms`
        }
      ]
    },
    'api-links': {
      title: 'API Links & Direct Instructions',
      icon: ZapIcon,
      sections: [
        {
          id: 'api1',
          title: '📋 All API Links (Quick Reference)',
          content: `REQUIRED APIS:
1. Firebase: https://console.firebase.google.com
2. Stripe: https://dashboard.stripe.com/register
3. Printful: https://www.printful.com/signup

EMAIL (Choose ONE):
4. SendGrid: https://sendgrid.com/free
5. Gmail App Passwords: https://myaccount.google.com/apppasswords

SOCIAL MEDIA (Optional):
6. TikTok Developers: https://developers.tiktok.com
7. Facebook Business: https://business.facebook.com
8. Instagram Business: https://business.facebook.com
9. Pinterest Developers: https://developers.pinterest.com

PRODUCT IMPORT (Optional):
10. Shopify Partners: https://www.shopify.com/partners

CRON JOBS (Vercel):
11. Vercel Dashboard: https://vercel.com/dashboard

PAYMENT TEST:
- Test Card: 4242 4242 4242 4242
- Any future expiry date
- Any 3-digit CVC

TIME ESTIMATE:
- Phase 1 (Required): 30 minutes
- Phase 2 (Optional): 1 hour
- Total: 2-3 hours to full setup`
        },
        {
          id: 'api2',
          title: '🎯 Setup Order (Recommended)',
          content: `FOLLOW THIS ORDER:

HOUR 1:
1. Firebase Setup (10 min)
   Link: https://console.firebase.google.com
   Get 6 credentials

2. Stripe Setup (5 min)
   Link: https://dashboard.stripe.com/register
   Get 2 credentials

3. Printful Setup (5 min)
   Link: https://www.printful.com/signup
   Get 1 credential

4. Email Setup (10 min)
   Choose: SendGrid OR Gmail SMTP
   Get 1-3 credentials

HOUR 2 (Optional):
5. Shopify Setup (15 min)
   Link: https://www.shopify.com/partners
   Get 2 credentials

6. Social Media Setup (45 min)
   - TikTok: 10 min
   - Instagram: 10 min
   - Facebook: 10 min
   - Pinterest: 10 min

AFTER SETUP:
1. Create .env.local file
2. Add all credentials
3. Add to Vercel environment variables
4. Deploy!
5. App goes LIVE! 🚀`
        },
        {
          id: 'api3',
          title: '📧 Detailed Email Setup Guide',
          content: `OPTION A: SENDGRID (RECOMMENDED)

Link: https://sendgrid.com/free

STEP 1: Create Account
1. Go to https://sendgrid.com/free
2. Enter email, password
3. Click "Get Started Free"
4. Verify email

STEP 2: Get API Key
1. Log in to SendGrid
2. Go to Settings → API Keys (left menu)
3. Click "Create API Key"
4. Name: DropBoard
5. Give "Full Access"
6. Click "Create & View"
7. COPY the key (save somewhere safe!)

STEP 3: Add to Vercel
1. Go to Vercel project dashboard
2. Settings → Environment Variables
3. Add new variable:
   Name: SENDGRID_API_KEY
   Value: (paste your key here)
4. Select: Production, Preview, Development
5. Click "Add"
6. Redeploy project

VERIFICATION:
After deploy, go to dashboard and click "Settings" - you should see SendGrid connected!

---

OPTION B: GMAIL SMTP (FREE FALLBACK)

Link: https://myaccount.google.com/apppasswords

STEP 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Find "2-Step Verification"
3. Click "Enable"
4. Follow setup (use your phone)
5. Done!

STEP 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select dropdown: Mail
3. Select dropdown: Windows Computer (or your device)
4. Click "Generate"
5. COPY the 16-character password
6. Remove spaces: xxxxxxxxxxxxxxxx

STEP 3: Add to Vercel
1. Go to Vercel project dashboard
2. Settings → Environment Variables
3. Add 3 variables:

   Name: GMAIL_USER
   Value: your-email@gmail.com
   
   Name: GMAIL_APP_PASSWORD
   Value: xxxxxxxxxxxxxxxx (the 16 chars, no spaces)
   
   Name: GMAIL_REPLY_TO
   Value: support@yoursite.com

4. Select all environments
5. Click "Add" for each
6. Redeploy project

VERIFICATION:
Check DropBoard settings - should show Gmail SMTP connected!

---

BOTH OPTIONS WORK TOGETHER:
- SendGrid = Primary (tries first)
- Gmail = Fallback (if SendGrid down)
- Guaranteed email delivery!`
        },
        {
          id: 'api4',
          title: '📱 Detailed Social Media Setup',
          content: `TIKTOK SHOP

Link: https://developers.tiktok.com

STEP 1: Developer Account
1. Go to https://developers.tiktok.com
2. Sign up or log in
3. Verify email

STEP 2: Create App
1. Go to "My apps"
2. Click "Create application"
3. Name: DropBoard
4. Select: TikTok Shop
5. Fill in details
6. Click "Create"

STEP 3: Get Credentials
1. Go to "Settings" tab
2. Copy: Client Key, Client Secret
3. Go to "Authorization"
4. Authorize your app
5. Copy: Access Token

STEP 4: Add to Vercel
Vercel → Environment Variables → Add:
- TIKTOK_ACCESS_TOKEN
- TIKTOK_CLIENT_KEY
- TIKTOK_CLIENT_SECRET

STEP 5: Use It!
Products Hub → Click "Publish" → Select TikTok → Post!

---

INSTAGRAM BUSINESS

Link: https://business.facebook.com

STEP 1: Setup Instagram
1. Convert to business account in app
2. Settings → Account type → Business

STEP 2: Create Meta App
1. Go to https://business.facebook.com
2. Go to "Apps"
3. Click "Create App"
4. Fill in details
5. App Type: Business
6. Click "Create"

STEP 3: Get Credentials
1. Add Instagram Graph API product
2. Go to Settings → Instagram Accounts
3. Select your account
4. Click "Generate Token"
5. Also copy: Account ID (in settings)

STEP 4: Add to Vercel
- INSTAGRAM_ACCESS_TOKEN
- INSTAGRAM_ACCOUNT_ID

STEP 5: Use It!
Products Hub → Click "Publish" → Select Instagram → Post!

---

FACEBOOK PAGE

Link: https://business.facebook.com

STEP 1: Create Page
1. Go to https://www.facebook.com/pages/create
2. Business name
3. Category
4. Create

STEP 2: Get Credentials
1. Go to https://business.facebook.com
2. Settings → Pages
3. Select your page
4. Click "Generate Token"
5. Also get: Page ID

STEP 3: Add to Vercel
- FACEBOOK_ACCESS_TOKEN
- FACEBOOK_PAGE_ID

STEP 4: Use It!
Products Hub → Click "Publish" → Select Facebook → Post!

---

PINTEREST

Link: https://developers.pinterest.com

STEP 1: Developer App
1. Go to https://developers.pinterest.com
2. Console → Create App
3. Fill details
4. Click "Create"

STEP 2: Get Credentials
1. API tokens
2. Click "Generate token"
3. Copy: Access Token
4. Go to your board, get: Board ID

STEP 3: Add to Vercel
- PINTEREST_ACCESS_TOKEN
- PINTEREST_BOARD_ID

STEP 4: Use It!
Products Hub → Click "Publish" → Select Pinterest → Post!`
        }
      ]
    }
  };

  const tabs = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'setup', label: 'Setup & Integration', icon: Zap },
    { id: 'operations', label: 'Running Business', icon: TrendingUp },
    { id: 'growth', label: 'Growth Strategies', icon: DollarSign },
    { id: 'api-links', label: 'API Links', icon: ZapIcon }
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
            <h1 className="text-2xl font-bold text-white">Help & Documentation 🚀</h1>
            <p className="text-xs text-gray-400">Complete guides for all APIs and new automation features!</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search help topics (APIs, automation, social media, etc.)..."
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
            <h2 className="text-2xl font-bold text-white mb-3">Welcome to DropBoard v1.1! 🚀</h2>
            <p className="text-gray-300 mb-4">
              You're now part of a fully automated dropshipping platform with 95% automation, 12+ API integrations, and 4-platform social publishing!
            </p>
            <ol className="space-y-2 text-sm text-gray-300 ml-4 list-decimal">
              <li><strong>Setup APIs</strong> (Firebase, Stripe, Printful) using links in "API Links" tab</li>
              <li><strong>Add Email Automation</strong> (SendGrid or Gmail SMTP)</li>
              <li><strong>Connect Social Media</strong> (TikTok, Instagram, Facebook, Pinterest)</li>
              <li><strong>List products</strong> - DropBoard handles everything else!</li>
              <li><strong>Monitor dashboard</strong> - See automation metrics in real-time!</li>
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
            Our support team is available 24/7 to help you get set up, connect APIs, and answer questions about the new automation features.
          </p>
          <div className="space-y-2 text-sm text-gray-300">
            <p>📧 <strong>Email:</strong> support@dropboard.io</p>
            <p>💬 <strong>Live Chat:</strong> Available in dashboard (bottom right)</p>
            <p>📞 <strong>Phone:</strong> +1 (555) 123-4567</p>
            <p>⏰ <strong>Response:</strong> Usually within 1 hour</p>
            <p>📚 <strong>Full Setup Guide:</strong> Check "API Links" tab for all direct links</p>
          </div>
        </div>

        {/* Resources */}
        {searchTerm === '' && (
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Additional Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a href="/trending" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">🔥</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Trending Products</h4>
                <p className="text-sm text-gray-400 mt-2">Discover hot products to add to your store</p>
              </a>
              <a href="/integrations" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">⚡</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Integrations Hub</h4>
                <p className="text-sm text-gray-400 mt-2">Connect all 12+ APIs in one place</p>
              </a>
              <Link href="/products" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">📦</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Products Hub</h4>
                <p className="text-sm text-gray-400 mt-2">Manage products and publish to social media</p>
              </Link>
              <a href="/admin/dashboard" className="card group hover:border-accent transition">
                <p className="text-3xl mb-2">📊</p>
                <h4 className="text-lg font-bold text-white group-hover:text-accent">Admin Dashboard</h4>
                <p className="text-sm text-gray-400 mt-2">View automation metrics and real-time stats</p>
              </a>
            </div>
          </div>
        )}

        {/* NEW Feature Highlight */}
        <div className="card bg-blue-500/5 border border-blue-500/30">
          <h3 className="text-lg font-bold text-blue-400 mb-3">✨ What's New in v1.1?</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>✅ <strong>Email Automation</strong> - Auto-send order, shipping, & delivery emails</p>
            <p>✅ <strong>Social Media Publishing</strong> - One-click publish to 4 platforms</p>
            <p>✅ <strong>Shipping Auto-Sync</strong> - Automatic updates every 6 hours</p>
            <p>✅ <strong>AI Captions</strong> - Auto-generate social media captions</p>
            <p>✅ <strong>Auto-Hashtags</strong> - Platform-specific hashtags auto-added</p>
            <p>✅ <strong>Enhanced Dashboard</strong> - Real-time automation metrics</p>
            <p>✅ <strong>12+ API Integrations</strong> - All in one place</p>
            <p>⏱️ <strong>Cron Jobs</strong> - Automated scheduling (every 6 hours & daily)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
