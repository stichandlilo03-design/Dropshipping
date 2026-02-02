import nodemailer from 'nodemailer';

// Initialize transporter
let transporter;

export function initializeEmailService() {
  if (process.env.SENDGRID_API_KEY) {
    // Use Sendgrid
    const sgTransport = require('nodemailer-sendgrid-transport');
    transporter = nodemailer.createTransport(
      sgTransport({
        auth: {
          api_key: process.env.SENDGRID_API_KEY
        }
      })
    );
  } else if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_USER) {
    // Use Gmail
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  } else {
    console.warn('No email service configured');
  }
}

// Send email
export async function sendEmail(to, subject, html) {
  try {
    if (!transporter) {
      initializeEmailService();
    }

    if (!transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER,
      to: to,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', to);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, error: error.message };
  }
}

// Send order confirmation
export async function sendOrderConfirmation(customer, order) {
  try {
    const itemsHTML = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          $${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    const html = `
      <h2 style="color: #333;">Order Confirmed!</h2>
      <p>Hi ${customer.firstName},</p>
      <p>Thank you for your order. Here are the details:</p>
      
      <h3 style="color: #555;">Order #${order.id?.slice(0, 8)}</h3>
      <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Quantity</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div style="margin-top: 20px; text-align: right;">
        <p><strong>Subtotal:</strong> $${order.subtotal.toFixed(2)}</p>
        <p><strong>Shipping:</strong> $${order.shipping.toFixed(2)}</p>
        <p><strong>Tax:</strong> $${order.tax.toFixed(2)}</p>
        <h3 style="color: #27ae60;"><strong>Total:</strong> $${order.total.toFixed(2)}</h3>
      </div>
      
      <p style="margin-top: 20px;">We'll send you a tracking number as soon as your order ships.</p>
      <p>Thank you for shopping with us!</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
      <p style="color: #999; font-size: 12px;">
        Questions? Contact us at support@dropshipping.com
      </p>
    `;

    return await sendEmail(customer.email, `Order Confirmation #${order.id?.slice(0, 8)}`, html);
  } catch (error) {
    console.error('Error sending order confirmation:', error.message);
    return { success: false, error: error.message };
  }
}

// Send shipping notification
export async function sendShippingNotification(customer, order, trackingInfo) {
  try {
    const html = `
      <h2 style="color: #333;">Your Order has Shipped!</h2>
      <p>Hi ${customer.firstName},</p>
      <p>Great news! Your order is on its way to you.</p>
      
      <h3 style="color: #555;">Tracking Information</h3>
      <p>
        <strong>Carrier:</strong> ${trackingInfo.carrier}<br>
        <strong>Tracking Number:</strong> ${trackingInfo.trackingNumber}<br>
        <strong>Estimated Delivery:</strong> ${trackingInfo.estimatedDelivery}
      </p>
      
      <p style="margin-top: 20px;">
        <a href="${trackingInfo.trackingUrl}" style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Track Your Package
        </a>
      </p>
      
      <p style="margin-top: 20px;">Thank you for your patience!</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
      <p style="color: #999; font-size: 12px;">
        Questions? Contact us at support@dropshipping.com
      </p>
    `;

    return await sendEmail(customer.email, `Your Order is Shipping - Tracking #${trackingInfo.trackingNumber}`, html);
  } catch (error) {
    console.error('Error sending shipping notification:', error.message);
    return { success: false, error: error.message };
  }
}

// Send abandoned cart reminder
export async function sendAbandonedCartReminder(customer, cartItems, cartTotal) {
  try {
    const itemsHTML = cartItems.map(item => `
      <li>${item.name} - $${item.price} x ${item.quantity}</li>
    `).join('');

    const html = `
      <h2 style="color: #333;">Don't forget your items!</h2>
      <p>Hi ${customer.firstName},</p>
      <p>You left some great items in your cart. Don't miss out!</p>
      
      <h3 style="color: #555;">Your Items:</h3>
      <ul>
        ${itemsHTML}
      </ul>
      
      <h3 style="color: #27ae60;">Total: $${cartTotal.toFixed(2)}</h3>
      
      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/cart" style="background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Complete Your Purchase
        </a>
      </p>
      
      <p style="margin-top: 20px; color: #999; font-size: 12px;">
        This offer expires in 24 hours. Don't wait!
      </p>
    `;

    return await sendEmail(customer.email, 'Don\'t forget your items!', html);
  } catch (error) {
    console.error('Error sending abandoned cart reminder:', error.message);
    return { success: false, error: error.message };
  }
}
