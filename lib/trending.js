import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchTrendingProducts(userId) {
  try {
    console.log('[Trending] 📥 Fetching integrations for user:', userId);

    // Get integrations from Firestore (client-side with user auth)
    const integrationsRef = collection(db, 'users', userId, 'integrations');
    const snapshot = await getDocs(integrationsRef);

    const integrationsData = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('[Trending] ✅ Found:', doc.id, '- Status:', data?.status);
      integrationsData[doc.id] = data;
    });

    console.log('[Trending] ✅ Loaded integrations:', Object.keys(integrationsData));

    // Filter connected integrations
    const connectedApis = Object.keys(integrationsData).filter(
      key => integrationsData[key]?.status === 'connected'
    );

    const requiredApis = ['printful', 'shopify', 'tiktok'].filter(
      api => !connectedApis.includes(api)
    );

    // Call API route with integrations data
    console.log('[Trending] 📡 Calling /api/trending with integrations...');
    
    const response = await fetch('/api/trending', {
      method: 'GET',
      headers: {
        'x-user-id': userId,
        'x-integrations': JSON.stringify(integrationsData),
        'Content-Type': 'application/json',
      },
    });

    console.log('[Trending] 📊 API response status:', response.status);

    if (!response.ok) {
      console.error('[Trending] ❌ API error:', response.status);
      return {
        success: false,
        products: [],
        connectedApis: [],
        requiredApis: ['printful', 'shopify', 'tiktok'],
        error: `API returned ${response.status}`,
      };
    }

    const data = await response.json();

    console.log('[Trending] ✅ Got', data.products?.length || 0, 'products');

    return {
      success: true,
      products: data.products || [],
      connectedApis: data.connectedApis || [],
      requiredApis: data.requiredApis || [],
      message: data.message,
    };
  } catch (error) {
    console.error('[Trending] 💥 Error:', error.message);
    return {
      success: false,
      products: [],
      connectedApis: [],
      requiredApis: ['printful', 'shopify', 'tiktok'],
      error: error.message,
    };
  }
}
