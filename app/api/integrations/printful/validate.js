// app/api/integrations/printful/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client ID or Client Secret' },
        { status: 400 }
      );
    }

    console.log('Printful validation: attempting OAuth connection...');

    // Use Printful OAuth endpoint to get access token
    try {
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');

      const tokenResponse = await fetch('https://www.printful.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      console.log('Printful OAuth response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Printful OAuth error:', errorText);

        return NextResponse.json(
          { 
            error: 'Invalid Printful credentials. Check your Client ID and Client Secret in Printful Dashboard → Apps → Your App → Credentials' 
          },
          { status: 401 }
        );
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return NextResponse.json(
          { error: 'No access token received from Printful. Check your credentials and app settings' },
          { status: 400 }
        );
      }

      // Now verify the token by getting store information
      const storeResponse = await fetch('https://api.printful.com/stores', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Printful stores response status:', storeResponse.status);

      if (!storeResponse.ok) {
        const errorText = await storeResponse.text();
        console.error('Printful stores error:', errorText);

        return NextResponse.json(
          { error: 'Failed to verify Printful token. Token may be invalid or expired.' },
          { status: 401 }
        );
      }

      const storesData = await storeResponse.json();

      // Check if we have any stores
      if (!storesData.result || storesData.result.length === 0) {
        return NextResponse.json(
          { 
            error: 'No stores found in your Printful account. Create a store first in Printful Dashboard → Stores' 
          },
          { status: 400 }
        );
      }

      const store = storesData.result[0];

      const credentials = {
        clientId,
        clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5), // Hide secret
        accessToken: tokenData.access_token.substring(0, 10) + '...', // Hide token
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        storeId: store.id,
        storeName: store.name,
        connectedAt: new Date().toISOString(),
      };

      console.log('Printful connection successful:', { storeName: store.name, storeId: store.id });

      return NextResponse.json({
        success: true,
        message: `Successfully connected to Printful store: ${store.name}!`,
        credentials,
      });

    } catch (apiError) {
      console.error('Printful API error:', apiError);
      
      return NextResponse.json(
        { 
          error: `Failed to connect to Printful: ${apiError.message}. Make sure your credentials are correct and try again.` 
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
