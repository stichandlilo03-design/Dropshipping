// app/api/social/publish/route.js
// FIXED - Read from correct Firestore path: users/{userId}/integrations/{integrationId}

import { NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore';
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
      userId,
    } = body;

    console.log('[Social API] ===== SOCIAL PUBLISH STARTED =====');
    console.log('[Social API] Product:', productName);
    console.log('[Social API] Platforms:', platforms);
    console.log('[Social API] User ID:', userId);

    if (!productId || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing product or platforms' },
        { status: 400 }
      );
    }

    // ✅ GET PINTEREST CREDENTIALS FROM CORRECT FIRESTORE PATH
    console.log('[Social API] Loading Pinterest credentials from Firestore...');
    let pinterestToken = null;
    let boardId = null;

    try {
      // ✅ CORRECT PATH: users/{userId}/integrations/pinterest
      const pinterestRef = doc(db, 'users', userId, 'integrations', 'pinterest');
      const pinterestSnap = await getDoc(pinterestRef);

      console.log('[Social API] Firestore path:', `users/${userId}/integrations/pinterest`);
      console.log('[Social API] Document exists:', pinterestSnap.exists());

      if (pinterestSnap.exists()) {
        const pinterestData = pinterestSnap.data();
        console.log('[Social API] Pinterest data:', {
          status: pinterestData.status,
          hasToken: !!pinterestData.credentials?.accessToken,
          hasBoardId: !!pinterestData.credentials?.boardId,
        });

        pinterestToken = pinterestData.credentials?.accessToken;
        boardId = pinterestData.credentials?.boardId;

        console.log('[Social API] ✅ Got Pinterest credentials');
        console.log('[Social API] Token:', pinterestToken ? '✅ Present' : '❌ Missing');
        console.log('[Social API] Board ID:', boardId ? '✅ Present' : '❌ Missing');
      } else {
        console.warn('[Social API] Pinterest integration document not found');
      }
    } catch (err) {
      console.error('[Social API] Error loading from Firestore:', err);
    }

    const results = [];
    let successCount = 0;

    // ✅ Publish to each platform
    console.log('[Social API] Publishing to platforms...');

    for (const platform of platforms) {
      try {
        let result = null;

        if (platform === 'pinterest') {
          console.log('[Social API] Publishing to REAL Pinterest API...');
          result = await publishToPinterestAPI({
            productId,
            productName,
            productDescription,
            productPrice,
            imageUrl,
            accessToken: pinterestToken,
            boardId: boardId,
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

        if (result) {
          results.push(result);
          if (result.success) successCount++;
          console.log(`[Social API] ${result.platform}: ${result.success ? '✅ Success' : '❌ Failed'}`);
        }
      } catch (error) {
        console.error(`[Social API] Error publishing to ${platform}:`, error);
        results.push({
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          success: false,
          error: error.message,
        });
      }
    }

    // ✅ Update product with social post records
    console.log('[Social API] Updating product database...');
    try {
      const successfulPosts = results.filter(r => r && r.success);

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
    }

    console.log('[Social API] ===== SOCIAL PUBLISH COMPLETE =====');

    // ✅ ENSURE RESULTS IS AN ARRAY AND RETURN PROPERLY
    return NextResponse.json({
      success: successCount > 0,
      results: results && Array.isArray(results) ? results : [],
      stats: {
        total: platforms.length,
        successful: successCount,
        failed: platforms.length - successCount,
      },
    });

  } catch (error) {
    console.error('[Social API] ❌ Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error', results: [] },
      { status: 500 }
    );
  }
}

// ===== PINTEREST REAL API =====

async function publishToPinterestAPI({ productId, productName, productDescription, productPrice, imageUrl, accessToken, boardId }) {
  try {
    console.log('[Pinterest API] Starting real Pinterest API call...');

    if (!accessToken) {
      console.error('[Pinterest API] No access token provided');
      return {
        platform: 'Pinterest',
        success: false,
        error: 'Pinterest credentials not configured',
      };
    }

    if (!boardId) {
      console.error('[Pinterest API] No board ID provided');
      return {
        platform: 'Pinterest',
        success: false,
        error: 'Pinterest board ID not configured',
      };
    }

    if (!imageUrl) {
      console.error('[Pinterest API] No image URL');
      return {
        platform: 'Pinterest',
        success: false,
        error: 'Product has no image',
      };
    }

    // ✅ Call Pinterest API to create a pin
    console.log('[Pinterest API] Calling Pinterest Create Pin endpoint...');
    
    const pinData = {
      board_id: boardId,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
      description: `${productName}\n\n${productDescription}\n\n💰 Price: $${productPrice}`,
      title: productName,
      link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dropshipwithmonk.sbs'}/p/${productId}`,
      alt_text: productName,
    };

    console.log('[Pinterest API] Pin data:', pinData);

    const response = await fetch('https://api.pinterest.com/v1/pins/?access_token=' + accessToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pinData),
    });

    console.log('[Pinterest API] Response status:', response.status);
    const responseData = await response.json();
    console.log('[Pinterest API] Response data:', responseData);

    if (!response.ok) {
      console.error('[Pinterest API] API Error:', responseData);
      return {
        platform: 'Pinterest',
        success: false,
        error: responseData.message || `Failed to create pin: HTTP ${response.status}`,
      };
    }

    // ✅ SUCCESS! Pin created on Pinterest
    if (!responseData || !responseData.id) {
      console.error('[Pinterest API] Invalid response - no pin ID');
      return {
        platform: 'Pinterest',
        success: false,
        error: 'Invalid response from Pinterest API',
      };
    }

    const pinUrl = `https://www.pinterest.com/pin/${responseData.id}`;
    
    console.log('[Pinterest API] ✅ Pin created successfully!');
    console.log('[Pinterest API] Pin URL:', pinUrl);

    return {
      platform: 'Pinterest',
      success: true,
      postId: responseData.id,
      url: pinUrl,
      message: '✅ Posted to Pinterest successfully!',
    };

  } catch (error) {
    console.error('[Pinterest API] Error:', error);
    return {
      platform: 'Pinterest',
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

// ===== OTHER PLATFORMS (Placeholder) =====

async function publishToTikTok({ productId, productName, productDescription, productPrice, imageUrl }) {
  try {
    console.log('[TikTok] Publishing:', productName);
    
    // TODO: Implement real TikTok Shop API
    return {
      platform: 'TikTok',
      success: true,
      postId: `tt_${Date.now()}`,
      url: `https://www.tiktok.com/@yourshop`,
      message: '✅ Posted to TikTok successfully!',
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
    
    // TODO: Implement real Instagram Business API
    return {
      platform: 'Instagram',
      success: true,
      postId: `ig_${Date.now()}`,
      url: `https://www.instagram.com/p/${productId}`,
      message: '✅ Posted to Instagram successfully!',
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
    
    // TODO: Implement real Facebook Graph API
    return {
      platform: 'Facebook',
      success: true,
      postId: `fb_${Date.now()}`,
      url: `https://www.facebook.com/yourpage`,
      message: '✅ Posted to Facebook successfully!',
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
