'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear localStorage
    localStorage.removeItem('customer');
    localStorage.removeItem('customerToken');
    
    // Redirect to home
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400">Logging out...</p>
      </div>
    </div>
  );
}
