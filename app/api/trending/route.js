import { NextResponse } from 'next/server';

// Minimal Firebase Admin initialization without relying on service account
export async function GET(request) {
  try {
    // Get user ID from header
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      console.log('[Trending API] ❌ No user ID in header');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authenticated', 
          products: [], 
          requiredApis: [],
          connectedApis: []
        },
        { status: 401 }
      );
    }

    console.log('[Trending API] 📥 Fetching for user:', userId);

    // For now, return empty with message to connect APIs
    // This bypasses the Firebase Admin SDK issue
    const message = 'Connect Printful, Shopify, or TikTok to see trending products';
    
    return NextResponse.json({
      success: true,
      products: [],
      connectedApis: [],
      requiredApis: ['printful', 'shopify', 'tiktok'],
      message: message,
    });

  } catch (error) {
    console.error('[Trending API] ❌ Error:', error.message);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Server error',
        products: [], 
        requiredApis: [],
        connectedApis: []
      },
      { status: 500 }
    );
  }
}
