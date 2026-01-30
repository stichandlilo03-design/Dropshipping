import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  getDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ==================== AUTH FUNCTIONS ====================

export async function registerUser(email, password, storeName) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      storeName: storeName,
      createdAt: new Date().toISOString(),
    });

    console.log('User registered successfully:', user.uid);
    return { success: true, user };
  } catch (error) {
    console.error('Registration error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User logged in successfully:', userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    console.log('User logged out');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error.message);
    return { success: false, error: error.message };
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        callback({
          id: user.uid,
          email: user.email,
          ...userDoc.data()
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

// ==================== FIRESTORE DATABASE CLASS ====================

export class FirestoreDB {
  constructor(userId) {
    this.userId = userId;
  }

  // ========== ORDERS ==========
  async addOrder(order) {
    try {
      const docRef = await addDoc(collection(db, `users/${this.userId}/orders`), {
        ...order,
        userId: this.userId,
        createdAt: new Date().toISOString(),
        profit: (order.amount || 0) - (order.cost || 0),
      });
      return { id: docRef.id, ...order };
    } catch (error) {
      console.error('Error adding order:', error);
      return null;
    }
  }

  async getOrders() {
    try {
      const q = query(collection(db, `users/${this.userId}/orders`));
      const querySnapshot = await getDocs(q);
      const orders = [];
      querySnapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      return orders;
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  async updateOrder(orderId, updates) {
    try {
      if (updates.amount && updates.cost) {
        updates.profit = updates.amount - updates.cost;
      }
      await updateDoc(doc(db, `users/${this.userId}/orders`, orderId), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating order:', error);
      return { success: false };
    }
  }

  async deleteOrder(orderId) {
    try {
      await deleteDoc(doc(db, `users/${this.userId}/orders`, orderId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      return { success: false };
    }
  }

  // ========== PRODUCTS ==========
  async addProduct(product) {
    try {
      const margin = product.price && product.cost 
        ? (((product.price - product.cost) / product.price) * 100).toFixed(1)
        : 0;

      const docRef = await addDoc(collection(db, `users/${this.userId}/products`), {
        ...product,
        userId: this.userId,
        margin: margin,
        createdAt: new Date().toISOString(),
      });
      return { id: docRef.id, ...product, margin };
    } catch (error) {
      console.error('Error adding product:', error);
      return null;
    }
  }

  async getProducts() {
    try {
      const q = query(collection(db, `users/${this.userId}/products`));
      const querySnapshot = await getDocs(q);
      const products = [];
      querySnapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
      });
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async updateProduct(productId, updates) {
    try {
      if (updates.price && updates.cost) {
        updates.margin = (((updates.price - updates.cost) / updates.price) * 100).toFixed(1);
      }
      await updateDoc(doc(db, `users/${this.userId}/products`, productId), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false };
    }
  }

  async deleteProduct(productId) {
    try {
      await deleteDoc(doc(db, `users/${this.userId}/products`, productId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false };
    }
  }

  // ========== SUPPLIERS ==========
  async addSupplier(supplier) {
    try {
      const docRef = await addDoc(collection(db, `users/${this.userId}/suppliers`), {
        ...supplier,
        userId: this.userId,
        status: supplier.status || 'connected',
        createdAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
      });
      return { id: docRef.id, ...supplier };
    } catch (error) {
      console.error('Error adding supplier:', error);
      return null;
    }
  }

  async getSuppliers() {
    try {
      const q = query(collection(db, `users/${this.userId}/suppliers`));
      const querySnapshot = await getDocs(q);
      const suppliers = [];
      querySnapshot.forEach(doc => {
        suppliers.push({ id: doc.id, ...doc.data() });
      });
      return suppliers;
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }

  async updateSupplier(supplierId, updates) {
    try {
      await updateDoc(doc(db, `users/${this.userId}/suppliers`, supplierId), updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false };
    }
  }

  async deleteSupplier(supplierId) {
    try {
      await deleteDoc(doc(db, `users/${this.userId}/suppliers`, supplierId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false };
    }
  }

  // ========== ANALYTICS ==========
  async getAnalytics() {
    try {
      const orders = await this.getOrders();
      const products = await this.getProducts();

      const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
      const totalCost = orders.reduce((sum, o) => sum + (o.cost || 0), 0);

      return {
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        totalProfit: totalProfit,
        totalProducts: products.length,
        avgOrderValue: orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : 0,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0,
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalProducts: 0,
        avgOrderValue: 0,
        profitMargin: 0,
      };
    }
  }

  // ========== SETTINGS ==========
  async saveSettings(settings) {
    try {
      await setDoc(doc(db, `users/${this.userId}/settings/config`), settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false };
    }
  }

  async getSettings() {
    try {
      const docSnap = await getDoc(doc(db, `users/${this.userId}/settings/config`));
      return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }

  // ========== EXPORT/IMPORT DATA ==========
  async exportData() {
    try {
      const orders = await this.getOrders();
      const products = await this.getProducts();
      const suppliers = await this.getSuppliers();
      const settings = await this.getSettings();

      return {
        orders,
        products,
        suppliers,
        settings,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}

export default app;
