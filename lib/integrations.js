// API Integration Manager for Shopify, Printful, Stripe, and Zapier

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

export class EmailAutomation {
  constructor(emailApiKey) {
    this.apiKey = emailApiKey;
    this.baseUrl = 'https://api.sendgrid.com/v3';
  }

  async sendOrderConfirmation(customerEmail, orderDetails) {
    try {
      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: customerEmail }],
            subject: `Order Confirmation #${orderDetails.orderNumber}`,
          }],
          from: { email: 'noreply@dropboard.com' },
          content: [{
            type: 'text/html',
            value: this.getOrderEmailTemplate(orderDetails),
          }],
        }),
      });
      return response.status === 202;
    } catch (error) {
      console.error('Email Automation Error:', error);
      return false;
    }
  }

  async sendShippingNotification(customerEmail, trackingInfo) {
    try {
      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: customerEmail }],
            subject: `Your Order is Shipped - Tracking ${trackingInfo.trackingNumber}`,
          }],
          from: { email: 'noreply@dropboard.com' },
          content: [{
            type: 'text/html',
            value: this.getShippingEmailTemplate(trackingInfo),
          }],
        }),
      });
      return response.status === 202;
    } catch (error) {
      console.error('Email Automation Error:', error);
      return false;
    }
  }

  getOrderEmailTemplate(orderDetails) {
    return `
      <h2>Order Confirmation</h2>
      <p>Thank you for your order!</p>
      <p>Order #: ${orderDetails.orderNumber}</p>
      <p>Amount: $${orderDetails.amount}</p>
      <p>We'll send you a tracking number as soon as it ships.</p>
    `;
  }

  getShippingEmailTemplate(trackingInfo) {
    return `
      <h2>Your Order is Shipped!</h2>
      <p>Tracking Number: ${trackingInfo.trackingNumber}</p>
      <p>Carrier: ${trackingInfo.carrier}</p>
      <p>Expected Delivery: ${trackingInfo.estimatedDelivery}</p>
    `;
  }
}

