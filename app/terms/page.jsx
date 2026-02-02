'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
          <ArrowLeft size={20} />
          Back Home
        </Link>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h1 className="text-4xl font-bold text-white mb-6">Terms and Conditions</h1>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Agreement to Terms</h2>
              <p>By using this website, you agree to these terms and conditions.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Use License</h2>
              <p>You may use this website for lawful purposes only.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Disclaimer</h2>
              <p>Materials are provided 'as is' without warranties.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Limitations</h2>
              <p>We are not liable for damages from use of this website.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
