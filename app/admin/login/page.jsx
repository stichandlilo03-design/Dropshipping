'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader, AlertCircle, Eye, EyeOff, ArrowRight, Zap, Home } from 'lucide-react';

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

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('[Admin Login] Firebase auth successful, UID:', user.uid);

      console.log('[Admin Login] Checking if user exists in /users (admin) collection...');
      
      const adminRef = doc(db, 'users', user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        console.error('[Admin Login] User NOT found in /users collection - user is a customer!');
        
        setError(
          '🚫 ACCESS DENIED!\n\nThis email is registered as a CUSTOMER, not an ADMIN.\n\nCustomers must use the customer login.\n\nIf you need admin access, contact the administrator.'
        );
        setLoading(false);
        return;
      }

      const adminData = adminSnap.data();
      console.log('[Admin Login] User found in /users collection:', adminData);

      console.log('[Admin Login] User verified as ADMIN - access granted!');

      const token = await user.getIdToken();

      localStorage.setItem('adminToken', token);
      localStorage.setItem('admin', JSON.stringify({
        id: user.uid,
        email: user.email,
        name: adminData.name || 'Admin',
        role: 'admin',
      }));

      localStorage.removeItem('customer');
      localStorage.removeItem('customerToken');

      console.log('[Admin Login] Admin logged in successfully, redirecting to dashboard');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Top Navigation */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <Home size={20} className="text-blue-400" />
            <span className="text-white font-bold text-sm sm:text-base hidden sm:inline">DropShip</span>
          </Link>
          <span className="text-gray-400 text-xs sm:text-sm">Admin Access</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-70px)] px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Header Section */}
          <div className="text-center mb-8 space-y-3">
            <div className="flex justify-center">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <Zap size={32} className="text-green-400" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Admin Login</h1>
              <p className="text-gray-400 text-sm mt-1">🔐 Authorized Admins Only</p>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Security Info Box */}
            <div className="bg-blue-900/20 border-b border-blue-500/30 p-4">
              <p className="text-blue-200 text-sm leading-relaxed">
                <strong>ℹ️ Admin Access Only:</strong> Only registered admins can access this page. Customers must use customer login.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border-b border-red-500 p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm whitespace-pre-line leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Form Section */}
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-base"
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-base"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition"
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    <span className="hidden sm:inline">Verifying Admin Status...</span>
                    <span className="sm:hidden">Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Admin Login</span>
                    <ArrowRight size={18} className="hidden sm:inline" />
                  </>
                )}
              </button>
            </form>

            {/* Info Section */}
            <div className="bg-slate-700/30 border-t border-slate-700 p-4">
              <p className="text-gray-300 text-sm font-semibold mb-3">🔐 How This Works:</p>
              <ul className="text-gray-400 text-sm space-y-1.5">
                <li className="flex gap-2">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span>Only admins (in /users) can login here</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span>Customers (in /customers) are blocked</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span>Completely separate databases</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Link
              href="/customer/login"
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-center transition text-sm sm:text-base"
            >
              Customer Login
            </Link>
            <Link
              href="/"
              className="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold text-center transition text-sm sm:text-base"
            >
              Back to Home
            </Link>
          </div>

          {/* Footer Help */}
          <div className="text-center mt-6 space-y-2">
            <p className="text-gray-400 text-xs">🔒 This page is restricted to registered admins only</p>
            <p className="text-gray-500 text-xs">
              Not an admin?{' '}
              <Link href="/customer/login" className="text-blue-400 hover:text-blue-300 transition font-semibold">
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
