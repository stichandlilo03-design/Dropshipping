// app/api/integrations/tiktok/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientKey, clientSecret, redirectUri } = data;

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client Key or Client Secret' },
        { status: 400 }
      );
    }

    console.log('TikTok validation: attempting connection...');

    // TikTok OAuth endpoint
    try {
      const params = new URLSearchParams();
      params.append('client_key', clientKey);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');

      const response = await fetch('https://open.tiktokapis.com/v1/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      console.log('TikTok response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('TikTok error:', errorData);

        if (response.status === 400) {
          return NextResponse.json(
            { error: 'Invalid TikTok credentials. Check your Client Key and Client Secret in TikTok Developers → Your App → Credentials' },
            { status: 401 }
          );
        }

        if (response.status === 429) {
          return NextResponse.json(
            { error: 'Rate limited by TikTok. Please wait a moment and try again' },
            { status: 429 }
          );
        }

        return NextResponse.json(
          { error: `TikTok API error: ${response.statusText}` },
          { status: response.status }
        );
      }

      const tokenData = await response.json();

      if (!tokenData.access_token) {
        return NextResponse.json(
          { error: 'No access token received from TikTok. Check your credentials and app settings' },
          { status: 400 }
        );
      }

      const credentials = {
        clientKey,
        clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5), // Hide secret
        accessToken: tokenData.access_token.substring(0, 10) + '...', // Hide token
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        redirectUri: redirectUri || 'https://yoursite.com/api/auth/tiktok/callback',
        connectedAt: new Date().toISOString(),
      };

      console.log('TikTok connection successful');

      return NextResponse.json({
        success: true,
        message: 'Successfully connected to TikTok!',
        credentials,
      });

    } catch (apiError) {
      console.error('TikTok API error:', apiError);
      
      return NextResponse.json(
        { 
          error: `Failed to connect to TikTok: ${apiError.message}. Check your credentials and internet connection.` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
