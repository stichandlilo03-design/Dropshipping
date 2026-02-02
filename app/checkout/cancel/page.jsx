'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, AlertCircle, Home, Save } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function CancelContent() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  useEffect(() => {
    // Get cart from localStorage
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      try {
        const parsedCart = JSON.parse(cartData);
        setCart(Array.isArray(parsedCart) ? parsedCart : []);
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }

    // Get customer from localStorage
    const customerData = localStorage.getItem('customer');
    if (customerData) {
      try {
        const parsedCustomer = JSON.parse(customerData);
        setCustomer(parsedCustomer);
      } catch (e) {
        console.error('Error parsing customer:', e);
      }
    }

    setLoading(false);

    // Auto-save cancelled order to history
    saveOrderToHistory();
  }, []);

  const saveOrderToHistory = async () => {
    try {
      const customerData = localStorage.getItem('customer');
      const cartData = localStorage.getItem('cart');

      if (!customerData || !cartData) {
        return;
      }

      const customer = JSON.parse(customerData);
      const cart = JSON.parse(cartData);

      if (cart.length === 0) {
        return;
      }

      setSavingOrder(true);

      const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax + 10; // +10 for shipping

      const orderData = {
        id: `cancelled_${Date.now()}`,
        stripeSessionId: `cancelled_${Date.now()}`,
        customerId: customer.id,
        customerName: customer.firstName || 'Customer',
        customerEmail: customer.email,
        customerPhone: customer.phone || '',
        items: cart.map(item => ({
          productId: item.productId || item.id,
          productName: item.name || item.productName,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity) || 1,
          image: item.image,
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        shippingAddress: {},
        status: 'cancelled_payment', // Special status for cancelled payments
        reason: 'Customer cancelled checkout',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('[Cancel] Saving cancelled order to history:', orderData);

      const ordersRef = collection(db, 'orders');
      await addDoc(ordersRef, orderData);

      console.log('[Cancel] Order saved to history');
      setOrderSaved(true);
      setSavingOrder(false);
    } catch (err) {
      console.error('[Cancel] Error saving order:', err);
      setSavingOrder(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0);
  const tax = cartTotal * 0.08;
  const total = cartTotal + tax + 10; // +10 for shipping

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Checkout Cancelled</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Saved Status */}
            {orderSaved && (
              <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-6 flex gap-4">
                <Save size={24} className="text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-bold text-green-200 mb-2">Activity Saved</h2>
                  <p className="text-green-100">
                    This cancelled payment has been saved to your order history for reference.
                  </p>
                </div>
              </div>
            )}

            {/* Alert Box */}
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-6 flex gap-4">
              <AlertCircle size={24} className="text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-bold text-yellow-200 mb-2">Payment Cancelled</h2>
                <p className="text-yellow-100">
                  Your payment was cancelled. Your items are still in your cart and ready for checkout whenever you're ready.
                </p>
              </div>
            </div>

            {/* What Happened */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">What Happened?</h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  ✅ Your cart items are <span className="text-white font-semibold">still saved</span>
                </p>
                <p>
                  ✅ <span className="text-white font-semibold">No charge</span> was made to your card
                </p>
                <p>
                  ✅ This activity is <span className="text-white font-semibold">saved in your order history</span>
                </p>
                <p>
                  ✅ You can <span className="text-white font-semibold">retry checkout</span> anytime
                </p>
              </div>
            </div>

            {/* Your Items */}
            {cart.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Your Items ({cart.length})</h3>
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between pb-4 border-b border-slate-700 last:border-0">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1 mx-4">
                        <p className="text-white font-semibold">{item.name || item.productName}</p>
                        <p className="text-gray-400 text-sm">Qty: {item.quantity || 1}</p>
                      </div>
                      <p className="text-green-400 font-semibold">
                        ${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">What's Next?</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-white font-semibold">Review Your Items</p>
                    <p className="text-gray-400 text-sm">Check that everything is correct</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-white font-semibold">Retry Checkout</p>
                    <p className="text-gray-400 text-sm">Click the button below to complete your purchase</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <p className="text-white font-semibold">Confirm Payment</p>
                    <p className="text-gray-400 text-sm">Complete the payment and receive your order confirmation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Common Questions</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-white font-semibold mb-2">Was I charged?</p>
                  <p className="text-gray-400 text-sm">
                    No. Payment was cancelled before any charge was made to your card.
                  </p>
                </div>
                <div>
                  <p className="text-white font-semibold mb-2">Are my items still in my cart?</p>
                  <p className="text-gray-400 text-sm">
                    Yes! All items are saved and ready for you to checkout whenever you'd like.
                  </p>
                </div>
                <div>
                  <p className="text-white font-semibold mb-2">Is this saved in my history?</p>
                  <p className="text-gray-400 text-sm">
                    Yes! This cancelled checkout is saved in your order history for your records.
                  </p>
                </div>
                <div>
                  <p className="text-white font-semibold mb-2">Can I use a different payment method?</p>
                  <p className="text-gray-400 text-sm">
                    Yes! You can try checkout again with any Visa, Mastercard, American Express, or other supported card.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              {cart.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Tax (8%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Shipping</span>
                      <span className="text-green-400">$10.00</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-6 mb-6">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-white">Total</span>
                      <span className="text-2xl font-bold text-green-400">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      window.location.href = '/checkout';
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mb-3"
                  >
                    <ShoppingCart size={20} />
                    Retry Checkout
                  </button>
                </>
              ) : (
                <div className="text-center py-6">
                  <ShoppingCart size={40} className="text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Your cart is empty</p>
                </div>
              )}

              <Link
                href="/shop"
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-center block flex items-center justify-center gap-2"
              >
                <Home size={20} />
                Continue Shopping
              </Link>

              {customer && (
                <Link
                  href="/customer/account"
                  className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-center block"
                >
                  View Order History
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-12 bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
          <h3 className="text-lg font-bold text-white mb-2">Need Help?</h3>
          <p className="text-gray-400 mb-4">
            If you're experiencing issues with checkout, please contact our support team
          </p>
          <a
            href="mailto:support@dropshipwithmonk.sbs"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

function CancelSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<CancelSuspense />}>
      <CancelContent />
    </Suspense>
  );
}
