// /lib/integrations.js
// COMPLETE Integration manager combining all existing APIs + new automation

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// EXISTING INTEGRATIONS (KEEP EVERYTHING)
// ============================================================================

export class ShopifyIntegration {
  constructor(storeUrl, accessToken) {
    this.storeUrl = storeUrl;
    this.accessToken = accessToken;
    this.apiVersion = '2024-01';
    this.baseUrl = `https://${storeUrl}/admin/api/${this.apiVersion}`;
  }

  async getOrders(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/orders.json?limit=${limit}`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Shopify Orders Error:', error);
      return null;
    }
  }

  async getProducts(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/products.json?limit=${limit}`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Shopify Products Error:', error);
      return null;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: { financial_status: status }
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Shopify Update Error:', error);
      return null;
    }
  }
}

export class PrintfulIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.printful.com';
  }

  async getOrders() {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Printful Orders Error:', error);
      return null;
    }
  }

  async getProducts() {
    try {
      const response = await fetch(`${this.baseUrl}/products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Printful Products Error:', error);
      return null;
    }
  }

  async syncOrder(orderData) {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      return await response.json();
    } catch (error) {
      console.error('Printful Sync Error:', error);
      return null;
    }
  }

  async trackShipment(orderId) {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Printful Track Error:', error);
      return null;
    }
  }

  // ✅ NEW: Auto-sync order to Printful
  async autoSyncOrder(orderId, orderData) {
    try {
      console.log('[Printful] Auto-syncing order:', orderId);

      const printfulOrderPayload = {
        external_id: orderId,
        label: `Order #${orderId}`,
        items: orderData.items.map(item => ({
          external_id: item.id,
          variant_id: item.variantId || item.id,
          quantity: item.quantity,
          retail_price: parseFloat(item.price),
        })),
        recipient: {
          name: orderData.customerName,
          address1: orderData.shippingAddress?.street || '',
          address2: orderData.shippingAddress?.apt || '',
          city: orderData.shippingAddress?.city || '',
          state_code: orderData.shippingAddress?.state || '',
          country_code: orderData.shippingAddress?.country || 'US',
          zip: orderData.shippingAddress?.zip || '',
          email: orderData.customerEmail,
          phone: orderData.customerPhone || '',
        },
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printfulOrderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[Printful] Sync failed:', result);
        return { success: false, error: result.message };
      }

      console.log('[Printful] ✅ Auto-synced:', result.data?.id);

      // Update Firebase with Printful ID
      await updateDoc(doc(db, 'orders', orderId), {
        printful_order_id: result.data?.id,
        printful_synced: true,
        printful_synced_at: new Date().toISOString(),
      });

      return { success: true, printfulOrderId: result.data?.id };
    } catch (error) {
      console.error('[Printful] Error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NEW: Get shipping label with auto-update
  async getShippingLabelAndUpdate(printfulOrderId, orderId) {
    try {
      console.log('[Printful] Getting shipping label:', printfulOrderId);

      const response = await fetch(`${this.baseUrl}/orders/${printfulOrderId}/shipments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[Printful] Failed to get label:', result);
        return { success: false, error: result.message };
      }

      const shipmentData = result.data?.[0];

      if (!shipmentData) {
        console.log('[Printful] Order still processing');
        return { success: false, error: 'Order not ready for shipping' };
      }

      console.log('[Printful] ✅ Got shipment data:', shipmentData);

      // Auto-update Firebase
      await updateDoc(doc(db, 'orders', orderId), {
        tracking_number: shipmentData.tracking_number,
        shipping_carrier: shipmentData.carrier,
        label_url: shipmentData.label_url || null,
        estimated_delivery: shipmentData.estimated_delivery_date,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        trackingNumber: shipmentData.tracking_number,
        carrier: shipmentData.carrier,
        labelUrl: shipmentData.label_url,
        estimatedDelivery: shipmentData.estimated_delivery_date,
      };
    } catch (error) {
      console.error('[Printful] Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export class StripeIntegration {
  constructor(secretKey, publishableKey) {
    this.secretKey = secretKey;
    this.publishableKey = publishableKey;
    this.baseUrl = 'https://api.stripe.com/v1';
  }

  async getPayments(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/charges?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Stripe Payments Error:', error);
      return null;
    }
  }

  async refundPayment(chargeId, amount) {
    try {
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `charge=${chargeId}&amount=${amount}`,
      });
      return await response.json();
    } catch (error) {
      console.error('Stripe Refund Error:', error);
      return null;
    }
  }

  async getBalance() {
    try {
      const response = await fetch(`${this.baseUrl}/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Stripe Balance Error:', error);
      return null;
    }
  }
}

export class ZapierAutomation {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async triggerNewOrder(orderData) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'new_order',
          data: orderData,
          timestamp: new Date().toISOString(),
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Zapier Webhook Error:', error);
      return null;
    }
  }

  async triggerLowStock(productData) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'low_stock',
          data: productData,
          timestamp: new Date().toISOString(),
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Zapier Webhook Error:', error);
      return null;
    }
  }

  async triggerShipment(shipmentData) {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'shipment_ready',
          data: shipmentData,
          timestamp: new Date().toISOString(),
        }),
      });
      return await response.json();
    } catch (error) {
      console.error('Zapier Webhook Error:', error);
      return null;
    }
  }
}

