'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Store, Eye, EyeOff, AlertCircle, Check, Loader } from 'lucide-react';
import { registerUser } from '@/lib/firebase';
import { generateToken, saveUser } from '@/lib/auth';

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    storeName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    if (!formData.storeName.trim()) {
      setError('Store name is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Invalid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      // Show success message
      setSuccess(true);

      // Register with Firebase
      const result = await registerUser(
        formData.email,
        formData.password,
        formData.storeName
      );

      if (!result.success) {
        setError(result.error || 'Registration failed');
        setSuccess(false);
        setLoading(false);
        return;
      }

      // Get user details
      const userId = result.user.uid;
      const email = result.user.email;
      const storeName = formData.storeName;

      // Generate token
      const token = generateToken(userId, email);

      // Save to localStorage for immediate access
      saveUser({
        id: userId,
        email: email,
        storeName: storeName,
        token: token,
      });

      // Wait a moment to show success message
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to dashboard
      router.push('/');
      
    } catch (err) {
      setError('Signup failed. Please try again.');
      setSuccess(false);
      console.error(err);
    } finally {
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
          <p className="text-gray-400">Start your dropshipping journey</p>
        </div>

        {/* Signup Card */}
        <div className="card">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 animate-pulse">
              <Check size={18} />
              Account created! Redirecting...
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Store Name</label>
              <div className="relative">
                <Store size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  placeholder="My Awesome Store"
                  className="input-field pl-10"
                  disabled={loading}
                  required
                />
              </div>
            </div>

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
                  placeholder="At least 6 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-green-500 mt-1" disabled={loading} required />
              <span className="text-xs text-gray-400">
                I agree to the Terms of Service and Privacy Policy
              </span>
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-secondary text-gray-400">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-400">
            <Link href="/auth/login" className="text-accent hover:text-emerald-400 font-semibold transition">
              Sign in instead
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Real-time order tracking',
            'Profit calculations',
            'Inventory management',
            'Supplier integration',
            'Revenue analytics',
            'Secure data storage',
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-gray-400">
              <Check size={16} className="text-accent flex-shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
}
