import { NextResponse } from 'next/server';
import { db as firebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

export async function GET(request) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('[Printful Trending] ❌ User not authenticated');
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[Printful Trending] 📥 Fetching for user:', user.uid);

    // Get Printful credentials from Firestore
    const integrationRef = doc(
      firebaseDb,
      'users',
      user.uid,
      'integrations',
      'printful'
    );
    
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      console.log('[Printful Trending] ❌ Printful not connected');
      return NextResponse.json(
        { success: false, error: 'Printful not connected', products: [] },
        { status: 200 }
      );
    }

    const { credentials } = integrationDoc.data();
    const apiToken = credentials?.apiToken;

    if (!apiToken) {
      console.log('[Printful Trending] ❌ No API token');
      return NextResponse.json(
        { success: false, error: 'No API token', products: [] },
        { status: 200 }
      );
    }

    console.log('[Printful Trending] 🔄 Calling Printful API...');

    // Call Printful API for trending products
    // Using a realistic endpoint - Printful's catalog products
    const response = await fetch('https://api.v2.printful.com/products', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('[Printful Trending] ❌ Printful API error:', response.status);
      return NextResponse.json(
        { success: false, error: 'Printful API error', products: [] },
        { status: 200 }
      );
    }

    const data = await response.json();
    console.log('[Printful Trending] ✅ Got data from Printful');

    // Format Printful products
    const products = (data.result || []).slice(0, 10).map(product => ({
      id: product.id,
      title: product.title,
      type: product.type_name,
      image: product.image,
      price: product.price || 'N/A',
      supplier: 'Printful',
      url: `https://www.printful.com/products/${product.id}`,
    }));

    return NextResponse.json({
      success: true,
      products: products,
      source: 'Printful API',
    });

  } catch (error) {
    console.error('[Printful Trending] ❌ Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, products: [] },
      { status: 200 }
    );
  }
}
