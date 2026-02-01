'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Star, ShoppingCart, Share2, Heart, Copy, Check, Truck, Shield, RefreshCw, Mail, Phone, MapPin, AlertCircle, Loader } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!params.id) {
          setError('Product ID not found');
          setLoading(false);
          return;
        }

        console.log('[Product] Loading:', params.id);

        const productRef = doc(db, 'products', params.id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          setProduct({
            id: params.id,
            ...productSnap.data(),
          });
          console.log('[Product] Loaded successfully');
        } else {
          setError('Product not found');
          console.log('[Product] Not found:', params.id);
        }
      } catch (err) {
        console.error('[Product] Error:', err.message);
        setError('Error loading product - please try again');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [params.id]);

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.fullName || !formData.phone || !formData.address) {
      setCheckoutError('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      setCheckoutError('Please enter a valid email');
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      const orderTotal = parseFloat(product.price) * quantity;
      const shippingCost = 10.00;
      const tax = parseFloat((orderTotal * 0.08).toFixed(2)); // 8% tax
      const finalTotal = parseFloat((orderTotal + shippingCost + tax).toFixed(2));

      // Create order in Firestore
      const orderData = {
        productId: product.id,
        productName: product.name,
        productPrice: parseFloat(product.price),
        quantity: quantity,
        subtotal: orderTotal,
        shipping: shippingCost,
        tax: tax,
        total: finalTotal,
        
        // Customer info
        customerEmail: formData.email,
        customerName: formData.fullName,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        customerCity: formData.city,
        customerState: formData.state,
        customerZipCode: formData.zipCode,
        customerCountry: formData.country,
        
        // Status
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to orders collection
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('[Checkout] Order created:', orderRef.id);

      // Create Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderRef.id,
          productName: product.name,
          productPrice: product.price,
          quantity: quantity,
          customerEmail: formData.email,
          customerName: formData.fullName,
          shippingCost: shippingCost,
          tax: tax,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        console.log('[Checkout] Redirecting to Stripe...');
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setCheckoutError(err.message || 'An error occurred during checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="max-w-md mx-auto px-6">
          <Link href="/" className="text-blue-400 hover:underline flex items-center gap-2 mb-8">
            <ArrowLeft size={20} />
            Back Home
          </Link>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <p className="text-5xl mb-4">❌</p>
            <p className="text-gray-400 text-lg mb-4">Product Not Found</p>
            <p className="text-gray-500 text-sm mb-6">{error || 'The product you are looking for does not exist.'}</p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const productPrice = parseFloat(product.price || 0);
  const subtotal = productPrice * quantity;
  const shipping = 10.00;
  const tax = parseFloat((subtotal * 0.08).toFixed(2));
  const total = parseFloat((subtotal + shipping + tax).toFixed(2));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-lg font-bold text-white">🛍️ Product</h1>
          <button
            onClick={() => setLiked(!liked)}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <Heart
              size={24}
              className={liked ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Left: Product Image & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product Image */}
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-auto max-h-96 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-slate-700 text-gray-500">
                  No Image Available
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-700 flex gap-4">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-3 font-semibold border-b-2 transition ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-3 font-semibold border-b-2 transition ${
                  activeTab === 'reviews'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`px-4 py-3 font-semibold border-b-2 transition ${
                  activeTab === 'shipping'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Shipping & Returns
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'details' && product.description && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Product Description</h3>
                  <p className="text-gray-300 leading-relaxed">{product.description}</p>
                  {product.category && (
                    <div className="pt-4 border-t border-slate-700">
                      <p className="text-sm text-gray-400">Category</p>
                      <p className="text-white font-semibold">{product.category}</p>
                    </div>
                  )}
                  {product.variants && (
                    <div className="pt-4">
                      <p className="text-sm text-gray-400">Available Variants</p>
                      <p className="text-white font-semibold">{product.variants}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {product.reviews ? (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Customer Reviews</h3>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={24}
                                className={i < Math.round(product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                              />
                            ))}
                          </div>
                          <span className="text-white">
                            <span className="font-bold text-lg">{product.rating || 4.5}</span> out of 5
                          </span>
                        </div>
                        <p className="text-gray-400">{product.reviews} verified customer reviews</p>
                      </div>

                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white font-semibold">Great product!</p>
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, j) => (
                                  <Star
                                    key={j}
                                    size={16}
                                    className="fill-yellow-400 text-yellow-400"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-gray-400 text-sm">Verified Purchase • Customer {i}</p>
                            <p className="text-gray-300 text-sm mt-2">Excellent quality and fast shipping. Highly recommend!</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400">No reviews yet. Be the first to review!</p>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Shipping Information</h3>
                    <div className="space-y-3 text-gray-300">
                      <p>📦 Standard Shipping: 5-7 business days ($10.00)</p>
                      <p>🚚 Expedited Shipping: 2-3 business days ($25.00)</p>
                      <p>✈️ International Shipping: 10-15 business days ($35.00+)</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">Returns & Refunds</h3>
                    <div className="space-y-3 text-gray-300">
                      <p>📋 30-day money-back guarantee</p>
                      <p>🔄 Free returns on all orders</p>
                      <p>💳 Full refund within 5-7 business days</p>
                      <p>✅ No questions asked return policy</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Price & Checkout */}
          <div className="space-y-6">
            {/* Product Title & Rating */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-3">{product.name}</h1>
              {product.reviews && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < Math.round(product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">({product.reviews} reviews)</span>
                </div>
              )}
            </div>

            {/* Price Box */}
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-lg p-6 space-y-3">
              <p className="text-5xl font-bold text-green-400">${productPrice.toFixed(2)}</p>
              
              {product.inventory !== undefined && (
                <div className="pt-3 border-t border-green-500/30">
                  {product.inventory > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-semibold">
                        {product.inventory > 10 ? '✅ In Stock' : `⚠️ Only ${product.inventory} left!`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-red-400 font-semibold">Out of Stock</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="space-y-3">
              <p className="text-gray-400 font-semibold">Quantity</p>
              <div className="flex items-center gap-6 bg-slate-800 rounded-lg p-4 border border-slate-700 w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-gray-400 hover:text-white text-3xl font-bold"
                >
                  −
                </button>
                <span className="text-white font-bold text-2xl w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-gray-400 hover:text-white text-3xl font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check size={20} className="text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Share This Product
                </>
              )}
            </button>

            {/* Buy Button */}
            <button
              onClick={() => {
                if (product.inventory === 0) {
                  alert('Product is out of stock');
                  return;
                }
                setShowCheckout(true);
              }}
              disabled={product.inventory === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3"
            >
              <ShoppingCart size={24} />
              Buy Now - ${total.toFixed(2)}
            </button>

            {/* Trust Badges */}
            <div className="space-y-3 bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex items-start gap-3">
                <Shield size={20} className="text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold text-sm">Secure Checkout</p>
                  <p className="text-gray-400 text-xs">Powered by Stripe</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck size={20} className="text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold text-sm">Free Shipping</p>
                  <p className="text-gray-400 text-xs">On orders over $50</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw size={20} className="text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold text-sm">30-Day Returns</p>
                  <p className="text-gray-400 text-xs">Money-back guarantee</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a href="mailto:support@dropshipwithmonk.sbs" className="hover:text-white">support@dropshipwithmonk.sbs</a>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>+1 (555) 000-0000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full border border-slate-700 p-8 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">🛒 Checkout</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {checkoutError && (
              <div className="mb-6 bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg flex gap-3">
                <AlertCircle size={20} className="flex-shrink-0" />
                {checkoutError}
              </div>
            )}

            <form onSubmit={handleCheckout} className="space-y-6">
              {/* Order Summary */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white font-bold mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>{quantity}x {product.name}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tax (8%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-bold">
                    <span>Total</span>
                    <span className="text-green-400">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="text-white font-bold">Contact Information</h3>
                
                <input
                  type="email"
                  name="email"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name *"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h3 className="text-white font-bold">Shipping Address</h3>
                
                <input
                  type="text"
                  name="address"
                  placeholder="Street Address *"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State/Province"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="zipCode"
                    placeholder="ZIP/Postal Code"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Australia</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={20} />
                      Pay ${total.toFixed(2)}
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                By clicking "Pay", you agree to our Terms of Service and are redirected to Stripe for secure payment processing.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