// ============================================================================
// EMAIL AUTOMATION (COMBINED SendGrid + Gmail SMTP)
// ============================================================================

export class EmailAutomation {
  constructor(sendgridKey = null, gmailConfig = null) {
    this.sendgridKey = sendgridKey;
    this.gmailConfig = gmailConfig;
    this.sendgridBaseUrl = 'https://api.sendgrid.com/v3';
    // Default fallback email
    this.fromEmail = 'noreply@dropboard.com';
  }

  // ✅ Smart email sender: tries SendGrid first, falls back to Gmail SMTP
  async sendEmail(to, subject, htmlContent) {
    console.log('[Email] Sending email to:', to);

    // Try SendGrid first
    if (this.sendgridKey) {
      console.log('[Email] Attempting SendGrid...');
      const sendgridResult = await this._sendViaSendGrid(to, subject, htmlContent);
      if (sendgridResult.success) {
        console.log('[Email] ✅ Sent via SendGrid');
        return sendgridResult;
      }
      console.log('[Email] SendGrid failed:', sendgridResult.error);
    }

    // Fallback to Gmail SMTP
    console.log('[Email] Falling back to Gmail SMTP...');
    const gmailResult = await this._sendViaGmailSMTP(to, subject, htmlContent);
    if (gmailResult.success) {
      console.log('[Email] ✅ Sent via Gmail SMTP');
      return gmailResult;
    }

    console.error('[Email] ❌ Both methods failed');
    return { success: false, error: 'All email methods failed' };
  }

