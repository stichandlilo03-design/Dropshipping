// /lib/social-media-automation.js
// Multi-platform social media automation with TikTok, Instagram, Facebook, Pinterest

export class SocialMediaAutomation {
  constructor(credentials) {
    this.tiktok = credentials.tiktok;
    this.instagram = credentials.instagram;
    this.facebook = credentials.facebook;
    this.pinterest = credentials.pinterest;
  }

  // ✅ Generate product caption with AI
  async generateCaption(productData) {
    try {
      const prompt = `
        Create a catchy, engaging social media caption for this product:
        Product: ${productData.name}
        Description: ${productData.description}
        Price: $${productData.price}
        
        Make it trendy, include relevant emojis and hashtags. Keep it under 280 characters for Twitter/Instagram.
      `;

      // If using OpenAI or similar
      const response = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const result = await response.json();
      return result.caption;
    } catch (error) {
      console.error('[Social] Error generating caption:', error);
      return `Check out this amazing product: ${productData.name} 🔥`;
    }
  }

  // ✅ Generate hashtags
  async generateHashtags(productData, platform) {
    try {
      const baseHashtags = [
        '#dropshipping',
        '#ecommerce',
        '#shopping',
        '#trending',
        '#newarrival'
      ];

      const platformHashtags = {
        tiktok: ['#foryoupage', '#viral', '#tiktokshop', '#fyp', '#fy'],
        instagram: ['#instagood', '#instashopping', '#instatrend', '#igshop'],
        facebook: ['#facebook', '#fbshop', '#facebookshop'],
        pinterest: ['#pinterestideas', '#homedecor', '#fashion', '#lifestyle']
      };

      const combined = [...baseHashtags, ...(platformHashtags[platform] || [])];
      return combined.join(' ');
    } catch (error) {
      console.error('[Social] Error generating hashtags:', error);
      return '#shopping #ecommerce #trending';
    }
  }

  // ✅ Format product for TikTok Shop
  async publishToTikTok(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to TikTok Shop:', productData.name);

      if (!this.tiktok?.accessToken) {
        return { success: false, error: 'TikTok not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'tiktok');

      const response = await fetch('https://open.tiktokapis.com/v1/post/publish/action/publish/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tiktok.accessToken}`,
        },
        body: JSON.stringify({
          media_type: 'PHOTO',
          photo_cover_index: 0,
          title: `${caption}\n\n${hashtags}`,
          source: 'CREATIVE_CENTER',
          post_mode: 'STANDARD',
          video_cover_timestamp_ms: 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[Social] TikTok error:', result);
        return { success: false, error: result.error?.message };
      }

      console.log('[Social] ✅ Published to TikTok:', result.data?.publish_id);
      return {
        success: true,
        platform: 'TikTok',
        postId: result.data?.publish_id,
        url: `https://www.tiktok.com/@yourhandle/video/${result.data?.publish_id}`,
      };
    } catch (error) {
      console.error('[Social] TikTok publish error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Format product for Instagram
  async publishToInstagram(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to Instagram:', productData.name);

      if (!this.instagram?.accessToken) {
        return { success: false, error: 'Instagram not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'instagram');

      // Step 1: Upload image
      const uploadResponse = await fetch(
        `https://graph.instagram.com/v18.0/${this.instagram.accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: `${caption}\n\n${hashtags}`,
            access_token: this.instagram.accessToken,
          }),
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        return { success: false, error: uploadData.error?.message };
      }

      // Step 2: Publish
      const publishResponse = await fetch(
        `https://graph.instagram.com/v18.0/${this.instagram.accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: uploadData.id,
            access_token: this.instagram.accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        return { success: false, error: publishData.error?.message };
      }

      console.log('[Social] ✅ Published to Instagram:', publishData.id);
      return {
        success: true,
        platform: 'Instagram',
        postId: publishData.id,
      };
    } catch (error) {
      console.error('[Social] Instagram publish error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Format product for Facebook
  async publishToFacebook(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to Facebook:', productData.name);

      if (!this.facebook?.accessToken) {
        return { success: false, error: 'Facebook not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'facebook');

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.facebook.pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${caption}\n\n${hashtags}`,
            picture: imageUrl,
            link: `/p/${productData.id}`,
            access_token: this.facebook.accessToken,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message };
      }

      console.log('[Social] ✅ Published to Facebook:', result.id);
      return {
        success: true,
        platform: 'Facebook',
        postId: result.id,
      };
    } catch (error) {
      console.error('[Social] Facebook publish error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Format product for Pinterest
  async publishToPinterest(productData, imageUrl) {
    try {
      console.log('[Social] Publishing to Pinterest:', productData.name);

      if (!this.pinterest?.accessToken) {
        return { success: false, error: 'Pinterest not configured' };
      }

      const caption = await this.generateCaption(productData);
      const hashtags = await this.generateHashtags(productData, 'pinterest');

      const response = await fetch(
        `https://api.pinterest.com/v5/pins`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.pinterest.accessToken}`,
          },
          body: JSON.stringify({
            title: productData.name,
            description: `${caption}\n\n${hashtags}`,
            dominant_color: '#FF6B6B',
            media_source: {
              source_type: 'image_url',
              url: imageUrl,
            },
            link: `/p/${productData.id}`,
            board_id: this.pinterest.boardId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.message };
      }

      console.log('[Social] ✅ Published to Pinterest:', result.id);
      return {
        success: true,
        platform: 'Pinterest',
        postId: result.id,
      };
    } catch (error) {
      console.error('[Social] Pinterest publish error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Publish to all selected platforms
  async publishToAll(productData, imageUrl, selectedPlatforms) {
    try {
      console.log('[Social] Publishing to all platforms:', selectedPlatforms);

      const results = [];

      if (selectedPlatforms.includes('tiktok')) {
        const tiktokResult = await this.publishToTikTok(productData, imageUrl);
        results.push(tiktokResult);
      }

      if (selectedPlatforms.includes('instagram')) {
        const instagramResult = await this.publishToInstagram(productData, imageUrl);
        results.push(instagramResult);
      }

      if (selectedPlatforms.includes('facebook')) {
        const facebookResult = await this.publishToFacebook(productData, imageUrl);
        results.push(facebookResult);
      }

      if (selectedPlatforms.includes('pinterest')) {
        const pinterestResult = await this.publishToPinterest(productData, imageUrl);
        results.push(pinterestResult);
      }

      const successful = results.filter(r => r.success).length;
      console.log('[Social] ✅ Published to', successful, '/', results.length, 'platforms');

      return {
        success: successful > 0,
        results,
        message: `Published to ${successful} platform(s)`,
      };
    } catch (error) {
      console.error('[Social] Error publishing to all:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ Schedule post for later
  async schedulePost(productData, imageUrl, platform, scheduleTime) {
    try {
      console.log('[Social] Scheduling post for', platform, 'at', scheduleTime);

      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productData,
          imageUrl,
          platform,
          scheduleTime,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('[Social] Error scheduling post:', error);
      return { success: false, error: error.message };
    }
  }
}

// ✅ Helper to publish product
export async function publishProduct(productId, productData, platforms, credentials) {
  const social = new SocialMediaAutomation(credentials);
  return await social.publishToAll(productData, productData.image, platforms);
}
