import { 
  doc, 
  getDoc, 
  getDocs,
  collection, 
  query, 
  where,
  updateDoc,
  increment 
} from 'firebase/firestore';
import { db } from './firebase';

// Get customer by ID
export async function getCustomerById(customerId) {
  try {
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (customerDoc.exists()) {
      return { id: customerDoc.id, ...customerDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting customer:', error);
    return null;
  }
}

// Get customer by email
export async function getCustomerByEmail(email) {
  try {
    const q = query(collection(db, 'customers'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting customer by email:', error);
    return null;
  }
}

// Update customer profile
export async function updateCustomerProfile(customerId, updates) {
  try {
    await updateDoc(doc(db, 'customers', customerId), updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
}

// Add to wishlist
export async function addToWishlist(customerId, productId) {
  try {
    const customer = await getCustomerById(customerId);
    if (!customer) return { success: false, error: 'Customer not found' };

    const wishlist = customer.wishlist || [];
    if (!wishlist.includes(productId)) {
      wishlist.push(productId);
      await updateDoc(doc(db, 'customers', customerId), { wishlist });
    }
    return { success: true };
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return { success: false, error: error.message };
  }
}

// Remove from wishlist
export async function removeFromWishlist(customerId, productId) {
  try {
    const customer = await getCustomerById(customerId);
    if (!customer) return { success: false, error: 'Customer not found' };

    const wishlist = (customer.wishlist || []).filter(id => id !== productId);
    await updateDoc(doc(db, 'customers', customerId), { wishlist });
    return { success: true };
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return { success: false, error: error.message };
  }
}

// Get customer CLV (Customer Lifetime Value)
export async function getCustomerCLV(customerId) {
  try {
    const customer = await getCustomerById(customerId);
    if (!customer) return 0;
    return customer.clv || customer.total_spent || 0;
  } catch (error) {
    console.error('Error getting customer CLV:', error);
    return 0;
  }
}

// Update customer spending
export async function updateCustomerSpending(customerId, amount) {
  try {
    await updateDoc(doc(db, 'customers', customerId), {
      total_spent: increment(amount),
      clv: increment(amount),
      last_purchase: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating customer spending:', error);
    return { success: false, error: error.message };
  }
}

// Search customers
export async function searchCustomers(searchTerm) {
  try {
    const q = query(collection(db, 'customers'));
    const querySnapshot = await getDocs(q);
    
    const results = [];
    const searchLower = searchTerm.toLowerCase();

    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (
        data.email.toLowerCase().includes(searchLower) ||
        data.firstName.toLowerCase().includes(searchLower) ||
        data.lastName.toLowerCase().includes(searchLower)
      ) {
        results.push({ id: doc.id, ...data });
      }
    });

    return results;
  } catch (error) {
    console.error('Error searching customers:', error);
    return [];
  }
}

// Get customer order count
export async function getCustomerOrderCount(customerId) {
  try {
    const customer = await getCustomerById(customerId);
    return customer?.order_count || 0;
  } catch (error) {
    console.error('Error getting order count:', error);
    return 0;
  }
}
