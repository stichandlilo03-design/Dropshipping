'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, Loader, CheckCircle } from 'lucide-react';

export default function CustomerRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!formData.email || !formData.email.includes('@')) {
      errors.email = 'Valid email required';
    }
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name required';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          phone: '',
        });

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/customer/login');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎉 Join Us</h1>
          <p className="text-gray-400">Create your customer account</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-900/30 border border-green-500 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-400 font-semibold">Account created successfully!</p>
              <p className="text-green-300 text-sm">Redirecting to login...</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8 shadow-2xl">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 pl-10 bg-slate-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    formErrors.email ? 'border-red-500' : 'border-slate-600'
                  }`}
                  disabled={loading}
                />
              </div>
              {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">First Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    className={`w-full px-4 py-3 pl-10 bg-slate-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      formErrors.firstName ? 'border-red-500' : 'border-slate-600'
                    }`}
                    disabled={loading}
                  />
                </div>
                {formErrors.firstName && <p className="text-red-400 text-xs mt-1">{formErrors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Last Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    className={`w-full px-4 py-3 pl-10 bg-slate-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      formErrors.lastName ? 'border-red-500' : 'border-slate-600'
                    }`}
                    disabled={loading}
                  />
                </div>
                {formErrors.lastName && <p className="text-red-400 text-xs mt-1">{formErrors.lastName}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full px-4 py-3 pl-10 bg-slate-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    formErrors.phone ? 'border-red-500' : 'border-slate-600'
                  }`}
                  disabled={loading}
                />
              </div>
              {formErrors.phone && <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="At least 8 characters"
                  className={`w-full px-4 py-3 pl-10 pr-10 bg-slate-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    formErrors.password ? 'border-red-500' : 'border-slate-600'
                  }`}
                  disabled={loading}
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
              {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 font-semibold rounded-lg transition flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-gray-400">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-400">
            <Link href="/customer/login" className="text-blue-400 hover:text-blue-300 font-semibold transition">
              Login here
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-2xl mb-1">🛍️</p>
            <p className="text-xs text-gray-400">Shop Now</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-2xl mb-1">📦</p>
            <p className="text-xs text-gray-400">Track Orders</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-2xl mb-1">💰</p>
            <p className="text-xs text-gray-400">Save Coupons</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Protected by encryption and secure authentication
        </p>
      </div>
    </div>
  );
}
