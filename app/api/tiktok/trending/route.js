import { NextResponse } from 'next/server';
import { db as firebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

export async function GET(request) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('[TikTok Trending] ❌ User not authenticated');
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[TikTok Trending] 📥 Fetching for user:', user.uid);

    // Get TikTok credentials from Firestore
    const integrationRef = doc(
      firebaseDb,
      'users',
      user.uid,
      'integrations',
      'tiktok'
    );
    
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      console.log('[TikTok Trending] ⚠️ TikTok not connected');
      return NextResponse.json(
        { success: false, error: 'TikTok not connected', products: [] },
        { status: 200 }
      );
    }

    const { credentials } = integrationDoc.data();
    const clientKey = credentials?.clientKey;

    if (!clientKey) {
      console.log('[TikTok Trending] ❌ No client key');
      return NextResponse.json(
        { success: false, error: 'No TikTok credentials', products: [] },
        { status: 200 }
      );
    }

    console.log('[TikTok Trending] 🔄 Calling TikTok API...');

    // For now, return mock trending products
    // Full TikTok integration would require OAuth and proper scopes
    const mockProducts = [
      {
        id: 'ttk_1',
        title: 'Trending TikTok Product 1',
        description: 'Viral product from TikTok',
        image: 'https://via.placeholder.com/300x300?text=TikTok+Trending+1',
        views: 1500000,
        supplier: 'TikTok',
        url: 'https://www.tiktok.com/trending',
      },
      {
        id: 'ttk_2',
        title: 'Trending TikTok Product 2',
        description: 'Viral product from TikTok',
        image: 'https://via.placeholder.com/300x300?text=TikTok+Trending+2',
        views: 1200000,
        supplier: 'TikTok',
        url: 'https://www.tiktok.com/trending',
      },
      {
        id: 'ttk_3',
        title: 'Trending TikTok Product 3',
        description: 'Viral product from TikTok',
        image: 'https://via.placeholder.com/300x300?text=TikTok+Trending+3',
        views: 980000,
        supplier: 'TikTok',
        url: 'https://www.tiktok.com/trending',
      },
    ];

    console.log('[TikTok Trending] ✅ Returned mock trending products');

    return NextResponse.json({
      success: true,
      products: mockProducts,
      source: 'TikTok API',
      note: 'Mock data - Full integration requires OAuth',
    });

  } catch (error) {
    console.error('[TikTok Trending] ❌ Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, products: [] },
      { status: 200 }
    );
  }
}
