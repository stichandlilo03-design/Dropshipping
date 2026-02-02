import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Track page view
export async function trackPageView(productId, source = 'direct') {
  try {
    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = doc(db, 'analytics', today);
    
    const analyticsDoc = await getDoc(analyticsRef);
    
    if (analyticsDoc.exists()) {
      const data = analyticsDoc.data();
      data.page_views = (data.page_views || 0) + 1;
      await setDoc(analyticsRef, data);
    } else {
      await setDoc(analyticsRef, {
        date: today,
        page_views: 1,
        add_to_cart: 0,
        checkout_initiated: 0,
        purchases: 0,
        revenue: 0,
        by_product: { [productId]: { views: 1 } },
        by_source: { [source]: 1 },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
}

// Track add to cart
export async function trackAddToCart(productId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = doc(db, 'analytics', today);
    
    const analyticsDoc = await getDoc(analyticsRef);
    
    if (analyticsDoc.exists()) {
      const data = analyticsDoc.data();
      data.add_to_cart = (data.add_to_cart || 0) + 1;
      await setDoc(analyticsRef, data);
    }
  } catch (error) {
    console.error('Error tracking add to cart:', error);
  }
}

// Track purchase
export async function trackPurchase(orderId, amount, items) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = doc(db, 'analytics', today);
    
    const analyticsDoc = await getDoc(analyticsRef);
    const byProduct = {};
    
    items.forEach(item => {
      byProduct[item.productId] = {
        views: 0,
        purchases: (byProduct[item.productId]?.purchases || 0) + 1,
        revenue: (byProduct[item.productId]?.revenue || 0) + (item.price * item.quantity)
      };
    });

    if (analyticsDoc.exists()) {
      const data = analyticsDoc.data();
      data.purchases = (data.purchases || 0) + 1;
      data.revenue = (data.revenue || 0) + amount;
      await setDoc(analyticsRef, data);
    }
  } catch (error) {
    console.error('Error tracking purchase:', error);
  }
}

// Calculate conversion rate
export async function getConversionRate(days = 30) {
  try {
    let totalViews = 0;
    let totalPurchases = 0;

    // Get analytics for last N days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const analyticsDoc = await getDoc(doc(db, 'analytics', dateStr));
      
      if (analyticsDoc.exists()) {
        const data = analyticsDoc.data();
        totalViews += data.page_views || 0;
        totalPurchases += data.purchases || 0;
      }
    }

    if (totalViews === 0) return 0;
    return ((totalPurchases / totalViews) * 100).toFixed(2);
  } catch (error) {
    console.error('Error calculating conversion rate:', error);
    return 0;
  }
}

// Calculate average customer lifetime value
export async function getAverageCLV() {
  try {
    const q = query(collection(db, 'customers'));
    const querySnapshot = await getDocs(q);
    
    let totalCLV = 0;
    let count = 0;

    querySnapshot.forEach(doc => {
      const data = doc.data();
      totalCLV += data.clv || data.total_spent || 0;
      count++;
    });

    return count > 0 ? (totalCLV / count).toFixed(2) : 0;
  } catch (error) {
    console.error('Error calculating average CLV:', error);
    return 0;
  }
}

// Get analytics summary
export async function getAnalyticsSummary(days = 30) {
  try {
    let summary = {
      page_views: 0,
      add_to_cart: 0,
      checkout_initiated: 0,
      purchases: 0,
      revenue: 0,
      conversion_rate: 0,
      avg_clv: 0
    };

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const analyticsDoc = await getDoc(doc(db, 'analytics', dateStr));
      
      if (analyticsDoc.exists()) {
        const data = analyticsDoc.data();
        summary.page_views += data.page_views || 0;
        summary.add_to_cart += data.add_to_cart || 0;
        summary.purchases += data.purchases || 0;
        summary.revenue += data.revenue || 0;
      }
    }

    summary.conversion_rate = summary.page_views > 0
      ? ((summary.purchases / summary.page_views) * 100).toFixed(2)
      : 0;

    summary.avg_clv = await getAverageCLV();

    return summary;
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    return null;
  }
}
