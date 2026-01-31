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

    console.log('Printful validation: attempting connection...');

    // Test direct API connection with basic auth
    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      // First, try to get stores info
      const response = await fetch('https://api.printful.com/v2/stores', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Printful response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Printful error:', errorData);

        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Invalid Printful credentials. Check your Client ID and Client Secret in Printful Dashboard → Apps → Your App → Credentials' },
            { status: 401 }
          );
        }

        if (response.status === 403) {
          return NextResponse.json(
            { error: 'Access denied. Make sure your app has the correct permissions in Printful' },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: `Printful API error: ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        return NextResponse.json(
          { error: 'No stores found in Printful account. Create a store first in Printful Dashboard' },
          { status: 400 }
        );
      }

      const store = data.data[0];

      const credentials = {
        clientId,
        clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5), // Hide secret
        storeId: store.id,
        storeName: store.name,
        storeEmail: store.created,
        connectedAt: new Date().toISOString(),
      };

      console.log('Printful connection successful:', { storeName: store.name });

      return NextResponse.json({
        success: true,
        message: `Successfully connected to Printful store: ${store.name}!`,
        credentials,
      });

    } catch (apiError) {
      console.error('Printful API error:', apiError);
      
      return NextResponse.json(
        { 
          error: `Failed to connect to Printful: ${apiError.message}. Check your credentials and try again.` 
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
