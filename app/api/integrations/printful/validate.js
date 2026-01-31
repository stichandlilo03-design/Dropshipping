// app/api/integrations/printful/validate.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    const { clientId, clientSecret } = data;

    console.log('===== PRINTFUL VALIDATION START =====');
    console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'MISSING');
    console.log('Client Secret length:', clientSecret ? clientSecret.length : 'MISSING');

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing Client ID or Client Secret' },
        { status: 400 }
      );
    }

    // Printful uses Basic Auth, not form-encoded OAuth
    // Create Base64 encoded credentials
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    console.log('Encoded credentials created for Basic Auth');
    console.log('Attempting API call with Basic Auth...');

    // Method 1: Try with Basic Auth (most likely)
    try {
      const response = await fetch('https://api.printful.com/stores', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/json',
          'User-Agent': 'DropBoard/1.0',
        },
      });

      console.log('API Response Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));

      // Get raw text first
      const responseText = await response.text();
      console.log('Response Length:', responseText.length);
      console.log('Response First 300 chars:', responseText.substring(0, 300));

      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        console.error('Empty response from Printful API');
        
        return NextResponse.json(
          { 
            error: 'Printful API returned empty response. This usually means invalid credentials or the app needs to be set up differently.' 
          },
          { status: 401 }
        );
      }

      // Try to parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Response parsed as JSON successfully');
      } catch (parseError) {
        console.error('Failed to parse as JSON:', parseError.message);
        console.error('Response was:', responseText);
        
        // Check if it's HTML (error page)
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          return NextResponse.json(
            { 
              error: 'Printful returned an error page. This usually means the app is not properly authenticated. Make sure your Client ID and Secret are correct.' 
            },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { 
            error: `Invalid response from Printful: ${responseText.substring(0, 100)}` 
          },
          { status: 500 }
        );
      }

      // Check response status
      if (!response.ok) {
        console.error('API returned error status:', {
          status: response.status,
          result: result,
        });

        let errorMessage = 'Invalid credentials';
        
        if (result.error) {
          errorMessage = result.error;
        } else if (result.result && typeof result.result === 'string') {
          errorMessage = result.result;
        }

        return NextResponse.json(
          { 
            error: `Printful API Error: ${errorMessage}` 
          },
          { status: response.status }
        );
      }

      // Printful returns { code, result }
      if (result.code !== 200) {
        console.error('Printful returned non-200 code:', result.code);
        
        return NextResponse.json(
          { 
            error: `Printful Error (${result.code}): ${result.result || 'Unknown error'}` 
          },
          { status: 400 }
        );
      }

      // Check if we have stores
      if (!result.result || !Array.isArray(result.result) || result.result.length === 0) {
        console.error('No stores in result:', result);

        return NextResponse.json(
          { 
            error: 'No stores found. Create a store in Printful Dashboard first.' 
          },
          { status: 400 }
        );
      }

      const store = result.result[0];
      console.log('✅ Store found:', { id: store.id, name: store.name });
      console.log('===== PRINTFUL VALIDATION SUCCESS =====');

      const credentials = {
        clientId,
        clientSecret: clientSecret.substring(0, 5) + '...' + clientSecret.substring(-5),
        storeId: store.id,
        storeName: store.name,
        connectedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message: `✅ Successfully connected to Printful store: ${store.name}!`,
        credentials,
      });

    } catch (apiError) {
      console.error('API Call Error:', apiError.message);
      console.error('Error stack:', apiError.stack);

      return NextResponse.json(
        { 
          error: `Failed to connect to Printful API: ${apiError.message}. Check your Client ID and Secret.` 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('===== FATAL ERROR =====', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
