import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

// Validate coupon code
export async function validateCoupon(code, orderTotal = 0) {
  try {
    const q = query(
      collection(db, 'coupons'),
      where('code', '==', code.toUpperCase())
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { valid: false, error: 'Coupon not found' };
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = couponDoc.data();

    // Check if active
    if (coupon.status !== 'active') {
      return { valid: false, error: 'Coupon is not active' };
    }

    // Check expiry
    const now = new Date();
    const startDate = new Date(coupon.start_date);
    const endDate = new Date(coupon.end_date);

    if (now < startDate || now > endDate) {
      return { valid: false, error: 'Coupon is expired' };
    }

    // Check usage limit
    if (coupon.current_uses >= coupon.max_uses) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }

    // Check minimum purchase
    if (orderTotal < coupon.min_purchase) {
      return { 
        valid: false, 
        error: `Minimum purchase of $${coupon.min_purchase} required` 
      };
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.type === 'percentage') {
      discountAmount = (orderTotal * coupon.value) / 100;
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'free_shipping') {
      discountAmount = 10; // Standard shipping
    }

    return {
      valid: true,
      coupon: {
        id: couponDoc.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: discountAmount
      }
    };

  } catch (error) {
    console.error('Error validating coupon:', error);
    return { valid: false, error: error.message };
  }
}

// Use coupon (increment usage)
export async function useCoupon(couponId) {
  try {
    await updateDoc(doc(db, 'coupons', couponId), {
      current_uses: increment(1)
    });
    return { success: true };
  } catch (error) {
    console.error('Error using coupon:', error);
    return { success: false, error: error.message };
  }
}

// Get all active coupons
export async function getActiveCoupons() {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'coupons'),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    const coupons = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const endDate = new Date(data.end_date);
      
      if (endDate > now) {
        coupons.push({ id: doc.id, ...data });
      }
    });

    return coupons;
  } catch (error) {
    console.error('Error getting active coupons:', error);
    return [];
  }
}

// Get coupon by ID
export async function getCouponById(couponId) {
  try {
    const couponDoc = await getDoc(doc(db, 'coupons', couponId));
    if (couponDoc.exists()) {
      return { id: couponDoc.id, ...couponDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting coupon:', error);
    return null;
  }
}

// Calculate coupon discount
export async function calculateDiscount(couponCode, orderTotal) {
  try {
    const result = await validateCoupon(couponCode, orderTotal);
    
    if (!result.valid) {
      return { discount: 0, error: result.error };
    }

    return { discount: result.coupon.discount, error: null };
  } catch (error) {
    console.error('Error calculating discount:', error);
    return { discount: 0, error: error.message };
  }
}

// Get coupon statistics
export async function getCouponStats(couponId) {
  try {
    const coupon = await getCouponById(couponId);
    
    if (!coupon) {
      return null;
    }

    return {
      code: coupon.code,
      uses: coupon.current_uses,
      limit: coupon.max_uses,
      remaining: coupon.max_uses - coupon.current_uses,
      usage_rate: ((coupon.current_uses / coupon.max_uses) * 100).toFixed(1) + '%'
    };
  } catch (error) {
    console.error('Error getting coupon stats:', error);
    return null;
  }
}
