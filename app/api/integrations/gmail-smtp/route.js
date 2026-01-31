import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email, appPassword } = await request.json();

    console.log('[Gmail Validator] Testing Email and App Password...');

    if (!email || !appPassword) {
      console.error('[Gmail Validator] ❌ Missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and App Password are required' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('[Gmail Validator] ❌ Invalid email format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format. Please enter a valid Gmail address.' 
        },
        { status: 400 }
      );
    }

    // App password should be 16 characters with spaces
    const cleanedPassword = appPassword.replace(/\s/g, '');
    if (cleanedPassword.length < 16) {
      console.error('[Gmail Validator] ❌ App password too short');
      return NextResponse.json(
        { 
          success: false, 
          error: 'App Password appears invalid. Gmail App Passwords are 16 characters (4 groups of 4).' 
        },
        { status: 400 }
      );
    }

    console.log('[Gmail Validator] Creating transporter with Gmail SMTP...');

    try {
      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email,
          pass: cleanedPassword,
        },
      });

      // Test connection
      console.log('[Gmail Validator] Testing SMTP connection...');
      await transporter.verify();

      console.log('[Gmail Validator] ✅ Gmail credentials are valid!');

      return NextResponse.json({
        success: true,
        credentials: {
          provider: 'Gmail SMTP',
          email: email,
          status: 'active',
          smtpServer: 'smtp.gmail.com',
          port: 587,
          testedAt: new Date().toISOString(),
        },
      });

    } catch (smtpError) {
      console.error('[Gmail Validator] ❌ SMTP verification failed:', smtpError.message);

      if (smtpError.message.includes('Invalid login') || smtpError.message.includes('invalid credentials')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid email or App Password. Please check your credentials and ensure 2-Step Verification is enabled.' 
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `SMTP verification failed: ${smtpError.message}` 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Gmail Validator] ❌ Error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: `Validation failed: ${error.message}` 
      },
      { status: 500 }
    );
  }
}
