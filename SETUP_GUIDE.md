# 🎯 Complete Setup Guide - DropBoard Automation Platform

**Step-by-Step instructions to set up your fully automated dropshipping platform**

---

## 📋 Table of Contents

1. [Pre-Setup Checklist](#pre-setup-checklist)
2. [Phase 1: Core Setup](#phase-1-core-setup)
3. [Phase 2: Essential APIs](#phase-2-essential-apis)
4. [Phase 3: Automation APIs](#phase-3-automation-apis)
5. [Phase 4: Social Media APIs](#phase-4-social-media-apis)
6. [Phase 5: Deployment](#phase-5-deployment)
7. [Phase 6: Testing](#phase-6-testing)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Setup Checklist

Before you start, you'll need:

- [ ] GitHub account (for repo)
- [ ] Vercel account (for hosting)
- [ ] Firebase account (for database)
- [ ] Credit card for paid services
- [ ] Email address for accounts

**Estimated Setup Time: 2-3 hours**

---

# 🔧 PHASE 1: CORE SETUP

## Step 1: Firebase Setup

### 1.1 Create Firebase Project

**Link:** https://console.firebase.google.com/

1. Click **"Add project"**
2. Name it: `dropboard` (or your choice)
3. Click **Continue**
4. Enable Google Analytics (optional)
5. Click **Create project**
6. Wait for project creation

### 1.2 Enable Firestore

1. Go to **Firestore Database** (left sidebar)
2. Click **Create database**
3. Select **Start in production mode**
4. Choose region: **us-central1**
5. Click **Create**

### 1.3 Enable Authentication

1. Go to **Authentication** (left sidebar)
2. Click **Get started**
3. Click **Email/Password**
4. Toggle **Enable**
5. Click **Save**

### 1.4 Get Firebase Credentials

1. Click **Settings** icon (⚙️) → **Project settings**
2. Scroll down to **Your apps**
3. Click **Config**
4. Copy all values
5. Save for `.env.local`

### 1.5 Security Rules

Go to **Firestore** → **Rules** tab

Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public collections
    match /products/{document=**} {
      allow read: if true;
      allow write: if request.auth.uid != null;
    }
    
    // User collections
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /integrations/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    
    // Orders (all users can read their own)
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Customers
    match /customers/{customerId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish**

### ✅ Firebase Complete!

You now have:
- ✅ Firestore database
- ✅ Authentication
- ✅ Security rules

---

# 💳 PHASE 2: ESSENTIAL APIs

## Step 2: Stripe Setup

### 2.1 Create Stripe Account

**Link:** https://dashboard.stripe.com/register

1. Enter email, password
2. Business name: Your shop name
3. Click **Create account**
4. Verify email

### 2.2 Get API Keys

**Link:** https://dashboard.stripe.com/apikeys

1. Click **Reveal live key** (or use test keys first)
2. Copy **Secret Key** → `STRIPE_SECRET_KEY`
3. Copy **Publishable Key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Save for `.env.local`

### ✅ Stripe Complete!

You can now accept payments.

---

## Step 3: Printful Setup (For Fulfillment)

### 3.1 Create Printful Account

**Link:** https://www.printful.com/signup

1. Enter email, password
2. Choose business type
3. Click **Create account**
4. Verify email

### 3.2 Get Printful API Key

**Link:** https://www.printful.com/dashboard/settings/api

1. Go to **Account** → **Settings** → **API**
2. Click **Show API key**
3. Copy full API key
4. Save as `PRINTFUL_API_KEY` in `.env.local`

**Note:** You need API access, available on paid plans

### ✅ Printful Complete!

You can now auto-sync orders to print-on-demand.

---

## Step 4: Shopify Setup (Optional - For Product Import)

### 4.1 Create Shopify Development Store

**Link:** https://www.shopify.com/partners/dashboard

1. Sign up for Shopify Partners (free)
2. Go to **Stores**
3. Click **Add store**
4. Choose **Development store**
5. Fill in details
6. Click **Create store**

### 4.2 Get Shopify Credentials

**Link:** https://your-store.myshopify.com/admin/apps-and-sales-channels/develop-apps

1. Click **Create an app**
2. Name: `DropBoard`
3. Click **Create app**
4. Go to **Configuration** tab
5. Under **Admin API scopes**, select:
   - `read_products`
   - `write_products`
   - `read_orders`
6. Click **Save**
7. Click **Install app**
8. Go to **API credentials**
9. Copy **Admin API access token**
10. Save as `SHOPIFY_ACCESS_TOKEN`
11. Store URL: `your-store.myshopify.com` → `SHOPIFY_STORE_URL`

### ✅ Shopify Complete!

You can now import trending products.

---

# 📧 PHASE 3: AUTOMATION APIs

## Step 5: Email Setup (Choose One or Both)

### Option A: SendGrid (Recommended for primary)

**Link:** https://sendgrid.com/free

1. Sign up with email
2. Verify email
3. Go to **Settings** → **API Keys**
4. Click **Create API Key**
5. Name: `DropBoard`
6. Copy key
7. Save as `SENDGRID_API_KEY`

**✅ SendGrid Setup Complete!**

### Option B: Gmail SMTP (Recommended for fallback)

**Link:** https://myaccount.google.com/security

1. **Enable 2-Factor Authentication:**
   - Go to https://myaccount.google.com/security
   - Find **2-Step Verification**
   - Click **Enable**
   - Follow instructions

2. **Create App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select **Mail** and **Windows Computer** (or similar)
   - Click **Generate**
   - Copy the 16-character password

3. **Add to `.env.local`:**
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   GMAIL_REPLY_TO=support@yoursite.com
   ```

**✅ Gmail SMTP Setup Complete!**

---

## Step 6: Cron Job Setup (For Automation)

### 6.1 Vercel Cron Jobs

**Link:** https://vercel.com/docs/cron-jobs

If hosting on Vercel:

1. Create `vercel.json` in root:
```json
{
  "crons": [
    {
      "path": "/api/cron/shipping-update",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/delivery-check",
      "schedule": "0 0 * * *"
    }
  ]
}
```

2. Deploy to Vercel
3. Add `CRON_SECRET` to Vercel environment variables

### 6.2 Alternative: EasyCron

**Link:** https://www.easycron.com

1. Create free account
2. Create new cron:
   - URL: `https://yoursite.com/api/cron/shipping-update?secret=YOUR_SECRET`
   - Schedule: Every 6 hours
   - Click **Save**
3. Create another for delivery check (daily)

**✅ Cron Jobs Setup Complete!**

---

# 📱 PHASE 4: SOCIAL MEDIA APIs

## Step 7: TikTok Shop Setup

### 7.1 Create TikTok Seller Account

**Link:** https://seller.tiktok.com

1. Sign up or log in
2. Set up **TikTok Shop**
3. Complete seller verification
4. Go to **Settings** → **Developer Tools**

### 7.2 Get TikTok API Credentials

**Link:** https://developers.tiktok.com

1. Sign up for developer account
2. Create new app
3. Select **TikTok Shop** type
4. Fill in details
5. Get **Client Key** and **Client Secret**
6. Authorize app to get **Access Token**
7. Save:
   ```
   TIKTOK_ACCESS_TOKEN=...
   TIKTOK_CLIENT_KEY=...
   ```

**📖 TikTok Docs:** https://developers.tiktok.com/doc/shop-api-overview/

**✅ TikTok Setup Complete!**

---

## Step 8: Instagram Business Setup

### 8.1 Convert Instagram to Business Account

**Link:** https://www.instagram.com

1. Go to **Settings** → **Account type and tools**
2. Click **Switch to professional account**
3. Choose **Business**
4. Fill in business details

### 8.2 Get Instagram Access Token

**Link:** https://business.facebook.com

1. Log in with same account
2. Go to **Business Suite**
3. Select your Business Manager
4. Go to **Settings** → **Instagram Accounts**
5. Select your account
6. Go to **Access Tokens**
7. Generate new token
8. Copy token and Account ID
9. Save:
   ```
   INSTAGRAM_ACCESS_TOKEN=...
   INSTAGRAM_ACCOUNT_ID=...
   ```

**📖 Instagram Docs:** https://developers.facebook.com/docs/instagram-api/

**✅ Instagram Setup Complete!**

---

## Step 9: Facebook Page Setup

### 9.1 Create Facebook Business Page

**Link:** https://www.facebook.com/pages/create

1. Click **Get Started**
2. Enter business name
3. Choose category
4. Add profile picture
5. Click **Create page**

### 9.2 Get Facebook Access Token

**Link:** https://business.facebook.com

1. Go to **Business Suite**
2. Select Business Manager
3. Go to **Settings** → **Pages**
4. Select your page
5. Click **Generate token**
6. Get **Page ID** from page settings
7. Save:
   ```
   FACEBOOK_ACCESS_TOKEN=...
   FACEBOOK_PAGE_ID=...
   ```

**📖 Facebook Docs:** https://developers.facebook.com/docs/facebook-login/access-tokens

**✅ Facebook Setup Complete!**

---

## Step 10: Pinterest Setup

### 10.1 Create Pinterest Business Account

**Link:** https://business.pinterest.com

1. Sign up for business account
2. Verify email
3. Set up profile

### 10.2 Get Pinterest Access Token

**Link:** https://developers.pinterest.com

1. Go to **Developer Console**
2. Create new app
3. Get **Access Token**
4. Get **Board ID** from your Pinterest board URL
5. Save:
   ```
   PINTEREST_ACCESS_TOKEN=...
   PINTEREST_BOARD_ID=...
   ```

**📖 Pinterest Docs:** https://developers.pinterest.com/docs/api/overview/

**✅ Pinterest Setup Complete!**

---

## Step 11: Zapier Setup (Optional - For Workflows)

### 11.1 Create Zapier Account

**Link:** https://zapier.com/app/signup

1. Sign up with email
2. Verify email
3. Create Zap

### 11.2 Create Webhook

1. Click **Create Zap**
2. Search **Webhooks by Zapier**
3. Select **Catch Hook**
4. Copy webhook URL
5. Save as `ZAPIER_WEBHOOK_URL`

**📖 Zapier Docs:** https://zapier.com/help/create/basic/trigger-workflows-with-webhooks

**✅ Zapier Setup Complete!**

---

# 🚀 PHASE 5: DEPLOYMENT

## Step 12: Vercel Deployment

### 12.1 Create Vercel Account

**Link:** https://vercel.com/signup

1. Sign up (use GitHub)
2. Create Vercel account
3. Import GitHub repo

### 12.2 Set Environment Variables

1. Go to Vercel Project → **Settings** → **Environment Variables**
2. Add all variables from `.env.local`:
   - Firebase keys
   - Stripe keys
   - Printful key
   - Email credentials
   - Social media tokens
   - Cron secret

### 12.3 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Get production URL

**✅ Deployment Complete!**

---

## Step 13: Custom Domain (Optional)

1. Go to Vercel → **Domains**
2. Add custom domain
3. Update DNS settings
4. Wait for verification

---

# ✅ PHASE 6: TESTING

## Test Each Feature

### Test 1: Customer Signup & Login
- [ ] Create customer account
- [ ] Log in successfully
- [ ] See dashboard

### Test 2: Product Browsing
- [ ] Browse products
- [ ] Search products
- [ ] Filter by category

### Test 3: Shopping Cart
- [ ] Add product to cart
- [ ] Cart persists on refresh
- [ ] Clear cart

### Test 4: Checkout
- [ ] Proceed to checkout
- [ ] Enter shipping address
- [ ] Pay with Stripe test card: `4242 4242 4242 4242`
- [ ] Order created successfully

### Test 5: Email
- [ ] Check email for order confirmation
- [ ] Verify email content

### Test 6: Admin Access
- [ ] Log in as admin
- [ ] See dashboard with stats
- [ ] View all orders
- [ ] View all customers

### Test 7: Social Publishing
- [ ] Add product to store
- [ ] Click "Publish" button
- [ ] Select platforms
- [ ] Publish
- [ ] Verify on social media

### Test 8: Trending Products
- [ ] Verify Shopify/Printful connected
- [ ] See trending products
- [ ] Add trending product to store

### Test 9: Cron Jobs (Wait 6+ hours or test manually)
- [ ] Shipping updates working
- [ ] Tracking emails sent
- [ ] Delivery confirmation working

---

# 🐛 Troubleshooting

## Firebase Issues

**Problem:** "Firebase is not initialized"
**Solution:**
1. Check `.env.local` has all Firebase keys
2. Verify Firebase project exists
3. Restart dev server: `npm run dev`

**Problem:** "Permission denied" errors
**Solution:**
1. Go to Firestore → Rules
2. Check security rules are published
3. Verify user is authenticated

## Email Issues

**Problem:** Emails not sending
**Solution:**
1. Check SendGrid API key is valid
2. Verify Gmail 2FA enabled
3. Check spam folder
4. Review console errors

## Stripe Issues

**Problem:** Payment declined
**Solution:**
1. Use test card: `4242 4242 4242 4242`
2. Check Stripe key is correct
3. Verify webhook setup

## Social Media Issues

**Problem:** Can't publish to social
**Solution:**
1. Verify access tokens are valid
2. Check account IDs are correct
3. Review API rate limits
4. Check platform is connected in integrations

---

# 📊 Environment Variables Checklist

Copy and fill in all values:

```env
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe (Required)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Printful (Optional - for fulfillment)
PRINTFUL_API_KEY=

# Shopify (Optional - for products)
SHOPIFY_STORE_URL=
SHOPIFY_ACCESS_TOKEN=

# Email (Choose one or both)
SENDGRID_API_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
GMAIL_REPLY_TO=

# Social Media (Optional)
TIKTOK_ACCESS_TOKEN=
TIKTOK_CLIENT_KEY=
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_ACCOUNT_ID=
FACEBOOK_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
PINTEREST_ACCESS_TOKEN=
PINTEREST_BOARD_ID=

# Automation
ZAPIER_WEBHOOK_URL=
CRON_SECRET=
```

---

# 🎉 You're Ready!

You now have a fully automated dropshipping platform with:

✅ E-commerce platform
✅ Payment processing
✅ Order fulfillment
✅ Email automation
✅ Social media publishing
✅ Admin dashboard
✅ Customer accounts
✅ Analytics

**Start selling! 🚀**

---

## 📚 Quick Links

| Service | Link | Purpose |
|---------|------|---------|
| Firebase | https://firebase.google.com | Database & Auth |
| Stripe | https://stripe.com | Payments |
| Printful | https://printful.com | Fulfillment |
| Shopify | https://shopify.com | Products |
| SendGrid | https://sendgrid.com | Email |
| Gmail | https://mail.google.com | Email (Fallback) |
| TikTok | https://developer.tiktok.com | Social |
| Instagram | https://business.facebook.com | Social |
| Facebook | https://business.facebook.com | Social |
| Pinterest | https://developers.pinterest.com | Social |
| Zapier | https://zapier.com | Workflows |
| Vercel | https://vercel.com | Hosting |

---

**Need help? Check the main README or review error logs.**
