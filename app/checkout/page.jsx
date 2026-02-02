'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft, Loader, Trash2 } from 'lucide-react';
import { loadStripe } from '@stripe/js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  useEffect(() => {
    console.log('[Checkout] Page loading...');
    
    // Get customer from localStorage
    const customerData = localStorage.getItem('customer');
    const cartData = localStorage.getItem('cart');

    console.log('[Checkout] Customer data:', customerData ? 'exists' : 'missing');
    console.log('[Checkout] Cart data:', cartData ? 'exists' : 'missing');

    if (!customerData) {
      console.log('[Checkout] No customer, redirecting to login');
      router.push('/customer/login');
      return;
    }

    try {
      const parsedCustomer = JSON.parse(customerData);
      console.log('[Checkout] Customer:', parsedCustomer.email);
      setCustomer(parsedCustomer);
      
      if (cartData) {
        try {
          const parsedCart = JSON.parse(cartData);
          const cartArray = Array.isArray(parsedCart) ? parsedCart : [];
          console.log('[Checkout] Cart items:', cartArray.length);
          setCart(cartArray);
        } catch (e) {
          console.error('[Checkout] Error parsing cart:', e);
          setCart([]);
        }
      }
    } catch (e) {
      console.error('[Checkout] Error parsing customer:', e);
      router.push('/customer/login');
      return;
    }

    setPageLoading(false);
  }, [router]);

  const subtotal = cart.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return sum + (price * quantity);
  }, 0);
  
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleRemoveItem = (itemId) => {
    const updated = cart.filter(item => item.id !== itemId);
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const handleCheckout = async () => {
    console.log('[Checkout] Starting checkout validation...');

    // Validation
    if (!customer) {
      setError('Please log in first');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zip) {
      setError('Please fill in all shipping address fields');
      return;
    }

    if (total <= 0) {
      setError('Invalid order total');
      return;
    }

    // Validate cart items
    const validCart = cart.filter(item => {
      return item.id && item.price && parseFloat(item.price) > 0 && item.name;
    });

    if (validCart.length === 0) {
      setError('Cart has invalid items');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[Checkout] Validation passed');
      console.log('[Checkout] Cart items:', validCart.length);
      console.log('[Checkout] Subtotal:', subtotal);
      console.log('[Checkout] Tax:', tax);
      console.log('[Checkout] Total:', total);
      console.log('[Checkout] Customer:', customer.email);

      // Prepare cart items for API
      const cartPayload = validCart.map(item => ({
        id: String(item.id),
        productId: String(item.productId || item.id),
        name: String(item.name || item.productName || 'Product'),
        productName: String(item.name || item.productName || 'Product'),
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity) || 1,
        image: item.image ? String(item.image) : '',
        description: item.description ? String(item.description) : '',
      }));

      const payload = {
        cartItems: cartPayload,
        customer: {
          id: String(customer.id),
          email: String(customer.email),
          firstName: String(customer.firstName || 'Customer'),
          phone: customer.phone ? String(customer.phone) : '',
        },
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2)),
        shippingAddress: {
          street: String(shippingAddress.street),
          city: String(shippingAddress.city),
          state: String(shippingAddress.state),
          zip: String(shippingAddress.zip),
          country: String(shippingAddress.country || 'US'),
        },
      };

      console.log('[Checkout] Sending payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[Checkout] Response status:', response.status);

      const data = await response.json();
      console.log('[Checkout] Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `API returned ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Checkout failed');
      }

      if (!data.sessionId) {
        throw new Error('No session ID returned');
      }

      console.log('[Checkout] Redirecting to Stripe...');

      // Redirect to Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Clear cart on success
      localStorage.removeItem('cart');
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please log in to checkout</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/shop" className="p-2 hover:bg-slate-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-200">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Info */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Customer Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white font-semibold">{customer.firstName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-semibold text-sm break-all">{customer.email}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Street Address *"
                  value={shippingAddress.street}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="City *"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="ZIP Code *"
                    value={shippingAddress.zip}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                    required
                  />
                  <select
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="MX">Mexico</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Order Items ({cart.length})</h2>
              {cart.length > 0 ? (
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
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="ml-4 p-2 hover:bg-red-500/20 rounded transition text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No items in cart</p>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-400">FREE</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-green-400">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Proceed to Payment
                  </>
                )}
              </button>

              <Link
                href="/shop"
                className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-center block"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
