// app/api/integrations/tiktok/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientKey, clientSecret, redirectUri } = data;

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    // Validate with TikTok OAuth endpoint
    try {
      const response = await fetch('https://open.tiktokapis.com/v1/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }).toString(),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid TikTok credentials' },
          { status: 401 }
        );
      }

      const tokenData = await response.json();
      
      // Store credentials securely
      const credentials = {
        clientKey,
        clientSecret,
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in,
        connectedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'TikTok connected successfully',
        credentials,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to validate with TikTok API' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
