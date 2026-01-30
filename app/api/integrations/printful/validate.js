// app/api/integrations/printful/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    // Validate with Printful API
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await fetch('https://api.printful.com/oauth/token/', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Invalid Printful credentials' },
          { status: 401 }
        );
      }

      const tokenData = await response.json();

      // Get store info to verify connection
      const storeResponse = await fetch('https://api.printful.com/v2/stores', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!storeResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to verify store access' },
          { status: 401 }
        );
      }

      const storeData = await storeResponse.json();

      const credentials = {
        clientId,
        clientSecret,
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type,
        expiresIn: tokenData.expires_in,
        storeId: storeData.data?.[0]?.id || null,
        storeName: storeData.data?.[0]?.name || null,
        connectedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: 'Printful connected successfully',
        credentials,
      });
    } catch (error) {
      console.error('Printful validation error:', error);
      return NextResponse.json(
        { error: 'Failed to validate with Printful API' },
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
