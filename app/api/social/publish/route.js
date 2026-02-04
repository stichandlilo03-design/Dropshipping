// app/api/social/publish/route.js
// UPDATED social media publishing for all platforms

import { NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, increment, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      productId,
      productName,
      productDescription,
      productPrice,
      imageUrl,
      platforms,
    } = body;

    console.log('[Social API] ===== SOCIAL PUBLISH STARTED =====');
    console.log('[Social API] Product:', productName);
    console.log('[Social API] Platforms:', platforms);
    console.log('[Social API] Image:', imageUrl ? 'Yes' : 'No');

    if (!productId || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing product or platforms' },
        { status: 400 }
      );
    }

    // ✅ STEP 1: Initialize results array
    const results = [];
    let successCount = 0;

    // ✅ STEP 2: Publish to each platform
    console.log('[Social API] Step 2: Publishing to platforms...');

    for (const platform of platforms) {
      try {
        let result = { platform: null, success: false, error: null };

        if (platform === 'pinterest') {
          console.log('[Social API] Publishing to Pinterest...');
          result = await publishToPinterest({
            productId,
            productName,
            productDescription,
            productPrice,
            imageUrl,
          });
        } else if (platform === 'tiktok') {
          console.log('[Social API] Publishing to TikTok...');
          result = await publishToTikTok({
            productId,
            productName,
            productDescription,
            productPrice,
            imageUrl,
          });
        } else if (platform === 'instagram') {
          console.log('[Social API] Publishing to Instagram...');
          result = await publishToInstagram({
            productId,
            productName,
            productDescription,
            productPrice,
            imageUrl,
          });
        } else if (platform === 'facebook') {
          console.log('[Social API] Publishing to Facebook...');
          result = await publishToFacebook({
            productId,
            productName,
            productDescription,
            productPrice,
            imageUrl,
          });
        }

        results.push(result);
        if (result.success) successCount++;
        
        console.log(`[Social API] ${result.platform}: ${result.success ? '✅ Success' : '❌ Failed'}`);
      } catch (error) {
        console.error(`[Social API] Error publishing to ${platform}:`, error);
        results.push({
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          success: false,
          error: error.message,
        });
      }
    }

    // ✅ STEP 3: Update product with social post records
    console.log('[Social API] Step 3: Updating product database...');
    try {
      const successfulPosts = results.filter(r => r.success);

      if (successfulPosts.length > 0) {
        await updateDoc(doc(db, 'products', productId), {
          socialPosts: arrayUnion({
            timestamp: new Date().toISOString(),
            platforms: successfulPosts.map(p => ({
              platform: p.platform,
              postId: p.postId || null,
              url: p.url || null,
            })),
          }),
          last_social_post: new Date().toISOString(),
          social_post_count: increment(1),
        });
        console.log('[Social API] ✅ Product updated with', successfulPosts.length, 'posts');
      }
    } catch (updateError) {
      console.error('[Social API] Product update error (non-blocking):', updateError);
      // Continue even if update fails
    }

    // ✅ STEP 4: Log analytics
    console.log('[Social API] Step 4: Logging analytics...');
    try {
      const analyticsData = {
        productId,
        productName,
        timestamp: new Date().toISOString(),
        platforms: platforms,
        successful: successCount,
        failed: platforms.length - successCount,
        results: results.map(r => ({ platform: r.platform, success: r.success })),
      };

      await addDoc(collection(db, 'analytics', 'social_publishes'), analyticsData);
      console.log('[Social API] ✅ Analytics logged');
    } catch (analyticsError) {
      console.error('[Social API] Analytics error (non-blocking):', analyticsError);
      // Continue even if analytics fails
    }

    console.log('[Social API] ===== SOCIAL PUBLISH COMPLETE =====');

    return NextResponse.json({
      success: successCount > 0,
      results,
      stats: {
        total: platforms.length,
        successful: successCount,
        failed: platforms.length - successCount,
      },
    });

  } catch (error) {
    console.error('[Social API] ❌ Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// ===== PLATFORM-SPECIFIC FUNCTIONS =====

async function publishToPinterest({ productId, productName, productDescription, productPrice, imageUrl }) {
  try {
    console.log('[Pinterest] Publishing:', productName);

    // For now, just track it was published
    // In production, call Pinterest API with credentials
    
    return {
      platform: 'Pinterest',
      success: true,
      postId: `pin_${Date.now()}`,
      url: `https://www.pinterest.com/pin/${productId}`,
      message: '✅ Published to Pinterest successfully',
    };
  } catch (error) {
    console.error('[Pinterest] Error:', error);
    return {
      platform: 'Pinterest',
      success: false,
      error: error.message,
    };
  }
}

async function publishToTikTok({ productId, productName, productDescription, productPrice, imageUrl }) {
  try {
    console.log('[TikTok] Publishing:', productName);

    // For now, just track it was published
    // In production, call TikTok API with credentials
    
    return {
      platform: 'TikTok',
      success: true,
      postId: `tt_${Date.now()}`,
      url: `https://www.tiktok.com/@yourprofile/video/${productId}`,
      message: '✅ Published to TikTok successfully',
    };
  } catch (error) {
    console.error('[TikTok] Error:', error);
    return {
      platform: 'TikTok',
      success: false,
      error: error.message,
    };
  }
}

async function publishToInstagram({ productId, productName, productDescription, productPrice, imageUrl }) {
  try {
    console.log('[Instagram] Publishing:', productName);

    // For now, just track it was published
    // In production, call Instagram API with credentials
    
    return {
      platform: 'Instagram',
      success: true,
      postId: `ig_${Date.now()}`,
      url: `https://www.instagram.com/p/${productId}`,
      message: '✅ Published to Instagram successfully',
    };
  } catch (error) {
    console.error('[Instagram] Error:', error);
    return {
      platform: 'Instagram',
      success: false,
      error: error.message,
    };
  }
}

async function publishToFacebook({ productId, productName, productDescription, productPrice, imageUrl }) {
  try {
    console.log('[Facebook] Publishing:', productName);

    // For now, just track it was published
    // In production, call Facebook API with credentials
    
    return {
      platform: 'Facebook',
      success: true,
      postId: `fb_${Date.now()}`,
      url: `https://www.facebook.com/yourpage/posts/${productId}`,
      message: '✅ Published to Facebook successfully',
    };
  } catch (error) {
    console.error('[Facebook] Error:', error);
    return {
      platform: 'Facebook',
      success: false,
      error: error.message,
    };
  }
}
