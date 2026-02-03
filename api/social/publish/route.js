// /api/social/publish/route.js
// COMPLETE social media publishing with all platforms

import { NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SocialMediaAutomation } from '@/lib/integrations';

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

    if (!productId || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing product or platforms' },
        { status: 400 }
      );
    }

    // ✅ STEP 1: Get platform credentials
    console.log('[Social API] Step 1: Loading credentials...');
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

    // ✅ STEP 2: Initialize social media automation
    console.log('[Social API] Step 2: Initializing automation...');
    const social = new SocialMediaAutomation(credentials);

    // ✅ STEP 3: Publish to all selected platforms
    console.log('[Social API] Step 3: Publishing to platforms...');
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

    console.log('[Social API] Publishing results:', publishResults);

    // ✅ STEP 4: Update product with social post records
    console.log('[Social API] Step 4: Updating product database...');
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
          social_post_count: increment(1),
        });
        console.log('[Social API] ✅ Product updated with', successfulPosts.length, 'posts');
      }
    } catch (updateError) {
      console.error('[Social API] Product update error (non-blocking):', updateError);
    }

    // ✅ STEP 5: Log analytics to database
    console.log('[Social API] Step 5: Logging analytics...');
    try {
      const successful = publishResults.results.filter(r => r.success).length;

      // Create/update analytics document
      const analyticsRef = doc(db, 'analytics', 'social_posts');
      await updateDoc(analyticsRef, {
        total_posts: increment(1),
        successful_posts: increment(successful),
        failed_posts: increment(publishResults.results.length - successful),
        last_updated: new Date().toISOString(),
        ...platforms.reduce((acc, platform) => {
          acc[`platform_${platform}_count`] = increment(1);
          return acc;
        }, {}),
      }).catch(async (error) => {
        // If document doesn't exist, create it
        if (error.code === 'not-found') {
          console.log('[Social API] Creating analytics document...');
          const analyticsData = {
            total_posts: 1,
            successful_posts: successful,
            failed_posts: publishResults.results.length - successful,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
          };
          
          platforms.forEach(platform => {
            analyticsData[`platform_${platform}_count`] = 1;
          });

          await addDoc(collection(db, 'analytics'), analyticsData);
        }
      });

      console.log('[Social API] ✅ Analytics logged');
    } catch (analyticsError) {
      console.error('[Social API] Analytics error (non-blocking):', analyticsError);
    }

    console.log('[Social API] ===== SOCIAL PUBLISH COMPLETE =====');

    return NextResponse.json({
      success: publishResults.success,
      results: publishResults.results,
      message: publishResults.message,
      stats: {
        total: publishResults.results.length,
        successful: publishResults.results.filter(r => r.success).length,
        failed: publishResults.results.filter(r => !r.success).length,
      },
    });

  } catch (error) {
    console.error('[Social API] ❌ Fatal error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
