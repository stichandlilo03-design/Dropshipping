# 🚀 DropBoard - 100% Automated Dropshipping Platform

**The Ultimate All-in-One Dropshipping Solution with Complete Automation**

## 📌 Overview

DropBoard is a **fully automated dropshipping platform** built with Next.js, Firebase, and comprehensive integrations. It handles everything from trending product discovery to order fulfillment, email notifications, and social media publishing - all automatically.

### ⭐ Key Features

#### 🛍️ **Complete E-Commerce Platform**
- ✅ Product management & inventory tracking
- ✅ Trending product discovery & auto-import
- ✅ Shopping cart with persistent storage (localStorage + Firestore)
- ✅ Secure checkout with Stripe payment processing
- ✅ Customer accounts & order history
- ✅ Wishlist functionality with cloud sync
- ✅ Product search, filtering & sorting
- ✅ Responsive mobile-first design

#### 📦 **Automated Fulfillment**
- ✅ **Printful Integration** - Auto-sync orders to print-on-demand
- ✅ **Auto-Generate Shipping Labels** - Labels created automatically
- ✅ **Track Shipments** - Real-time tracking updates
- ✅ **Cron Jobs** - Automatic updates every 6 hours
- ✅ **Shopify Sync** - Import products directly

#### 📧 **Email Automation**
- ✅ **Dual-Method System** - SendGrid + Gmail SMTP fallback
- ✅ **Order Confirmations** - Auto-sent on purchase
- ✅ **Shipping Notifications** - Tracking sent automatically
- ✅ **Delivery Confirmations** - Auto-sent when delivered
- ✅ **Zero Email Delays** - Fallback system ensures delivery

#### 📱 **Social Media Publishing**
- ✅ **TikTok Shop** - One-click product publishing
- ✅ **Instagram Business** - Professional product posts
- ✅ **Facebook Page** - Community engagement
- ✅ **Pinterest** - High-quality traffic generation
- ✅ **AI Captions** - Auto-generated descriptions
- ✅ **Auto Hashtags** - Platform-specific tags
- ✅ **Bulk Publishing** - Multiple platforms at once

#### 💳 **Payment & Analytics**
- ✅ **Stripe Payments** - Secure payment processing
- ✅ **Transaction Tracking** - All financial data
- ✅ **Revenue Dashboard** - Real-time profit tracking
- ✅ **Analytics Charts** - Weekly revenue overview
- ✅ **Customer Insights** - Spending patterns & loyalty

#### ⚙️ **Admin Control Panel**
- ✅ **100% Automation Status** - Real-time metrics
- ✅ **Integration Management** - 12+ APIs in one place
- ✅ **Order Management** - Update status & track
- ✅ **Product Management** - Full CRUD operations
- ✅ **Customer Management** - View spending & history
- ✅ **Trending Products** - Discover hot items
- ✅ **Data Export** - Backup all information
- ✅ **Live Charts** - Revenue & order analytics

#### 🔒 **Security & Authentication**
- ✅ **Firebase Auth** - Secure authentication
- ✅ **Role-Based Access** - Admin/Customer separation
- ✅ **Firestore Security Rules** - Data protection
- ✅ **Encrypted Credentials** - API keys secured
- ✅ **Logout Race Condition Fixed** - Clean auth state
- ✅ **Cross-Contamination Prevention** - Role integrity

---

## 🛠️ **Tech Stack**

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **State:** React Hooks

### Backend
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Email:** SendGrid API + Gmail SMTP
- **Payments:** Stripe API
- **File Storage:** Base64 images

### Integrations (12+ APIs)
- Printful (Print-on-Demand)
- Shopify (Store Data)
- Stripe (Payments)
- Zapier (Automation)
- Gmail SMTP (Email)
- SendGrid (Email)
- TikTok Shop (Social)
- Instagram Business (Social)
- Facebook Pages (Social)
- Pinterest (Social)
- Cron Jobs (Automation)

---

## 📊 **Automation Features**

### Order → Fulfillment → Tracking → Email → Social

```
1. CUSTOMER PURCHASES
   ↓
2. AUTO-SYNC TO PRINTFUL (creates order)
   ↓
3. AUTO-GENERATE SHIPPING LABEL
   ↓
4. AUTO-UPDATE TRACKING (every 6 hours via Cron)
   ↓
5. AUTO-SEND TRACKING EMAIL (Gmail or SendGrid)
   ↓
6. AUTO-CONFIRM DELIVERY (daily check via Cron)
   ↓
7. AUTO-SEND CONFIRMATION EMAIL
   ↓
8. ADMIN CAN 1-CLICK PUBLISH TO SOCIAL MEDIA
   ↓
9. AUTO-GENERATE CAPTIONS & HASHTAGS
   ↓
10. AUTO-POST TO TikTok, Instagram, Facebook, Pinterest
```

