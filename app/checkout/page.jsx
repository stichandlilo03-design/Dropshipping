'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader, AlertCircle, Lock, ShoppingCart, Check, ArrowLeft } from 'lucide-react';

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('shoppingCart');
      const savedCustomer = localStorage.getItem('customer');

      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedCustomer) setCustomer(JSON.parse(savedCustomer));
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error loading checkout data');
    }
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0);
  const shipping = 10.00;
  const tax = parseFloat((cartTotal * 0.08).toFixed(2));
  const grandTotal = parseFloat((cartTotal + shipping + tax).toFixed(2));

  const handleCheckout = async () => {
    if (!customer) {
      setError('Please login to checkout');
      return;
    }

    if (cart.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const firstCartItem = cart[0];

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'order-' + Date.now(),
          productId: firstCartItem.id,
          productName: firstCartItem.name,
          productPrice: firstCartItem.price,
          quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
          customerEmail: customer.email,
          customerName: customer.firstName + ' ' + customer.lastName,
          shippingCost: shipping,
          tax: tax,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        localStorage.removeItem('shoppingCart');
        localStorage.removeItem('pendingCheckout');
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('Checkout Error:', err);
      setError(err.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <AlertCircle size={40} className="text-orange-400 mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Not Logged In</h1>
            <p className="text-gray-400 mb-6">Please login to continue</p>
          </div>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
          <ArrowLeft size={20} />
          Back
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg">
                <p>{error}</p>
              </div>
            )}

            {/* Customer */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Check size={20} className="text-green-400" />
                Customer Info
              </h2>
              <p className="text-gray-400">Email: {customer.email}</p>
              <p className="text-gray-400">Name: {customer.firstName} {customer.lastName}</p>
            </div>

            {/* Items */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ShoppingCart size={20} />
                Items ({cart.length})
              </h2>
              {cart.map((item) => (
                <div key={item.cartId} className="flex justify-between bg-slate-700/30 p-3 rounded mb-2">
                  <div>
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-green-400 font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Pay Button */}
            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Pay ${grandTotal.toFixed(2)}
                </>
              )}
            </button>
          </div>

          {/* Right: Summary */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-24 h-fit">
            <h2 className="text-xl font-bold text-white mb-6">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex justify-between text-white font-bold">
                <span>Total</span>
                <span className="text-green-400">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
