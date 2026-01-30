'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { loginUser } from '@/lib/firebase';
import { generateToken, saveUser } from '@/lib/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.email || !formData.password) {
        setError('Email and password required');
        setLoading(false);
        return;
      }

      // Login with Firebase
      const result = await loginUser(formData.email, formData.password);

      if (!result.success) {
        setError(result.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Get user data from Firestore
      try {
        const { db } = await import('@/lib/firebase');
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Generate token
          const token = generateToken(result.user.uid, result.user.email);

          // Save to localStorage
          saveUser({
            id: result.user.uid,
            email: result.user.email,
            storeName: userData.storeName || 'My Store',
            token: token,
          });
        }
      } catch (firestoreError) {
        console.log('Could not fetch user data, but login successful');
        
        // Still save user even if Firestore fetch fails
        const token = generateToken(result.user.uid, result.user.email);
        saveUser({
          id: result.user.uid,
          email: result.user.email,
          storeName: 'My Store',
          token: token,
        });
      }

      // Redirect to dashboard
      router.push('/');
      
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">DropBoard</h1>
          <p className="text-gray-400">Dropshipping Dashboard</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-green-500" disabled={loading} />
              <span className="text-sm text-gray-400">Remember me</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-secondary text-gray-400">New to DropBoard?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-accent hover:text-emerald-400 font-semibold transition">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400 font-semibold mb-2">💡 Multi-Device Login</p>
          <p className="text-xs text-gray-400">
            Your account works on any browser, any device, anytime!
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Protected by encryption and secure authentication
        </p>
      </div>
    </div>
  );
}
