import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Configure email service
let transporter;

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
} else {
  // Fallback to Gmail
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, customerId } = body;

    if (!orderId || !customerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get order
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderDoc.data();

    // Get customer
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (!customerDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerDoc.data();

    // Build HTML email
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

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER,
      to: customer.email,
      subject: `Order Confirmation #${orderId.slice(0, 8)}`,
      html: `
        <h2>Order Confirmed!</h2>
        <p>Hi ${customer.firstName},</p>
        <p>Thank you for your order. Here are the details:</p>
        
        <h3>Order #${orderId.slice(0, 8)}</h3>
        <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
        
        <table style="width: 100%; border-collapse: collapse;">
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
          <h3><strong>Total:</strong> $${order.total.toFixed(2)}</h3>
        </div>
        
        <p style="margin-top: 20px;">We'll send you a tracking number as soon as your order ships.</p>
        <p>Thank you for shopping with us!</p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log('✅ Order confirmation email sent:', customer.email);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('[Send Confirmation Email] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
