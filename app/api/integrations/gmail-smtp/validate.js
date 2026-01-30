// app/api/integrations/gmail-smtp/validate.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const data = await request.json();
    const { emailAddress, smtpHost, smtpPort, appPassword } = data;

    if (!emailAddress || !smtpHost || !smtpPort || !appPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate SMTP connection
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: emailAddress,
          pass: appPassword,
        },
      });

      // Test the connection
      await transporter.verify();

      const credentials = {
        emailAddress,
        smtpHost,
        smtpPort,
        appPassword: appPassword.substring(0, 4) + '...' + appPassword.substring(-4), // Hide for display
        connectedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Email configuration validated successfully',
        credentials,
      });
    } catch (smtpError) {
      console.error('SMTP validation error:', smtpError);
      return NextResponse.json(
        { error: `SMTP Error: ${smtpError.message}. Check your email, SMTP host, port, and app password.` },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper to send emails
export async function sendEmail(config, recipient, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpPort === '465',
      auth: {
        user: config.emailAddress,
        pass: config.appPassword,
      },
    });

    const info = await transporter.sendMail({
      from: config.emailAddress,
      to: recipient,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
