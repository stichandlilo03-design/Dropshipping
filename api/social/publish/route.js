// /api/social/publish/route.js
// Publish product to social media platforms

import { NextResponse } from 'next/server';
import { SocialMediaAutomation } from '@/lib/social-media-automation';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
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

    // Get credentials from environment
    const credentials = {
      tiktok: {
        accessToken: process.env.TIKTOK_ACCESS_TOKEN,
        clientKey: process.env.TIKTOK_CLIENT_KEY,
      },
      instagram: {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
        accountId: process.env.INSTAGRAM_ACCOUNT_ID,
      },
      facebook: {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
        pageId: process.env.FACEBOOK_PAGE_ID,
      },
      pinterest: {
        accessToken: process.env.PINTEREST_ACCESS_TOKEN,
        boardId: process.env.PINTEREST_BOARD_ID,
      },
    };

    // ✅ STEP 1: Initialize social media automation
    console.log('[Social API] Step 1: Initializing automation...');
    const social = new SocialMediaAutomation(credentials);

    // ✅ STEP 2: Publish to selected platforms
    console.log('[Social API] Step 2: Publishing to platforms...');
    const publishResults = await social.publishToAll(
      {
        id: productId,
        name: productName,
        description: productDescription,
        price: productPrice,
        image: imageUrl,
      },
      imageUrl,
      platforms
    );

    // ✅ STEP 3: Update product with social post records
    console.log('[Social API] Step 3: Updating product social posts...');
    try {
      const successfulPosts = publishResults.results.filter(r => r.success);

      if (successfulPosts.length > 0) {
        await updateDoc(doc(db, 'products', productId), {
          socialPosts: arrayUnion({
            timestamp: new Date().toISOString(),
            platforms: successfulPosts.map(p => ({
              platform: p.platform,
              postId: p.postId,
              url: p.url,
            })),
          }),
          last_social_post: new Date().toISOString(),
        });
        console.log('[Social API] ✅ Updated product with social posts');
      }
    } catch (updateError) {
      console.error('[Social API] Error updating product (non-blocking):', updateError);
    }

    // ✅ STEP 4: Log analytics
    console.log('[Social API] Step 4: Logging analytics...');
    try {
      const successful = publishResults.results.filter(r => r.success).length;
      await updateDoc(doc(db, 'analytics', 'social_posts'), {
        total_posts: increment(1),
        [`platform_${platforms[0]}`]: increment(1),
        last_updated: new Date().toISOString(),
      });
      console.log('[Social API] ✅ Analytics logged');
    } catch (analyticsError) {
      console.error('[Social API] Error logging analytics (non-blocking):', analyticsError);
    }

    console.log('[Social API] ===== SOCIAL PUBLISH COMPLETE =====');

    return NextResponse.json({
      success: publishResults.success,
      results: publishResults.results,
      message: publishResults.message,
    });
  } catch (error) {
    console.error('[Social API] ❌ Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
