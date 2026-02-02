'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
          <ArrowLeft size={20} />
          Back Home
        </Link>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, such as name, email, and address.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. How We Use Information</h2>
              <p>We use information to process orders and improve our service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Data Security</h2>
              <p>We implement security measures to protect your personal information.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Contact Us</h2>
              <p>For privacy concerns, contact: support@dropshipwithmonk.sbs</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
