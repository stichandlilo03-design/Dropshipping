'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader, AlertCircle, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const checkoutParam = searchParams.get('checkout');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (checkoutParam === 'true') {
      setIsCheckout(true);
    }
  }, [searchParams]);

  const calculatePasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 5);
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setError('Valid email required');
      return false;
    }
    if (!fullName.trim()) {
      setError('Full name required');
      return false;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!agreeTerms) {
      setError('Please agree to Terms and Conditions');
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      console.log('[Register] Creating user:', email);

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('[Register] User created:', user.uid);

      // Update profile with full name
      await updateProfile(user, {
        displayName: fullName
      });

      console.log('[Register] Profile updated');

      // Extract first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create customer document in Firestore
      const customerRef = doc(db, 'customers', user.uid);
      await setDoc(customerRef, {
        id: user.uid,
        email: email.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'United States'
        },
        order_count: 0,
        clv: 0,
        total_spent: 0,
        wishlist: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      console.log('[Register] Customer document created');

      // Get auth token
      const token = await user.getIdToken();

      // Store customer data in localStorage
      const customerData = {
        id: user.uid,
        email: email.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        phone: '',
        order_count: 0,
        clv: 0,
        total_spent: 0,
        wishlist: []
      };

      localStorage.setItem('customer', JSON.stringify(customerData));
      localStorage.setItem('customerToken', token);

      console.log('[Register] Auth data stored');

      // If coming from checkout, redirect to payment
      if (isCheckout) {
        console.log('[Register] Redirecting to checkout payment');
        // Get pending checkout data
        const pendingCheckout = localStorage.getItem('pendingCheckout');
        if (pendingCheckout) {
          // Redirect to checkout payment page
          window.location.href = '/checkout?step=payment';
        } else {
          window.location.href = '/checkout?step=payment';
        }
      } else {
        // Normal registration - redirect to account
        router.push('/customer/account');
      }
    } catch (err) {
      console.error('[Register] Error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use uppercase, lowercase, numbers, and symbols.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-orange-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (!password) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    if (passwordStrength <= 4) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-gray-400">
              {isCheckout ? '📦 Sign up to complete your checkout' : 'Join us today'}
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
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                disabled={loading}
                readOnly={searchParams.get('email') !== null}
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                disabled={loading}
              />
            </div>

            {/* Password */}
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

              {/* Password Strength */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPasswordStrengthColor()} transition-all`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-semibold ${
                      passwordStrength <= 1 ? 'text-red-400' :
                      passwordStrength <= 2 ? 'text-orange-400' :
                      passwordStrength <= 3 ? 'text-yellow-400' :
                      passwordStrength <= 4 ? 'text-lime-400' :
                      'text-green-400'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    • Use uppercase, lowercase, numbers & symbols
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && password === confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                  <Check size={14} />
                  Passwords match
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 rounded accent-blue-500"
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-gray-400">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition">
                  Terms and Conditions
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
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
              <span className="px-2 bg-slate-800 text-gray-400">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            href={isCheckout ? `/customer/login?email=${encodeURIComponent(email)}&checkout=true` : '/customer/login'}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold text-center transition"
          >
            Sign In
          </Link>

          {/* Footer */}
          <div className="text-center text-sm text-gray-400">
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition">
              ← Back to Home
            </Link>
          </div>

          {/* Security Info */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-xs text-green-400">
            🔒 Your data is encrypted and secure
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSuspense />}>
      <RegisterContent />
    </Suspense>
  );
}