---

## 📈 **Stats & Metrics**

### Real-Time Dashboard Shows:
- 💰 **Total Revenue** (from paid orders)
- 📈 **Total Profit** (revenue - cost)
- 💳 **Total Cost** (COGS)
- 📊 **Profit Margin %** (ROI)
- 📦 **Total Products** (inventory count)
- 👥 **Total Customers** (registered users)
- 🟢 **Active Customers** (with orders)
- 📧 **Emails Sent** (auto-confirmations)
- 🚚 **Orders Shipped** (tracked)
- 📱 **Social Posts** (published)
- 📦 **Printful Synced** (fulfillment count)

---

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account
- Stripe account
- At least one integration (Printful or Shopify)

### Installation

```bash
# Clone repository
git clone <your-repo>
cd dropboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev

# Open browser
# Customer: http://localhost:3000
# Admin: http://localhost:3000/admin/dashboard
```

---

## 🔐 **Environment Variables**

Create `.env.local` with:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Printful (Optional - for auto-fulfillment)
PRINTFUL_API_KEY=your_printful_api_key

# Shopify (Optional - for product sync)
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_token

# Email (Choose SendGrid OR Gmail, or both for fallback)
SENDGRID_API_KEY=SG... (optional)
GMAIL_USER=your-email@gmail.com (optional)
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx (optional)
GMAIL_REPLY_TO=support@yoursite.com (optional)

# Social Media (Optional - for auto-publishing)
TIKTOK_ACCESS_TOKEN=...
TIKTOK_CLIENT_KEY=...
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...
FACEBOOK_ACCESS_TOKEN=...
FACEBOOK_PAGE_ID=...
PINTEREST_ACCESS_TOKEN=...
PINTEREST_BOARD_ID=...

# Zapier (Optional - for workflow automation)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...

# Cron Jobs
CRON_SECRET=your-super-secret-key-for-cron-jobs
```

---

## 📁 **Project Structure**

```
├── app/
│   ├── page.jsx                          # Landing page
│   ├── admin/
│   │   ├── dashboard/page.jsx            # Admin dashboard (🆕 enhanced)
│   │   └── login/page.jsx                # Admin login
│   ├── customer/
│   │   ├── account/page.jsx              # Customer dashboard
│   │   ├── login/page.jsx                # Customer login
│   │   └── register/page.jsx             # Customer signup
│   ├── p/[id]/
│   │   └── page.jsx                      # Product detail page
│   ├── products/page.jsx                 # Products hub (🆕 with publish)
│   ├── integrations/page.jsx             # Integration management (🆕 complete)
│   ├── orders/page.jsx                   # Orders view
│   ├── trending/page.jsx                 # Trending products
│   └── api/
│       ├── orders/create/route.js        # Create order (🆕 with automation)
│       ├── social/publish/route.js       # Publish to social (🆕 new)
│       ├── email/send-gmail/route.js     # Gmail SMTP (🆕 new)
│       ├── cron/
│       │   ├── shipping-update/route.js  # Auto shipping (🆕 new)
│       │   └── delivery-check/route.js   # Auto delivery (🆕 new)
│       └── integrations/
│           ├── printful/route.js
│           ├── stripe/route.js
│           ├── shopify/route.js
│           ├── tiktok/route.js
│           └── ...
│
├── lib/
│   ├── firebase.js                       # Firebase config
│   ├── orders.js                         # Order functions
│   ├── integrations.js                   # All API integrations (🆕 complete)
│   ├── trending.js                       # Trending products
│   ├── payment.js                        # Stripe functions
│   └── auth.js                           # Authentication
│
├── components/
│   └── [all UI components]
│
└── public/
    └── [static assets]
