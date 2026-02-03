'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const isCheckout = searchParams.get('checkout') === 'true';
  const urlEmail = searchParams.get('email');

  useEffect(() => {
    if (urlEmail) {
      setEmail(decodeURIComponent(urlEmail));
    }

    const customerData = localStorage.getItem('customer');
    if (customerData) {
      console.log('[Login] Already logged in as customer, redirecting...');
      if (isCheckout) {
        router.push('/checkout');
      } else {
        router.push('/customer/account');
      }
      return;
    }

    setPageLoading(false);
  }, [isCheckout, urlEmail, router]);

  // Function to sync cart from Firestore
  const syncCartFromFirestore = async (userId) => {
    try {
      const cartDocRef = doc(db, 'customers', userId, 'cart', 'items');
      const cartSnap = await getDoc(cartDocRef);

      if (cartSnap.exists()) {
        const cartData = cartSnap.data();
        const items = cartData.items || [];

        if (items.length > 0) {
          console.log('[Login] Syncing cart from Firestore:', items);
          localStorage.setItem('cart', JSON.stringify(items));
          return items;
        } else {
          console.log('[Login] Cart in Firestore is empty (user cleared it)');
          localStorage.removeItem('cart');
        }
      } else {
        console.log('[Login] No cart found in Firestore');
        localStorage.removeItem('cart');
      }
    } catch (err) {
      console.error('[Login] Error syncing cart from Firestore:', err);
    }
    return [];
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('[Login] ===== CUSTOMER LOGIN STARTED =====');
      console.log('[Login] Attempting login with:', email);

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('[Login] User signed in:', user.uid);

      // ✅ STEP 1: CHECK IF USER IS IN CUSTOMERS COLLECTION
      console.log('[Login] Step 1: Checking if user is in customers collection...');
      const customerRef = doc(db, 'customers', user.uid);
      const customerSnap = await getDoc(customerRef);

      if (!customerSnap.exists()) {
        console.error('[Login] ❌ User NOT found in customers collection - this is an admin account!');
        setError('❌ This account is registered as an ADMIN, not a customer.\n\nPlease use the admin login page.');
        setLoading(false);
        return;
      }

      console.log('[Login] ✅ User confirmed in customers collection');

      // Get user token
      const token = await user.getIdToken();
      console.log('[Login] Token obtained');

      // ✅ STEP 2: GET CUSTOMER DATA
      let customerData = customerSnap.data();
      console.log('[Login] Step 2: Customer data from Firestore:', customerData);

      // Ensure email is always set
      if (!customerData.email || customerData.email === '') {
        customerData.email = user.email;
      }

      console.log('[Login] Step 3: Final customer data:', customerData);

      // ✅ STEP 3: UPDATE FIRESTORE WITH COMPLETE DATA
      try {
        const dataToSet = {
          id: user.uid,
          uid: user.uid,
          email: customerData.email || user.email,
          firstName: customerData.firstName || 'Customer',
          lastName: customerData.lastName || '',
          phone: customerData.phone || '',
          updatedAt: new Date().toISOString(),
        };

        // Only add createdAt if new
        if (!customerSnap.exists()) {
          dataToSet.createdAt = new Date().toISOString();
          dataToSet.wishlist = [];
        }

        await setDoc(customerRef, dataToSet, { merge: true });
        console.log('[Login] ✅ Saved to Firestore:', dataToSet);
      } catch (firestoreError) {
        console.error('[Login] Firestore error:', firestoreError);
      }

      // ✅ STEP 4: CLEAR ADMIN DATA FIRST
      console.log('[Login] Step 4: Clearing admin data...');
      localStorage.removeItem('admin');
      localStorage.removeItem('adminToken');
      console.log('[Login] ✅ Admin data cleared');

      // ✅ STEP 5: SET CUSTOMER DATA IN LOCALSTORAGE
      console.log('[Login] Step 5: Setting customer data in localStorage...');
      const customer = {
        id: user.uid,
        email: customerData.email || user.email,
        firstName: customerData.firstName || 'Customer',
        lastName: customerData.lastName || '',
        phone: customerData.phone || '',
      };

      localStorage.setItem('customer', JSON.stringify(customer));
      localStorage.setItem('customerToken', token);
      console.log('[Login] ✅ Customer data saved to localStorage:', customer);

      // ✅ STEP 6: SYNC CART
      console.log('[Login] Step 6: Syncing cart from Firestore...');
      await syncCartFromFirestore(user.uid);
      console.log('[Login] ✅ Cart synced');

      setLoading(false);

      // ✅ STEP 7: REDIRECT
      if (isCheckout) {
        console.log('[Login] ✅ Redirecting to checkout...');
        router.push('/checkout');
      } else {
        console.log('[Login] ✅ Redirecting to customer account...');
        router.push('/customer/account');
      }
      
      console.log('[Login] ===== CUSTOMER LOGIN COMPLETE =====');
    } catch (err) {
      console.error('[Login] ❌ Error:', err);
      setLoading(false);
      
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Customer Sign In</p>
          {isCheckout && (
            <p className="text-sm text-blue-400 mt-2">📦 Complete your checkout</p>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 flex gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  autoComplete="email"
                  className="w-full px-4 py-3 pl-10 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pl-10 pr-10 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Customer Sign In
                </>
              )}
            </button>
          </form>

          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-gray-400">or</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">Don't have an account?</p>
            <Link
              href={isCheckout ? `/customer/register?email=${encodeURIComponent(email)}&checkout=true` : '/customer/register'}
              className="inline-block text-blue-400 hover:text-blue-300 font-semibold transition"
            >
              Create one now
            </Link>
          </div>
        </div>

        <div className="text-center mt-6 space-y-3">
          <Link href="/" className="block text-gray-400 hover:text-white text-sm transition">
            ← Back to home
          </Link>
          <p className="text-xs text-gray-500">
            Are you an admin?{' '}
            <Link href="/admin/login" className="text-green-400 hover:text-green-300 font-semibold">
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoginSuspense />}>
      <LoginContent />
    </Suspense>
  );
}
