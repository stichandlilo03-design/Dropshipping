// /api/email/send-gmail/route.js
// Gmail SMTP fallback email sender

import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

// Initialize Gmail transporter
let gmailTransporter = null;

function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter;

  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
    },
  });

  return gmailTransporter;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

    console.log('[Gmail SMTP] Sending email to:', to);

    // Validate
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing email or subject' },
        { status: 400 }
      );
    }

    // Check credentials
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('[Gmail SMTP] Gmail credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Gmail not configured' },
        { status: 500 }
      );
    }

    // Get transporter
    const transporter = getGmailTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: `DropBoard <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html || text,
      text: text,
      replyTo: process.env.GMAIL_REPLY_TO || process.env.GMAIL_USER,
    });

    console.log('[Gmail SMTP] ✅ Email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      method: 'gmail',
    });
  } catch (error) {
    console.error('[Gmail SMTP] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
