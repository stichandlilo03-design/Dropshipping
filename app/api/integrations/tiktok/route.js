import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientKey, clientSecret } = data;

    console.log('TikTok validation request received');

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client Key or Client Secret' },
        { status: 400 }
      );
    }

    console.log('Exchanging TikTok credentials for access token...');

    // Get access token
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', clientKey);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('grant_type', 'client_credentials');

    const tokenResponse = await fetch('https://open.tiktokapis.com/v1/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    console.log('Token response status:', tokenResponse.status);

    const tokenText = await tokenResponse.text();

    if (!tokenText || tokenText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Empty response from TikTok' },
        { status: 401 }
      );
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('Parse error:', e);
      return NextResponse.json(
        { error: 'Invalid response from TikTok' },
        { status: 500 }
      );
    }

    if (!tokenResponse.ok) {
      console.error('TikTok OAuth error:', tokenData);
      
      let errorMsg = 'OAuth failed';
      if (tokenData.error) {
        errorMsg = tokenData.error;
      } else if (tokenData.error_description) {
        errorMsg = tokenData.error_description;
      } else if (tokenData.message) {
        errorMsg = tokenData.message;
      }

      return NextResponse.json(
        { error: `TikTok Error: ${errorMsg}` },
        { status: tokenResponse.status }
      );
    }

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return NextResponse.json(
        { error: 'No access token received from TikTok' },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;
    console.log('✅ Access token acquired');

    // Verify token works by getting user info
    const userResponse = await fetch('https://open.tiktokapis.com/v1/user/info/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('User info response status:', userResponse.status);

    const userText = await userResponse.text();

    if (!userText || userText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not verify TikTok token' },
        { status: 401 }
      );
    }

    let userData;
    try {
      userData = JSON.parse(userText);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid response from TikTok user endpoint' },
        { status: 500 }
      );
    }

    if (!userResponse.ok) {
      console.error('User info error:', userData);
      return NextResponse.json(
        { error: `TikTok Error: Could not verify account` },
        { status: userResponse.status }
      );
    }

    console.log('✅ TikTok account verified');

    return NextResponse.json({
      success: true,
      message: `✅ Successfully connected to TikTok!`,
      credentials: {
        clientKey,
        clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5),
        accessToken: accessToken.substring(0, 10) + '...',
        connectedAt: new Date().toISOString(),
      },
    });

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
