export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    // Get user ID from query params
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        error: 'Missing userId parameter',
        example: '/api/diagnostic?userId=YOUR_USER_ID_HERE',
        instructions: 'Go to your Firebase console and find your user ID'
      });
    }

    console.log('\n========== DIAGNOSTIC CHECK ==========');
    console.log('User ID:', userId);

    // Fetch integrations from Firebase
    const integrationsRef = collection(db, 'users', userId, 'integrations');
    const integrationsSnap = await getDocs(integrationsRef);

    const integrations = {};
    integrationsSnap.forEach(doc => {
      integrations[doc.id] = doc.data();
    });

    console.log('Found integrations:', Object.keys(integrations));

    // Check Shopify specifically
    const shopifyData = integrations.shopify;
    console.log('\n--- SHOPIFY DETAILS ---');
    console.log('Connected:', shopifyData?.status === 'connected');
    console.log('Store URL:', shopifyData?.credentials?.storeUrl);
    console.log('Token exists:', !!shopifyData?.credentials?.accessToken);
    console.log('Token length:', shopifyData?.credentials?.accessToken?.length);

    // Test Shopify connection
    let shopifyTest = { status: 'not_tested' };
    
    if (shopifyData?.status === 'connected') {
      const storeUrl = shopifyData.credentials.storeUrl;
      const token = shopifyData.credentials.accessToken;

      if (storeUrl && token) {
        const cleanUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const testUrl = `https://${cleanUrl}/admin/api/2025-01/products.json?limit=1`;

        console.log('\nTesting Shopify API...');
        console.log('URL:', testUrl);

        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
          },
        });

        console.log('Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Products found:', data.products?.length || 0);
          shopifyTest = {
            status: 'success',
            httpStatus: 200,
            productsFound: data.products?.length || 0,
            message: `Successfully fetched ${data.products?.length || 0} products`
          };
        } else {
          const errorText = await response.text();
          console.log('Error:', errorText.substring(0, 500));
          shopifyTest = {
            status: 'error',
            httpStatus: response.status,
            errorMessage: errorText.substring(0, 500),
            message: `API returned ${response.status}`
          };
        }
      }
    }

    // Check Printful
    const printfulData = integrations.printful;
    console.log('\n--- PRINTFUL DETAILS ---');
    console.log('Connected:', printfulData?.status === 'connected');
    console.log('Token exists:', !!printfulData?.credentials?.apiToken);
    console.log('Token length:', printfulData?.credentials?.apiToken?.length);

    let printfulTest = { status: 'not_tested' };
    
    if (printfulData?.status === 'connected' && printfulData?.credentials?.apiToken) {
      const token = printfulData.credentials.apiToken;
      const testUrl = 'https://api.v2.printful.com/products/71';

      console.log('\nTesting Printful API...');
      console.log('URL:', testUrl);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        printfulTest = {
          status: 'success',
          httpStatus: 200,
          message: 'Successfully connected to Printful'
        };
      } else {
        printfulTest = {
          status: 'error',
          httpStatus: response.status,
          message: `API returned ${response.status}`
        };
      }
    }

    console.log('\n========== DIAGNOSTIC COMPLETE ==========\n');

    // Return HTML page with results
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>DropBoard Diagnostic</title>
  <style>
    body {
      font-family: monospace;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
      margin: 0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      color: #3b82f6;
      margin-bottom: 20px;
    }
    h2 {
      color: #10b981;
      margin-top: 30px;
      padding-bottom: 10px;
      border-bottom: 2px solid #374151;
    }
    .status {
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      background: #1e293b;
      border-left: 4px solid #3b82f6;
    }
    .status.success {
      border-left-color: #10b981;
      background: #0f3c2f;
    }
    .status.error {
      border-left-color: #ef4444;
      background: #3f1a1a;
    }
    .status.warning {
      border-left-color: #f59e0b;
      background: #3f3015;
    }
    .label {
      color: #94a3b8;
      font-size: 0.9em;
    }
    .value {
      color: #e2e8f0;
      font-weight: bold;
      margin-top: 5px;
    }
    code {
      background: #0f172a;
      padding: 2px 6px;
      border-radius: 3px;
      color: #fbbf24;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 DropBoard Diagnostic Report</h1>
    
    <div class="status">
      <div class="label">User ID:</div>
      <div class="value">${userId}</div>
    </div>

    <h2>📦 Shopify Integration</h2>
    
    <div class="status ${shopifyData?.status === 'connected' ? 'success' : 'error'}">
      <div class="label">Connection Status:</div>
      <div class="value">${shopifyData?.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}</div>
    </div>

    ${shopifyData?.credentials?.storeUrl ? `
    <div class="status">
      <div class="label">Store URL:</div>
      <div class="value">${shopifyData.credentials.storeUrl}</div>
    </div>
    ` : ''}

    ${shopifyData?.credentials?.accessToken ? `
    <div class="status">
      <div class="label">Token Exists:</div>
      <div class="value">✅ Yes (${shopifyData.credentials.accessToken.length} characters)</div>
    </div>
    ` : `
    <div class="status error">
      <div class="label">Token:</div>
      <div class="value">❌ Missing or empty</div>
    </div>
    `}

    <div class="status ${shopifyTest.status === 'success' ? 'success' : shopifyTest.status === 'error' ? 'error' : 'warning'}">
      <div class="label">API Test Result:</div>
      <div class="value">${shopifyTest.message || 'Not tested'}</div>
      ${shopifyTest.httpStatus ? `<div class="label" style="margin-top: 10px;">HTTP Status: ${shopifyTest.httpStatus}</div>` : ''}
      ${shopifyTest.productsFound !== undefined ? `<div class="label" style="margin-top: 10px;">Products Found: ${shopifyTest.productsFound}</div>` : ''}
      ${shopifyTest.errorMessage ? `<div class="label" style="margin-top: 10px; color: #ef4444;">Error: ${shopifyTest.errorMessage}</div>` : ''}
    </div>

    <h2>🏆 Printful Integration</h2>
    
    <div class="status ${printfulData?.status === 'connected' ? 'success' : 'error'}">
      <div class="label">Connection Status:</div>
      <div class="value">${printfulData?.status === 'connected' ? '✅ Connected' : '❌ Not Connected'}</div>
    </div>

    ${printfulData?.credentials?.apiToken ? `
    <div class="status">
      <div class="label">Token Exists:</div>
      <div class="value">✅ Yes (${printfulData.credentials.apiToken.length} characters)</div>
    </div>
    ` : `
    <div class="status error">
      <div class="label">Token:</div>
      <div class="value">❌ Missing or empty</div>
    </div>
    `}

    <div class="status ${printfulTest.status === 'success' ? 'success' : printfulTest.status === 'error' ? 'error' : 'warning'}">
      <div class="label">API Test Result:</div>
      <div class="value">${printfulTest.message || 'Not tested'}</div>
      ${printfulTest.httpStatus ? `<div class="label" style="margin-top: 10px;">HTTP Status: ${printfulTest.httpStatus}</div>` : ''}
    </div>

    <h2>📋 Summary</h2>
    
    <div class="status">
      <div class="label">Can Load Shopify Products:</div>
      <div class="value">${shopifyTest.status === 'success' && shopifyTest.productsFound > 0 ? '✅ YES' : '❌ NO'}</div>
    </div>

    <div class="status">
      <div class="label">Can Load Printful Products:</div>
      <div class="value">${printfulTest.status === 'success' ? '✅ YES' : '❌ NO'}</div>
    </div>

    <h2>🔧 Troubleshooting</h2>
    
    ${shopifyTest.status === 'error' ? `
    <div class="status error">
      <div class="label">⚠️ Shopify Issue Detected:</div>
      <div class="value">
        ${shopifyTest.httpStatus === 401 ? 'Token is invalid or expired. Go to /integrations and reconnect Shopify.' : ''}
        ${shopifyTest.httpStatus === 404 ? 'Store URL is wrong. Check Firebase for correct format: dropshipwithmonk.myshopify.com (no https://, no trailing /)' : ''}
        ${shopifyTest.httpStatus === 200 && shopifyTest.productsFound === 0 ? 'Shopify returned 0 products. Check if your store has published products.' : ''}
      </div>
    </div>
    ` : ''}

    ${shopifyData?.credentials?.storeUrl?.includes('https://') || shopifyData?.credentials?.storeUrl?.endsWith('/') ? `
    <div class="status warning">
      <div class="label">⚠️ Store URL Format Issue:</div>
      <div class="value">
        Current: ${shopifyData.credentials.storeUrl}<br>
        Should be: dropshipwithmonk.myshopify.com (no https://, no trailing /)<br>
        Go to /integrations and reconnect Shopify
      </div>
    </div>
    ` : ''}

  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
