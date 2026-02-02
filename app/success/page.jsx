'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Package, Truck, Mail, Loader, AlertCircle } from 'lucide-react';
import { doc, setDoc, getDoc, updateDoc, increment, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order') || 'Order-' + Math.random().toString(36).substr(2, 9);
  const [loading, setLoading] = useState(true);
  const [orderCreated, setOrderCreated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const syncOrderToCustomer = async () => {
      try {
        setLoading(true);
        
        // Get cart data
        const cartData = localStorage.getItem('shoppingCart');
        const customerData = localStorage.getItem('customer');

        if (!cartData || !customerData) {
          console.log('[Success] No cart or customer data, skipping order sync');
          setOrderCreated(true);
          setLoading(false);
          return;
        }

        const cart = JSON.parse(cartData);
        const customer = JSON.parse(customerData);

        if (cart.length === 0) {
          console.log('[Success] Empty cart, skipping order sync');
          setOrderCreated(true);
          setLoading(false);
          return;
        }

        const customerId = customer.id;
        const customerEmail = customer.email;

        console.log('[Success] Creating order for customer:', customerId);

        // Calculate totals from cart
        const subtotal = parseFloat(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
        const shipping = 10.00;
        const tax = parseFloat((subtotal * 0.08).toFixed(2));
        const total = parseFloat((subtotal + shipping + tax).toFixed(2));

        // Create order document
        const orderData = {
          customerId: customerId,
          customerEmail: customerEmail,
          customerName: customer.firstName + ' ' + customer.lastName,
          customerPhone: customer.phone || '',
          items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
            image: item.image || '',
            category: item.category || ''
          })),
          subtotal: subtotal,
          shipping: shipping,
          tax: tax,
          total: total,
          discount: 0,
          coupon_code: null,
          status: 'paid',
          payment_method: 'stripe',
          payment_intent_id: orderId,
          tracking_number: null,
          shipping_carrier: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save order to Firestore
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, orderData);
        console.log('✅ Order created in Firestore:', orderId);

        // Update customer document
        const customerRef = doc(db, 'customers', customerId);
        const customerDoc = await getDoc(customerRef);

        if (customerDoc.exists()) {
          await updateDoc(customerRef, {
            order_count: increment(1),
            clv: increment(total),
            total_spent: increment(total),
            last_order_date: new Date().toISOString(),
            orders: arrayUnion(orderId)
          });
          console.log('✅ Customer stats updated');
        }

        // Update localStorage customer
        const updatedCustomer = {
          ...customer,
          order_count: (customer.order_count || 0) + 1,
          clv: (customer.clv || 0) + total,
          total_spent: (customer.total_spent || 0) + total
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));

        // Clear cart
        localStorage.removeItem('shoppingCart');
        console.log('✅ Cart cleared, order synced to customer dashboard');

        setOrderCreated(true);
      } catch (err) {
        console.error('[Success] Error:', err);
        setError(err.message || 'Failed to sync order');
      } finally {
        setLoading(false);
      }
    };

    syncOrderToCustomer();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader size={40} className="text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">Processing your order...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Order Processing Note</h2>
                <p className="text-gray-300 mb-4">{error}</p>
                <p className="text-gray-400 text-sm">Your payment was successful, but we couldn't sync your order. You can view it in your account shortly.</p>
              </div>
            </div>
          </div>
        ) : null}

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
              Order ID: <span className="font-mono text-white">{orderId}</span>
            </p>
            {orderCreated && (
              <p className="text-green-300 text-sm mt-2">✅ Order synced to your dashboard</p>
            )}
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
              <p className="text-gray-400">You'll receive a tracking number via email once your order ships. You can also view your order in your account dashboard.</p>
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
          <Link
            href="/customer/account"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            View My Orders
          </Link>
          <a
            href="mailto:support@dropshipwithmonk.sbs"
            className="inline-block bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition"
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

function SuccessSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-slate-700 rounded-full animate-pulse"></div>
          </div>
          <div className="h-10 bg-slate-700 rounded w-3/4 mx-auto animate-pulse"></div>
          <div className="h-6 bg-slate-700 rounded w-1/2 mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}
