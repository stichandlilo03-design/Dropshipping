import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const data = await request.json();
    const { email, appPassword } = data;

    console.log('Gmail SMTP validation request received');

    if (!email || !appPassword) {
      return NextResponse.json(
        { error: 'Missing email or app password' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log('Testing Gmail SMTP connection...');

    try {
      // Create transporter to test connection
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email,
          pass: appPassword,
        },
      });

      // Verify connection
      await transporter.verify();
      
      console.log('✅ Gmail SMTP connection verified');

      return NextResponse.json({
        success: true,
        message: `✅ Successfully connected to Gmail SMTP for ${email}!`,
        credentials: {
          email,
          appPassword: appPassword.substring(0, 5) + '...' + appPassword.substring(-5),
          smtpServer: 'smtp.gmail.com',
          smtpPort: 587,
          connectedAt: new Date().toISOString(),
        },
      });

    } catch (smtpError) {
      console.error('SMTP error:', smtpError.message);
      
      let errorMsg = 'Failed to connect to Gmail SMTP';
      if (smtpError.message.includes('Invalid login')) {
        errorMsg = 'Invalid email or app password. Check your Gmail credentials.';
      } else if (smtpError.message.includes('Authentication failed')) {
        errorMsg = 'Authentication failed. Make sure you used an app password, not your regular password.';
      } else if (smtpError.message.includes('2-step verification')) {
        errorMsg = 'Enable 2-step verification on your Gmail account first.';
      }

      return NextResponse.json(
        { error: `Gmail Error: ${errorMsg}` },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Fatal error:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