  // ✅ SendGrid method
  async _sendViaSendGrid(to, subject, htmlContent) {
    try {
      const response = await fetch(`${this.sendgridBaseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }],
            subject: subject,
          }],
          from: { email: this.fromEmail },
          content: [{
            type: 'text/html',
            value: htmlContent,
          }],
        }),
      });

      if (response.status === 202) {
        return { success: true, method: 'sendgrid' };
      } else {
        return { success: false, error: `SendGrid returned ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ Gmail SMTP method
  async _sendViaGmailSMTP(to, subject, htmlContent) {
    try {
      const response = await fetch('/api/email/send-gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          html: htmlContent,
        }),
      });

      const result = await response.json();
      if (result.success) {
        return { success: true, method: 'gmail' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ Send order confirmation
  async sendOrderConfirmation(customerEmail, orderDetails) {
    console.log('[Email] Sending order confirmation for:', orderDetails.orderNumber);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Thank you for your order, ${orderDetails.customer}!</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order #:</strong> ${orderDetails.orderNumber}</p>
          <p><strong>Amount:</strong> $${orderDetails.amount?.toFixed(2)}</p>
          <p><strong>Items:</strong> ${orderDetails.items?.length || 0} item(s)</p>
        </div>
        <p>We'll send you a tracking number as soon as your order ships.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Thank you for shopping with us!
        </p>
      </div>
    `;

    return await this.sendEmail(
      customerEmail,
      `Order Confirmation #${orderDetails.orderNumber}`,
      htmlContent
    );
  }

  // ✅ Send shipping notification
  async sendShippingNotification(customerEmail, trackingInfo) {
    console.log('[Email] Sending shipping notification for:', trackingInfo.trackingNumber);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Your Order is Shipped! 📦</h2>
        <div style="background: #e8f8f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
          <p><strong>Tracking Number:</strong> <code>${trackingInfo.trackingNumber}</code></p>
          <p><strong>Carrier:</strong> ${trackingInfo.carrier}</p>
          <p><strong>Expected Delivery:</strong> ${trackingInfo.estimatedDelivery}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="https://track.shipment.com/?tracking=${trackingInfo.trackingNumber}" 
             style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Track Package
          </a>
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Questions? Contact us anytime.
        </p>
      </div>
    `;

    return await this.sendEmail(
      customerEmail,
      `Your Order is Shipped - Tracking ${trackingInfo.trackingNumber}`,
      htmlContent
    );
  }

  // ✅ Send delivery confirmation
  async sendDeliveryConfirmation(customerEmail, orderNumber) {
    console.log('[Email] Sending delivery confirmation for:', orderNumber);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Your Order has Arrived! 🎉</h2>
        <p>Great news! Your order #${orderNumber} has been delivered.</p>
        <div style="background: #e8f8f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>We hope you love your purchase!</p>
          <p style="margin: 20px 0; font-size: 16px;">
            <a href="https://dropboard.com/rate-order/${orderNumber}" 
               style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Leave a Review
            </a>
          </p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Thank you for your business!
        </p>
      </div>
    `;

    return await this.sendEmail(
      customerEmail,
      `Order Delivered #${orderNumber}`,
      htmlContent
    );
  }
}

// ============================================================================
// SOCIAL MEDIA AUTOMATION (NEW)
// ============================================================================

export class SocialMediaAutomation {
  constructor(credentials) {
    this.tiktok = credentials?.tiktok;
    this.instagram = credentials?.instagram;
    this.facebook = credentials?.facebook;
    this.pinterest = credentials?.pinterest;
  }

  // ✅ Generate caption with AI
  async generateCaption(productData) {
    try {
      const prompt = `
        Create a catchy, engaging social media caption for this product:
        Product: ${productData.name}
        Description: ${productData.description}
        Price: $${productData.price}
        
        Make it trendy, include relevant emojis and hashtags. Keep it under 280 characters.
      `;

      const response = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();
      return result.caption || `Check out: ${productData.name} 🔥`;
    } catch (error) {
      console.error('[Social] Caption generation error:', error);
      return `Check out this amazing product: ${productData.name} 🔥`;
    }
  }

  // ✅ Generate platform-specific hashtags
  async generateHashtags(productData, platform) {
    try {
      const baseHashtags = ['#dropshipping', '#ecommerce', '#shopping', '#trending', '#newarrival'];

      const platformHashtags = {
        tiktok: ['#foryoupage', '#viral', '#tiktokshop', '#fyp', '#fy'],
        instagram: ['#instagood', '#instashopping', '#instatrend'],
        facebook: ['#facebook', '#fbshop', '#facebookshop'],
        pinterest: ['#pinterestideas', '#homedecor', '#lifestyle']
      };

      const combined = [...baseHashtags, ...(platformHashtags[platform] || [])];
      return combined.join(' ');
    } catch (error) {
      console.error('[Social] Hashtag generation error:', error);
      return '#shopping #ecommerce #trending';
    }
  }

  // ✅ Publish to TikTok
  async publishToTikTok(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to TikTok:', productData.name);

      if (!this.tiktok?.accessToken) {
        return { success: false, error: 'TikTok not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'tiktok');

      const response = await fetch('https://open.tiktokapis.com/v1/post/publish/action/publish/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tiktok.accessToken}`,
        },
        body: JSON.stringify({
          media_type: 'PHOTO',
          title: `${caption}\n\n${hashtags}`,
          source: 'CREATIVE_CENTER',
          post_mode: 'STANDARD',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message };
      }

      console.log('[Social] ✅ Published to TikTok:', result.data?.publish_id);
      return {
        success: true,
        platform: 'TikTok',
        postId: result.data?.publish_id,
      };
    } catch (error) {
      console.error('[Social] TikTok error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Publish to Instagram
  async publishToInstagram(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to Instagram:', productData.name);

      if (!this.instagram?.accessToken) {
        return { success: false, error: 'Instagram not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'instagram');

      // Step 1: Upload image
      const uploadResponse = await fetch(
        `https://graph.instagram.com/v18.0/${this.instagram.accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: `${caption}\n\n${hashtags}`,
            access_token: this.instagram.accessToken,
          }),
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        return { success: false, error: uploadData.error?.message };
      }

      // Step 2: Publish
      const publishResponse = await fetch(
        `https://graph.instagram.com/v18.0/${this.instagram.accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: uploadData.id,
            access_token: this.instagram.accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        return { success: false, error: publishData.error?.message };
      }

      console.log('[Social] ✅ Published to Instagram:', publishData.id);
      return {
        success: true,
        platform: 'Instagram',
        postId: publishData.id,
      };
    } catch (error) {
      console.error('[Social] Instagram error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Publish to Facebook
  async publishToFacebook(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to Facebook:', productData.name);

      if (!this.facebook?.accessToken) {
        return { success: false, error: 'Facebook not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'facebook');

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.facebook.pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${caption}\n\n${hashtags}`,
            picture: imageUrl,
            link: `/p/${productData.id}`,
            access_token: this.facebook.accessToken,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message };
      }

      console.log('[Social] ✅ Published to Facebook:', result.id);
      return {
        success: true,
        platform: 'Facebook',
        postId: result.id,
      };
    } catch (error) {
      console.error('[Social] Facebook error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Publish to Pinterest
  async publishToPinterest(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to Pinterest:', productData.name);

      if (!this.pinterest?.accessToken) {
        return { success: false, error: 'Pinterest not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'pinterest');

      const response = await fetch(
        `https://api.pinterest.com/v5/pins`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.pinterest.accessToken}`,
          },
          body: JSON.stringify({
            title: productData.name,
            description: `${caption}\n\n${hashtags}`,
            media_source: {
              source_type: 'image_url',
              url: imageUrl,
            },
            link: `/p/${productData.id}`,
            board_id: this.pinterest.boardId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.message };
      }

      console.log('[Social] ✅ Published to Pinterest:', result.id);
      return {
        success: true,
        platform: 'Pinterest',
        postId: result.id,
      };
    } catch (error) {
      console.error('[Social] Pinterest error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Publish to all selected platforms
  async publishToAll(productData, imageUrl, selectedPlatforms) {
    try {
      console.log('[Social] Publishing to all platforms:', selectedPlatforms);

      const results = [];

      if (selectedPlatforms.includes('tiktok')) {
        const result = await this.publishToTikTok(productData, imageUrl);
        results.push(result);
      }

      if (selectedPlatforms.includes('instagram')) {
        const result = await this.publishToInstagram(productData, imageUrl);
        results.push(result);
      }

      if (selectedPlatforms.includes('facebook')) {
        const result = await this.publishToFacebook(productData, imageUrl);
        results.push(result);
      }

      if (selectedPlatforms.includes('pinterest')) {
        const result = await this.publishToPinterest(productData, imageUrl);
        results.push(result);
      }

      const successful = results.filter(r => r.success).length;
      console.log('[Social] Published to', successful, '/', results.length);

      return {
        success: successful > 0,
        results,
        message: `Published to ${successful} platform(s)`,
      };
    } catch (error) {
      console.error('[Social] Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default {
  ShopifyIntegration,
  PrintfulIntegration,
  StripeIntegration,
  ZapierAutomation,
  EmailAutomation,
  SocialMediaAutomation,
};