```

---

## 🎯 **Core Features Explained**

### 1️⃣ **Trending Products System**
- Pulls from Shopify or Printful
- Auto-discovers trending items
- One-click add to store
- Tracks source & metrics

### 2️⃣ **Shopping Cart**
- **localStorage** for quick access
- **Firestore** for cloud sync
- Works across devices
- Persists between sessions
- Clears on checkout

### 3️⃣ **Order Processing**
- Customer buys → Order created
- Stripe processes payment
- Firebase records transaction
- Printful auto-syncs
- Zapier triggered
- Confirmation email sent

### 4️⃣ **Shipping Automation**
- Cron job runs every 6 hours
- Checks Printful for updates
- Updates Firebase
- Sends tracking email
- Tracks delivery status

### 5️⃣ **Email Automation**
- **SendGrid Primary** (fast, reliable)
- **Gmail SMTP Fallback** (if SendGrid down)
- Order confirmations
- Shipping updates
- Delivery confirmations
- Zero email delays

### 6️⃣ **Social Publishing**
- Admin clicks "Publish"
- Selects platforms
- AI generates caption
- Auto-adds hashtags
- Posts to all platforms
- Tracks post metrics

---

## 📝 **User Roles**

### 👨‍💼 **Admin**
- View all orders
- Manage products
- Manage customers
- Access integrations
- Control automation
- Publish to social media
- View analytics
- Export data

### 🛒 **Customer**
- Browse products
- Add to cart
- Create wishlist
- Checkout
- View orders
- Track shipments
- Receive emails

---

## 🔄 **API Integrations**

### Current Integrations (12+)
1. **Printful** - Print-on-Demand + Fulfillment ✅
2. **Shopify** - Product import ✅
3. **Stripe** - Payment processing ✅
4. **Zapier** - Workflow automation ✅
5. **Gmail SMTP** - Email (fallback) ✅
6. **SendGrid** - Email (primary) ✅
7. **TikTok Shop** - Social publishing ✅
8. **Instagram Business** - Social publishing ✅
9. **Facebook Pages** - Social publishing ✅
10. **Pinterest** - Social publishing ✅
11. **Cron Jobs** - Automation scheduling ✅
12. **Vercel Crons** - Serverless automation ✅

---

## 📊 **Dashboard Sections**

### Admin Dashboard
- Welcome message with time of day
- Automation status overview (NEW)
- Automation features status (NEW)
- 6 key metrics cards
- Trending products section
- Orders table with search/filter
- Customers table
- All products grid
- Integration status
- Revenue charts
- Quick action buttons

### Integrations Hub
- Organized by category
- Tabs: Existing / New / All
- Status indicators
- One-click connection
- Credential management
- Documentation links
- Setup guide

### Products Hub
- Product CRUD
- Search/filter/sort
- Bulk selection
- Analytics per product
- QR code generation
- Social media publishing (NEW)
- Product links
- Edit/delete controls

---

## 🚀 **Deployment**

### Vercel (Recommended)
```bash
# Connect GitHub repo
# Vercel auto-deploys on push
# Set environment variables in Vercel dashboard
```

### Firebase Deployment
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

### Environment Setup
1. Go to Vercel dashboard
2. Add all `.env.local` variables
3. Redeploy project
4. Test all features

---

## 🐛 **Bug Fixes Included**

✅ **Authentication Issues Fixed**
- Logout race condition resolved
- Admin/Customer role detection fixed
- Firestore collection mapping corrected
- localStorage cleanup on logout

✅ **Cart Persistence Fixed**
- Dual storage system (localStorage + Firestore)
- No cart deletion on navigation
- Race condition prevention
- Cross-device sync

✅ **Order Processing Fixed**
- Email delivery guaranteed
- Printful sync verified
- Tracking updates reliable
- Customer notification system working

---

## 📚 **API Documentation**

### Order Creation
```javascript
POST /api/orders/create
{
  customerId: string,
  customerName: string,
  customerEmail: string,
  items: array,
  total: number,
  shippingAddress: object
}
```

### Social Publishing
```javascript
POST /api/social/publish
{
  productId: string,
  productName: string,
  imageUrl: string,
  platforms: ['tiktok', 'instagram', 'facebook', 'pinterest']
}
```

### Email Sending
```javascript
POST /api/email/send-gmail
{
  to: string,
  subject: string,
  html: string
}
```

### Cron Jobs
```
GET /api/cron/shipping-update?secret=CRON_SECRET
GET /api/cron/delivery-check?secret=CRON_SECRET
```

---

## 🆘 **Troubleshooting**

### Emails Not Sending
- Check SendGrid API key
- Verify Gmail credentials
- Check email in spam folder
- Review API error logs

### Printful Orders Not Syncing
- Verify API key is active
- Check order payment status
- Review Printful dashboard
- Check console logs

### Social Media Not Publishing
- Verify access tokens
- Check account IDs
- Review platform rate limits
- Check API rate limiting

### Cart Not Persisting
- Clear browser cache
- Check Firestore rules
- Verify Firebase connection
- Check localStorage quota

---

## 📞 **Support**

- **Documentation**: Check README sections
- **Firebase Issues**: https://firebase.google.com/support
- **Stripe Support**: https://support.stripe.com
- **API Docs**: Check individual service documentation

---

## 📄 **License**

This project is proprietary. All rights reserved.

---

## 🙏 **Credits**

Built with:
- Next.js
- Firebase
- Stripe
- Printful
- Shopify
- SendGrid
- TailwindCSS
- Recharts

---

## 🚀 **Getting Help**

If you need assistance:
1. Check the [Setup Guide](./SETUP_GUIDE.md) for step-by-step instructions
2. Review individual API documentation
3. Check environment variables
4. Review error console logs
5. Check Firestore security rules

---

**Happy Selling! 🎉**
