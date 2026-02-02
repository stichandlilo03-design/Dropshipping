'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);

  useEffect(() => {
    // Get email from URL if coming from checkout
    const emailParam = searchParams.get('email');
    const checkoutParam = searchParams.get('checkout');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (checkoutParam === 'true') {
      setIsCheckout(true);
    }
  }, [searchParams]);

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

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get customer data
      const token = await user.getIdToken();
      const response = await fetch(`/api/customers/get-by-email?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.customer) {
          localStorage.setItem('customer', JSON.stringify(data.customer));
          localStorage.setItem('customerToken', token);

          // If coming from checkout, redirect to payment
          if (isCheckout) {
            // Get pending checkout data
            const pendingCheckout = localStorage.getItem('pendingCheckout');
            if (pendingCheckout) {
              // Redirect to checkout payment page
              router.push('/checkout?step=payment');
            } else {
              router.push('/customer/account');
            }
          } else {
            router.push('/customer/account');
          }
        }
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      
      if (err.code === 'auth/user-not-found') {
        setError('Email not found. Please register first.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled.');
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
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">
              {isCheckout ? '📦 Login to complete your checkout' : 'Login to your account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg flex gap-3">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-gray-400">Don't have an account?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            href={isCheckout ? `/customer/register?email=${encodeURIComponent(email)}&checkout=true` : '/customer/register'}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold text-center transition"
          >
            Create Account
          </Link>

          {/* Footer */}
          <div className="text-center text-sm text-gray-400">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
