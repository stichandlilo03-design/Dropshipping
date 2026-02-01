'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl mb-6">❌</div>
        
        <h1 className="text-3xl font-bold text-white">Payment Cancelled</h1>
        <p className="text-gray-400">Your payment was cancelled. No charges were made to your account.</p>
        
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <p className="text-gray-400">You can try again or continue shopping anytime.</p>
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
