'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight, Lock, Users, LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Head from 'next/head';

export default function LandingPage() {
  const router = useRouter();
  const [userType, setUserType] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // ✅ If we're in the middle of logout, ignore this auth state change
      if (isLoggingOut) {
        console.log('[Landing] Ignoring auth state change during logout');
        return;
      }

      if (currentUser) {
        console.log('[Landing] User authenticated:', currentUser.email);
        console.log('[Landing] UID:', currentUser.uid);
        setUserEmail(currentUser.email);
        
        // ✅ DETERMINE USER TYPE FROM FIRESTORE
        try {
          // CHECK 1: Is user in 'customers' collection?
          console.log('[Landing] Step 1: Checking if user is in customers collection...');
          const customerRef = doc(db, 'customers', currentUser.uid);
          const customerSnap = await getDoc(customerRef);

          if (customerSnap.exists()) {
            console.log('[Landing] ✅ CUSTOMER DETECTED - User found in customers/{uid}');
            console.log('[Landing] Customer data:', customerSnap.data());
            
            // ✅ Set customer data
            localStorage.setItem('customer', JSON.stringify({
              id: currentUser.uid,
              email: customerSnap.data().email || currentUser.email,
              firstName: customerSnap.data().firstName || 'Customer',
              lastName: customerSnap.data().lastName || '',
              phone: customerSnap.data().phone || '',
            }));
            
            // Clear admin data
            localStorage.removeItem('admin');
            localStorage.removeItem('adminToken');
            
            setUserType('customer');
            setUser(currentUser);
            setLoading(false);
            return;
          }

          // CHECK 2: Is user in 'users' collection? (ADMIN)
          console.log('[Landing] Step 2: Checking if user is in users collection...');
          const adminRef = doc(db, 'users', currentUser.uid);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            console.log('[Landing] ✅ ADMIN DETECTED - User found in users/{uid}');
            console.log('[Landing] Admin data:', adminSnap.data());
            
            // ✅ Set admin data
            localStorage.setItem('admin', JSON.stringify({
              id: currentUser.uid,
              email: adminSnap.data().email || currentUser.email,
              name: adminSnap.data().name || 'Admin',
              role: 'admin',
            }));
            
            // Clear customer data
            localStorage.removeItem('customer');
            localStorage.removeItem('customerToken');
            localStorage.removeItem('cart');
            localStorage.removeItem('wishlist');
            
            setUserType('admin');
            setUser(currentUser);
            setLoading(false);
            return;
          }

          // User authenticated in Firebase but not in either collection
          console.log('[Landing] ❌ No role found - User authenticated but not in customers or users collection');
          setUserType(null);
          setUser(null);
        } catch (error) {
          console.error('[Landing] Error checking user role:', error);
          setUserType(null);
          setUser(null);
        }
      } else {
        console.log('[Landing] ✅ No user authenticated (logged out)');
        setUserType(null);
        setUser(null);
        setUserEmail(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoggingOut]);

  const handleLogout = async () => {
    try {
      console.log('[Landing] ===== LOGOUT STARTED =====');
      console.log('[Landing] Current user:', userEmail);
      console.log('[Landing] Current role:', userType);
      
      // ✅ Set flag to ignore auth state changes
      setIsLoggingOut(true);
      
      // Step 1: Clear localStorage BEFORE signing out
      console.log('[Landing] Step 1: Clearing all localStorage...');
      localStorage.removeItem('customer');
      localStorage.removeItem('customerToken');
      localStorage.removeItem('admin');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('cart');
      localStorage.removeItem('wishlist');
      localStorage.removeItem('notifications');
      console.log('[Landing] ✅ localStorage cleared');
      
      // Step 2: Sign out from Firebase
      console.log('[Landing] Step 2: Signing out from Firebase...');
      await signOut(auth);
      console.log('[Landing] ✅ Firebase signOut complete');
      
      // Step 3: Reset state
      console.log('[Landing] Step 3: Resetting state...');
      setUserType(null);
      setUser(null);
      setUserEmail(null);
      setIsLoggingOut(false);
      console.log('[Landing] ✅ State reset');
      
      console.log('[Landing] ===== LOGOUT COMPLETE =====');
    } catch (error) {
      console.error('[Landing] Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <meta name="p:domain_verify" content="e44b6216cd50ead1ed6933b6fa35e6c8"/>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // ✅ If CUSTOMER is logged in - redirect to customer dashboard
  if (userType === 'customer' && user) {
    return (
      <>
        <Head>
          <meta name="p:domain_verify" content="e44b6216cd50ead1ed6933b6fa35e6c8"/>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto">
              <Users size={32} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome back! 👋</h1>
              <p className="text-gray-400 mb-4">You're logged in as a <span className="font-bold text-blue-400">CUSTOMER</span></p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <Link
              href="/customer/account"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition block"
            >
              Go to My Account
            </Link>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 rounded-lg transition flex items-center justify-center gap-2"
              disabled={isLoggingOut}
            >
              <LogOut size={16} />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ✅ If ADMIN is logged in - redirect to admin dashboard
  if (userType === 'admin' && user) {
    return (
      <>
        <Head>
          <meta name="p:domain_verify" content="e44b6216cd50ead1ed6933b6fa35e6c8"/>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto">
              <Zap size={32} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome back, Admin! 🔥</h1>
              <p className="text-gray-400 mb-4">You're logged in as an <span className="font-bold text-green-400">ADMIN</span></p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition block"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-2 rounded-lg transition flex items-center justify-center gap-2"
              disabled={isLoggingOut}
            >
              <LogOut size={16} />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ✅ NOT logged in - show login options
  return (
    <>
      <Head>
        <meta name="p:domain_verify" content="e44b6216cd50ead1ed6933b6fa35e6c8"/>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="border-b border-slate-700 sticky top-0 z-40 bg-slate-900/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={28} className="text-blue-400" />
              <span className="text-2xl font-bold text-white">DropShip</span>
            </div>
            <div className="text-gray-400 text-sm">Choose your role to login</div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-16 space-y-6">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              Welcome to DropShip
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Choose your login type to get started
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Customer Column */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-2 border-blue-500/30 rounded-2xl p-8 hover:border-blue-500/50 transition space-y-6">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <Users size={32} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white text-center">Customer</h2>
                <p className="text-gray-400 text-center">
                  Browse products, manage orders, and track shipments
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Browse trending products</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Manage your orders</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Track shipments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>View order history</span>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Link
                  href="/customer/login"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  Customer Login
                </Link>
                <Link
                  href="/customer/register"
                  className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  Create Account
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Admin Column */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 border-2 border-green-500/30 rounded-2xl p-8 hover:border-green-500/50 transition space-y-6">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto">
                  <Zap size={32} className="text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white text-center">Admin</h2>
                <p className="text-gray-400 text-center">
                  Manage products, orders, and track business metrics
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Manage all orders</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Add products</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>View analytics</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Track revenue</span>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Link
                  href="/admin/login"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  Admin Login
                </Link>
                <p className="text-gray-500 text-sm text-center">
                  Admin registration by invitation only
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="text-3xl">🛒</div>
              <h3 className="text-white font-bold">Easy Shopping</h3>
              <p className="text-gray-400 text-sm">Browse and purchase products effortlessly</p>
            </div>
            <div className="text-center space-y-3">
              <div className="text-3xl">🔒</div>
              <h3 className="text-white font-bold">Secure Payment</h3>
              <p className="text-gray-400 text-sm">Powered by Stripe for secure transactions</p>
            </div>
            <div className="text-center space-y-3">
              <div className="text-3xl">📦</div>
              <h3 className="text-white font-bold">Order Tracking</h3>
              <p className="text-gray-400 text-sm">Track your orders in real-time</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-gray-400">
            <p>© 2024 DropShip. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
}
