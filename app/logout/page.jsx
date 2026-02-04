'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    console.log('[Logout] Clearing session...');

    // Clear all localStorage
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('cart');
    localStorage.removeItem('pendingCheckout');
    localStorage.removeItem('shoppingCart');
    
    // Clear sessionStorage
    sessionStorage.clear();

    console.log('[Logout] Session cleared');
    console.log('[Logout] Redirecting to home...');

    // Redirect to home after 1 second
    setTimeout(() => {
      router.push('/');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h1 className="text-2xl font-bold text-white mb-2">Logging Out</h1>
        <p className="text-gray-400">Clearing your session...</p>
        <p className="text-gray-500 text-sm mt-4">Redirecting to home page...</p>
      </div>
    </div>
  );
}
