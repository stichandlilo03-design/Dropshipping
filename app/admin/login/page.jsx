'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader, AlertCircle, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      console.log('[Admin Login] Attempting login with email:', email);

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('[Admin Login] Firebase auth successful, UID:', user.uid);

      // CRITICAL: Check if user exists in /users collection (ADMIN ONLY)
      console.log('[Admin Login] Checking if user exists in /users (admin) collection...');
      
      const adminRef = doc(db, 'users', user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        console.error('[Admin Login] User NOT found in /users collection - user is a customer!');
        
        setError(
          '🚫 ACCESS DENIED!\n\n' +
          'This email is registered as a CUSTOMER, not an ADMIN.\n\n' +
          'Customers must use the customer login.\n\n' +
          'If you need admin access, contact the administrator.'
        );
        setLoading(false);
        return;
      }

      const adminData = adminSnap.data();
      console.log('[Admin Login] User found in /users collection:', adminData);

      // User is in /users = ADMIN ✅
      console.log('[Admin Login] User verified as ADMIN - access granted!');

      // Get auth token
      const token = await user.getIdToken();

      // Store admin data
      localStorage.setItem('adminToken', token);
      localStorage.setItem('admin', JSON.stringify({
        id: user.uid,
        email: user.email,
        name: adminData.name || 'Admin',
        role: 'admin',
      }));

      // Make sure customer data is cleared
      localStorage.removeItem('customer');
      localStorage.removeItem('customerToken');

      console.log('[Admin Login] Admin logged in successfully, redirecting to dashboard');

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('[Admin Login] Error:', err);

      if (err.code === 'auth/user-not-found') {
        setError('❌ This email is not registered as an admin.\n\nPlease check your email or contact the administrator.');
      } else if (err.code === 'auth/wrong-password') {
        setError('❌ Incorrect password.\n\nPlease try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('❌ Invalid email format.');
      } else if (err.code === 'auth/user-disabled') {
        setError('⛔ This admin account has been disabled.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <Zap size={32} className="text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-gray-400">🔐 Authorized Admins Only</p>
          </div>

          {/* Security Info */}
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              <strong>ℹ️ Admin Access Only:</strong> Only users registered in the admin database can login here. 
              Customers must use the customer login page.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg flex gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Verifying Admin Status...
                </>
              ) : (
                <>
                  Admin Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
            <p className="text-gray-300 text-sm font-semibold">🔐 How This Works:</p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>✓ Only admins (in /users) can login here</li>
              <li>✓ Customers (in /customers) are blocked</li>
              <li>✓ Completely separate databases</li>
            </ul>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-gray-400">Or</span>
            </div>
          </div>

          {/* Customer Link */}
          <Link
            href="/customer/login"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-center transition"
          >
            Customer Login
          </Link>

          {/* Back to Home */}
          <Link
            href="/"
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold text-center transition"
          >
            Back to Home
          </Link>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 space-y-2">
            <p>🔒 This page is restricted to registered admins only</p>
            <p>
              Are you a customer?{' '}
              <Link href="/customer/login" className="text-blue-400 hover:text-blue-300 transition">
                Use customer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoginSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginSuspense />}>
      <AdminLoginContent />
    </Suspense>
  );
}
