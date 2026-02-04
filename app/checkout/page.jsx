'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Trash2, Plus, Minus, AlertCircle, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function CheckoutContent() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmptyCart, setShowEmptyCart] = useState(false);
  const cartLoadedRef = useRef(false);
  const previousCartLength = useRef(0); // ✅ TRACK PREVIOUS CART LENGTH FOR PINTEREST

  // Constants for calculations
  const SHIPPING_COST = 10.0;
  const TAX_RATE = 0.08;

  // Load cart - try Firestore first, then localStorage
  const loadCart = async (customerId) => {
    try {
      console.log('[Checkout] Loading cart for customer:', customerId);

      // TRY 1: Load from Firestore
      try {
        const cartRef = doc(db, 'customers', customerId, 'cart', 'items');
        const cartSnap = await getDoc(cartRef);
        
        if (cartSnap.exists()) {
          const cartData = cartSnap.data();
          const items = cartData.items || [];
          if (items.length > 0) {
            console.log('[Checkout] ✅ Cart loaded from Firestore:', items);
            setCart(items);
            localStorage.setItem('cart', JSON.stringify(items));
            cartLoadedRef.current = true;
            previousCartLength.current = items.length; // ✅ TRACK LOADED CART LENGTH
            return;
          }
        }
      } catch (err) {
        console.log('[Checkout] Firestore load failed:', err.message);
      }

      // TRY 2: Load from localStorage
      console.log('[Checkout] Checking localStorage for cart...');
      const cartData = localStorage.getItem('cart');
      if (cartData) {
        try {
          const parsedCart = JSON.parse(cartData);
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            console.log('[Checkout] ✅ Cart loaded from localStorage:', parsedCart);
            setCart(parsedCart);
            cartLoadedRef.current = true;
            previousCartLength.current = parsedCart.length; // ✅ TRACK LOADED CART LENGTH
            
            // Save to Firestore for next time
            try {
              const cartRef = doc(db, 'customers', customerId, 'cart', 'items');
              await setDoc(cartRef, {
                items: parsedCart,
                lastUpdated: new Date().toISOString(),
                total: parsedCart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0),
                itemCount: parsedCart.length,
              }, { merge: true });
              console.log('[Checkout] ✅ Cart synced to Firestore from localStorage');
            } catch (saveErr) {
              console.error('[Checkout] Could not sync to Firestore:', saveErr);
            }
            return;
          }
        } catch (parseErr) {
          console.error('[Checkout] Error parsing localStorage cart:', parseErr);
        }
      }

      // No cart found anywhere
      console.log('[Checkout] ❌ No cart found in Firestore or localStorage');
      setCart([]);
      cartLoadedRef.current = true;
    } catch (err) {
      console.error('[Checkout] Error loading cart:', err);
      setCart([]);
      cartLoadedRef.current = true;
    }
  };

  // ✅ LOAD CART AND CUSTOMER DATA
  useEffect(() => {
    const customerData = localStorage.getItem('customer');

    if (!customerData) {
      console.log('[Checkout] No customer data, redirecting to login');
      router.push('/customer/login');
      return;
    }

    try {
      const parsedCustomer = JSON.parse(customerData);
      setCustomer(parsedCustomer);
      
      // Load cart from Firestore/localStorage
      if (parsedCustomer.id) {
        loadCart(parsedCustomer.id);
      }
    } catch (err) {
      console.error('[Checkout] Error parsing customer:', err);
      router.push('/customer/login');
    }
    
    setLoading(false);
  }, [router]);

  // 📌 PINTEREST EMAIL TRACKING
  useEffect(() => {
    // Send user email to Pinterest for Enhanced Match
    if (customer?.email && typeof window !== 'undefined' && window.pintrk) {
      window.pintrk('load', '2612779406065', {
        em: customer.email
      });
      console.log('[Pinterest] Checkout - Email tracked:', customer.email);
    }
  }, [customer]);

  // 📌 PINTEREST ADD-TO-CART TRACKING (improved to avoid duplicates)
  useEffect(() => {
    if (cart.length > 0 && typeof window !== 'undefined' && window.pintrk) {
      // Only track NEW items (not items already in cart)
      const newItems = cart.slice(previousCartLength.current);
      
      newItems.forEach(item => {
        window.pintrk('track', 'addtocart', {
          value: parseFloat(item.price || 0),
          currency: 'USD',
          content_ids: [item.id],
          content_name: item.name || item.productName,
          content_category: item.category || 'products',
          content_type: 'product',
          num_items: item.quantity || 1
        });
      });
      
      if (newItems.length > 0) {
        console.log('[Pinterest] New items tracked:', newItems.length);
      }
    }
    
    previousCartLength.current = cart.length;
  }, [cart]);

  // ✅ ONLY SAVE CART IF IT HAS ACTUALLY CHANGED (not just loaded)
  useEffect(() => {
    if (!customer || !customer.id) return;
    if (!cartLoadedRef.current) return; // ✅ Don't save until cart is loaded

    const saveCartAsync = async () => {
      try {
        const cartDocRef = doc(db, 'customers', customer.id, 'cart', 'items');
        
        if (cart.length > 0) {
          const cartData = {
            items: cart,
            lastUpdated: new Date().toISOString(),
            total: cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0),
            itemCount: cart.length,
          };
          
          await setDoc(cartDocRef, cartData, { merge: true });
          localStorage.setItem('cart', JSON.stringify(cart));
          console.log('[Checkout] Cart saved (user modified)');
        } else {
          // Only delete if user explicitly cleared it
          try {
            await deleteDoc(cartDocRef);
            localStorage.removeItem('cart');
            console.log('[Checkout] Cart deleted (user cleared it)');
          } catch (deleteErr) {
            console.log('[Checkout] Could not delete cart');
          }
        }
      } catch (err) {
        console.error('[Checkout] Error saving cart:', err);
      }
    };

    saveCartAsync();
  }, [cart, customer]);

  // Calculate amounts
  const calculateAmounts = () => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (parseFloat(item.price || 0) * (parseInt(item.quantity) || 1));
    }, 0);

    const tax = subtotal * TAX_RATE;
    const shipping = cart.length > 0 ? SHIPPING_COST : 0;
    const total = subtotal + tax + shipping;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      shipping: shipping,
      total: parseFloat(total.toFixed(2)),
    };
  };

  const amounts = calculateAmounts();

  // Remove item from cart
  const removeItem = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  // Update quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Clear entire cart
  const clearCart = () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      setCart([]);
      setShowEmptyCart(true);
      setTimeout(() => setShowEmptyCart(false), 3000);
    }
  };

  const handleCheckout = async () => {
    if (!customer) {
      setError('Please log in first');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[Checkout] Processing order with cart:', cart);
      console.log('[Checkout] Amount details:', amounts);

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cart,
          customer: {
            id: customer.id,
            email: customer.email,
            firstName: customer.firstName || 'Customer',
            lastName: customer.lastName || '',
            phone: customer.phone || '',
          },
          subtotal: amounts.subtotal,
          tax: amounts.tax,
          shipping: amounts.shipping,
          total: amounts.total,
          shippingAddress: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: 'US',
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Checkout failed');
        setLoading(false);
        return;
      }

      // 📌 PINTEREST PURCHASE TRACKING - EXECUTE IMMEDIATELY ✅
      if (typeof window !== 'undefined' && window.pintrk && amounts.total > 0) {
        window.pintrk('track', 'checkout', {
          value: amounts.total.toFixed(2),
          currency: 'USD',
          content_ids: cart.map(item => item.id),
          content_name: `Order - ${cart.length} items`,
          content_type: 'product',
          num_items: cart.length,
          order_quantity: cart.length,
          order_id: Date.now().toString(),
        });
        console.log('[Pinterest] Purchase tracked - Amount:', amounts.total);
      }

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-6 sm:p-8 text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
          <p className="text-gray-400">Please login to checkout</p>
          <Link href="/customer/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold block transition">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">🛒 Checkout</h1>
            <p className="text-xs sm:text-sm text-gray-400 truncate">{customer.email}</p>
          </div>
          <Link href="/customer/account" className="p-2 hover:bg-slate-700 rounded-lg transition flex-shrink-0">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Success Message */}
        {showEmptyCart && (
          <div className="mb-6 bg-green-900/30 border border-green-500 text-green-200 p-4 rounded-lg flex items-center gap-3">
            <Check size={20} />
            Cart cleared successfully
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-200 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Empty Cart State */}
        {cart.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 sm:p-12 text-center space-y-6">
            <ShoppingCart size={64} className="text-gray-600 mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Your Cart is Empty</h2>
            <p className="text-gray-400 text-sm sm:text-base">Add some items to get started</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/customer/account?tab=shop" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition text-sm sm:text-base">
                Go to Shop
              </Link>
              <Link href="/customer/account" className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-sm sm:text-base">
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                  <h2 className="text-lg sm:text-xl font-bold text-white">Order Items ({cart.length})</h2>
                  <button
                    onClick={clearCart}
                    className="text-red-400 hover:text-red-300 text-xs sm:text-sm font-semibold flex items-center gap-1 transition"
                  >
                    <Trash2 size={16} />
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Image */}
                        {item.image && (
                          <div className="w-full sm:w-20 h-24 sm:h-20 flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        )}

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm sm:text-base mb-1 line-clamp-2">
                            {item.name || item.productName}
                          </h3>
                          <p className="text-gray-400 text-xs sm:text-sm mb-3">
                            ${parseFloat(item.price || 0).toFixed(2)} each
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 bg-slate-800 rounded-lg w-fit p-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="text-gray-400 hover:text-white p-1 transition"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-white font-bold text-sm w-8 text-center">
                              {item.quantity || 1}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="text-gray-400 hover:text-white p-1 transition"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Price & Remove Button */}
                        <div className="flex items-start justify-between gap-4 sm:flex-col sm:items-end">
                          <div className="text-right">
                            <p className="text-2xl sm:text-lg font-bold text-green-400">
                              ${(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </p>
                            <p className="text-gray-400 text-xs">
                              qty: {item.quantity || 1}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 p-2 rounded-lg transition flex-shrink-0"
                            title="Remove item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 sticky top-20">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Subtotal</span>
                    <span className="font-semibold">${amounts.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Shipping</span>
                    <span className="font-semibold">${amounts.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Tax (8%)</span>
                    <span className="font-semibold">${amounts.tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-6 mb-6">
                  <div className="flex justify-between items-end">
                    <span className="text-base sm:text-lg font-bold text-white">Total</span>
                    <span className="text-2xl sm:text-3xl font-bold text-green-400">
                      ${amounts.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Item Count Badge */}
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-6 text-center">
                  <p className="text-blue-300 text-xs sm:text-sm font-semibold">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
                  </p>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition text-sm sm:text-base"
                >
                  {loading ? 'Processing...' : 'Proceed to Payment'}
                </button>

                <Link
                  href="/customer/account?tab=shop"
                  className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition text-center block text-sm sm:text-base"
                >
                  Go to Shop
                </Link>

                {/* Trust Badge */}
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-gray-400 text-xs text-center">
                    🔒 Secure checkout powered by Stripe
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutSuspense() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSuspense />}>
      <CheckoutContent />
    </Suspense>
  );
}
