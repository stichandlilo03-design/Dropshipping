'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Package, Truck, Mail } from 'lucide-react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch the order from your database
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Processing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Success Message */}
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl"></div>
              <div className="relative bg-green-500 rounded-full p-6 flex items-center justify-center">
                <Check size={48} className="text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white">Payment Successful! 🎉</h1>
          <p className="text-gray-400 text-lg">Thank you for your order!</p>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-6">
            <p className="text-green-400 font-semibold">✅ Order Confirmed</p>
            <p className="text-gray-400 text-sm mt-1">
              Order ID: <span className="font-mono">{orderId}</span>
            </p>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">What's Next?</h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600">
                  <span className="text-white font-bold">1</span>
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold">Check Your Email</h3>
                <p className="text-gray-400 text-sm">We've sent a confirmation email with your order details and tracking info.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600">
                  <span className="text-white font-bold">2</span>
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold">Processing & Packing</h3>
                <p className="text-gray-400 text-sm">Your order is being processed and will ship within 1-2 business days.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-600">
                  <span className="text-white font-bold">3</span>
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold">Shipping</h3>
                <p className="text-gray-400 text-sm">Standard shipping takes 5-7 business days. Track your package anytime.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <Mail size={32} className="text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">Order Confirmation</h3>
            <p className="text-gray-400 text-sm">Check your email for details</p>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <Truck size={32} className="text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">Free Shipping</h3>
            <p className="text-gray-400 text-sm">5-7 business days</p>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <Package size={32} className="text-blue-400 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">30-Day Returns</h3>
            <p className="text-gray-400 text-sm">Money-back guarantee</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Common Questions</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-2">How do I track my order?</h3>
              <p className="text-gray-400">You'll receive a tracking number via email once your order ships. You can use it to track your package in real-time.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">When will I receive my order?</h3>
              <p className="text-gray-400">Standard shipping takes 5-7 business days from the date of purchase. International orders may take 10-15 business days.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Can I return my order?</h3>
              <p className="text-gray-400">Yes! We offer a 30-day money-back guarantee. If you're not satisfied, simply contact us for a full refund, no questions asked.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Is my payment secure?</h3>
              <p className="text-gray-400">Absolutely. We use Stripe for secure payment processing. Your credit card information is encrypted and never stored on our servers.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap justify-center">
          <a
            href="mailto:support@dropshipwithmonk.sbs"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Contact Support
          </a>
          <Link
            href="/"
            className="inline-block bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm border-t border-slate-700 pt-8">
          <p>Thank you for shopping with us! 🙏</p>
          <p className="mt-2">For any questions, reach out to <a href="mailto:support@dropshipwithmonk.sbs" className="text-blue-400 hover:underline">support@dropshipwithmonk.sbs</a></p>
        </div>
      </div>
    </div>
  );
}
