import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

let transporter;

if (process.env.SENDGRID_API_KEY) {
  const sgTransport = require('nodemailer-sendgrid-transport');
  transporter = nodemailer.createTransport(
    sgTransport({
      auth: {
        api_key: process.env.SENDGRID_API_KEY
      }
    })
  );
} else {
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
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const userId = authHeader.split(' ')[1];
    const { name, subject, body_html, recipient_list } = body;

    if (!name || !subject || !body_html || !recipient_list) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create campaign document
    const campaignRef = await addDoc(collection(db, 'email_campaigns'), {
      name: name,
      subject: subject,
      body_html: body_html,
      recipients: recipient_list,
      status: 'sending',
      scheduled_at: new Date().toISOString(),
      sent_at: null,
      analytics: {
        sent: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0
      },
      created_by: userId,
      created_at: new Date().toISOString()
    });

    // Send emails
    let sentCount = 0;

    for (const email of recipient_list) {
      try {
        await transporter.sendMail({
          from: process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER,
          to: email,
          subject: subject,
          html: body_html
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err.message);
      }
    }

    // Update campaign status
    await updateDoc(doc(db, 'email_campaigns', campaignRef.id), {
      status: 'sent',
      sent_at: new Date().toISOString(),
      'analytics.sent': sentCount
    });

    console.log('✅ Campaign sent to', sentCount, 'recipients');

    return NextResponse.json({
      success: true,
      campaignId: campaignRef.id,
      sent: sentCount,
      total: recipient_list.length,
      message: 'Campaign sent successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Send Campaign] Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
