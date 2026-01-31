// app/api/integrations/printful/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    console.log('===== PRINTFUL VALIDATION START =====');
    console.log('Received:', { clientId: clientId ? 'YES' : 'NO', clientSecret: clientSecret ? 'YES' : 'NO' });

    if (!clientId || !clientSecret) {
      console.error('Missing credentials');
      return NextResponse.json(
        { error: 'Missing Client ID or Client Secret' },
        { status: 400 }
      );
    }

    // Step 1: Get OAuth Token
    console.log('Step 1: Requesting OAuth token from https://www.printful.com/oauth/token');

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    let tokenResponse;
    try {
      tokenResponse = await fetch('https://www.printful.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      console.log('OAuth Response Status:', tokenResponse.status);
      console.log('OAuth Response Headers:', {
        contentType: tokenResponse.headers.get('content-type'),
        contentLength: tokenResponse.headers.get('content-length'),
      });

      // Get raw text first
      const responseText = await tokenResponse.text();
      console.log('OAuth Raw Response:', responseText.substring(0, 200)); // First 200 chars

      if (!tokenResponse.ok) {
        console.error('OAuth failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          responseText: responseText,
        });

        return NextResponse.json(
          { 
            error: `Printful OAuth failed: ${tokenResponse.status} ${tokenResponse.statusText}. Invalid Client ID or Client Secret.` 
          },
          { status: 401 }
        );
      }

      // Try to parse JSON
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
        console.log('OAuth Token received successfully');
      } catch (parseError) {
        console.error('Failed to parse OAuth response as JSON:', parseError);
        console.error('Response text:', responseText);
        
        return NextResponse.json(
          { 
            error: `Printful OAuth returned invalid data. Response: ${responseText.substring(0, 100)}` 
          },
          { status: 500 }
        );
      }

      if (!tokenData.access_token) {
        console.error('No access_token in response:', tokenData);
        
        return NextResponse.json(
          { 
            error: 'Printful did not return access token. Check credentials.' 
          },
          { status: 400 }
        );
      }

      const accessToken = tokenData.access_token;
      console.log('Access Token acquired:', accessToken.substring(0, 10) + '...');

      // Step 2: Verify token with stores endpoint
      console.log('Step 2: Verifying token by calling /stores endpoint');

      let storeResponse;
      try {
        storeResponse = await fetch('https://api.printful.com/stores', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Stores API Response Status:', storeResponse.status);

        const storeResponseText = await storeResponse.text();
        console.log('Stores API Raw Response:', storeResponseText.substring(0, 200));

        if (!storeResponse.ok) {
          console.error('Stores API failed:', {
            status: storeResponse.status,
            statusText: storeResponse.statusText,
            responseText: storeResponseText,
          });

          return NextResponse.json(
            { 
              error: `Printful API error: ${storeResponse.status}. Token may be invalid or expired.` 
            },
            { status: 401 }
          );
        }

        // Try to parse stores response
        let storesData;
        try {
          storesData = JSON.parse(storeResponseText);
          console.log('Stores data parsed successfully');
        } catch (parseError) {
          console.error('Failed to parse stores response as JSON:', parseError);
          console.error('Response text:', storeResponseText);
          
          return NextResponse.json(
            { 
              error: `Printful API returned invalid data: ${storeResponseText.substring(0, 100)}` 
            },
            { status: 500 }
          );
        }

        // Check if we have stores
        if (!storesData.result || !Array.isArray(storesData.result) || storesData.result.length === 0) {
          console.error('No stores in response:', storesData);

          return NextResponse.json(
            { 
              error: 'No stores found in your Printful account. Create a store in Printful Dashboard → Stores → Create Store' 
            },
            { status: 400 }
          );
        }

        const store = storesData.result[0];
        console.log('Store found:', { id: store.id, name: store.name });

        // Step 3: Success!
        console.log('===== PRINTFUL VALIDATION SUCCESS =====');

        const credentials = {
          clientId,
          clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5),
          accessToken: accessToken.substring(0, 10) + '...',
          tokenType: tokenData.token_type || 'Bearer',
          expiresIn: tokenData.expires_in,
          storeId: store.id,
          storeName: store.name,
          connectedAt: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          message: `Successfully connected to Printful store: ${store.name}!`,
          credentials,
        });

      } catch (storeError) {
        console.error('Stores API fetch error:', storeError);
        
        return NextResponse.json(
          { 
            error: `Failed to verify with Printful API: ${storeError.message}` 
          },
          { status: 500 }
        );
      }

    } catch (oauthError) {
      console.error('OAuth fetch error:', oauthError);
      
      return NextResponse.json(
        { 
          error: `Failed to connect to Printful OAuth: ${oauthError.message}` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('===== VALIDATION FATAL ERROR =====', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
