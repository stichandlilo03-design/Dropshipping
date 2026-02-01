'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Star, ShoppingCart, Heart, Copy, Check, Truck, Shield, RefreshCw, Mail, AlertCircle, Loader, X, Plus, Minus, TrendingUp, Eye, Zap, Lock, CreditCard, Trash2 } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const cartRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [cart, setCart] = useState([]);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) {
        setShowCartDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!params.id) {
          setError('Product ID not found');
          setLoading(false);
          return;
        }

        const productRef = doc(db, 'products', params.id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = {
            id: params.id,
            ...productSnap.data(),
          };
          setProduct(productData);
          await loadRelatedProducts(productData);
        } else {
          setError('Product not found');
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

  const loadRelatedProducts = async (currentProduct) => {
    try {
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);

      let products = [];
      productsSnap.forEach(doc => {
        if (doc.id !== params.id) {
          products.push({
            id: doc.id,
            ...doc.data(),
          });
        }
      });

      const filtered = products
        .filter(p => 
          (p.category && currentProduct.category && p.category === currentProduct.category) ||
          (p.userId === currentProduct.userId)
        )
        .slice(0, 6);

      setRelatedProducts(filtered);
    } catch (err) {
      console.error('[Related] Error:', err);
    }
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addToCart = (prod = null) => {
    const itemToAdd = prod || product;
    const itemQuantity = prod ? 1 : quantity;

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === itemToAdd.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === itemToAdd.id
            ? { ...item, quantity: item.quantity + itemQuantity }
            : item
        );
      }
      return [...prevCart, { ...itemToAdd, quantity: itemQuantity, cartId: Date.now() }];
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const removeFromCart = (cartId) => {
    setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };

  const updateCartQuantity = (cartId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(cartId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.cartId === cartId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = 10.00;
  const tax = parseFloat((cartTotal * 0.08).toFixed(2));
  const grandTotal = parseFloat((cartTotal + shipping + tax).toFixed(2));

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email || !formData.email.includes('@')) errors.email = 'Valid email required';
    if (!formData.fullName.trim()) errors.fullName = 'Full name required';
    if (!formData.phone.trim()) errors.phone = 'Phone number required';
    if (!formData.address.trim()) errors.address = 'Address required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (cart.length === 0) {
      setCheckoutError('Your cart is empty');
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      const orderIds = [];
      
      for (const cartItem of cart) {
        const orderData = {
          productId: cartItem.id,
          productName: cartItem.name,
          productPrice: parseFloat(cartItem.price),
          quantity: cartItem.quantity,
          subtotal: parseFloat((cartItem.price * cartItem.quantity).toFixed(2)),
          shipping: shipping / cart.length,
          tax: tax / cart.length,
          total: grandTotal,
          
          customerEmail: formData.email,
          customerName: formData.fullName,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          customerCity: formData.city,
          customerState: formData.state,
          customerZipCode: formData.zipCode,
          customerCountry: formData.country,
          
          status: 'pending_payment',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const orderRef = await addDoc(collection(db, 'orders'), orderData);
        orderIds.push(orderRef.id);
      }

      const firstCartItem = cart[0];
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderIds[0],
          productId: firstCartItem.id,
          productName: firstCartItem.name,
          productPrice: firstCartItem.price,
          quantity: cartItemCount,
          customerEmail: formData.email,
          customerName: formData.fullName,
          shippingCost: shipping,
          tax: tax,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
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
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
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
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const productPrice = parseFloat(product.price || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-lg font-bold text-white">🛍️ Product</h1>
          <div className="flex items-center gap-4 relative">
            {/* Cart Button with Dropdown */}
            <div ref={cartRef} className="relative">
              <button
                onClick={() => setShowCartDropdown(!showCartDropdown)}
                className="relative p-2 hover:bg-slate-700 rounded-lg transition"
                title="Shopping Cart"
              >
                <ShoppingCart size={24} className="text-gray-400" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>

              {/* Dropdown - Appears from right */}
              {showCartDropdown && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShoppingCart size={20} />
                      Your Cart
                    </h3>
                    <button
                      onClick={() => setShowCartDropdown(false)}
                      className="text-white hover:bg-blue-500 rounded p-1 transition"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Items */}
                  <div className="max-h-80 overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="p-8 text-center">
                        <ShoppingCart size={40} className="text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Your cart is empty</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700">
                        {cart.map((item) => (
                          <div key={item.cartId} className="p-4 hover:bg-slate-700/50 transition">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-semibold text-white line-clamp-2 flex-1 pr-2">{item.name}</h4>
                              <button
                                onClick={() => removeFromCart(item.cartId)}
                                className="text-red-400 hover:text-red-300 p-1 flex-shrink-0 transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 bg-slate-700 rounded px-2 py-1">
                                <button
                                  onClick={() => updateCartQuantity(item.cartId, item.quantity - 1)}
                                  className="text-gray-400 hover:text-white transition"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-white font-bold w-5 text-center text-xs">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(item.cartId, item.quantity + 1)}
                                  className="text-gray-400 hover:text-white transition"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <p className="text-sm font-bold text-green-400">${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {cart.length > 0 && (
                    <div className="border-t border-slate-700 bg-slate-900 px-6 py-4">
                      <div className="space-y-2 mb-4 bg-slate-800 p-3 rounded-lg">
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Subtotal</span>
                          <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Shipping</span>
                          <span className="font-semibold">$10.00</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Tax (8%)</span>
                          <span className="font-semibold">${tax.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-bold">
                          <span>Total</span>
                          <span className="text-green-400">${grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowCartDropdown(false);
                          setShowCheckout(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition text-sm mb-2"
                      >
                        Checkout
                      </button>

                      <button
                        onClick={() => setShowCartDropdown(false)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition text-sm"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {showSuccess && (
          <div className="mb-6 bg-green-900/30 border border-green-500 text-green-200 p-4 rounded-lg flex items-center gap-3 animate-in">
            <Check size={20} />
            ✅ Added to cart!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Left: Product Image & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product Image */}
            <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-auto max-h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-slate-700 text-gray-500">
                  No Image Available
                </div>
              )}
              {product.onSale && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
                  SALE
                </div>
              )}
            </div>

            {/* Seller Info */}
            {product.sellerName && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <p className="text-gray-400 text-sm">Sold by</p>
                <p className="text-white font-semibold text-lg">{product.sellerName}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-slate-700 flex gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Reviews
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap ${
                  activeTab === 'shipping'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Shipping
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
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {product.reviews && product.reviews > 0 ? (
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
                          <span className="font-bold text-lg">{product.rating || 4.5}</span> / 5
                        </span>
                      </div>
                      <p className="text-gray-400">{product.reviews} verified customer reviews</p>
                    </div>
                  ) : (
                    <p className="text-gray-400">No reviews yet. Be the first!</p>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">🚚 Shipping</h3>
                    <div className="space-y-3 text-gray-300">
                      <p>📦 Standard: 5-7 days ($10.00)</p>
                      <p>🚚 Expedited: 2-3 days ($25.00)</p>
                      <p>✈️ International: 10-15 days ($35.00+)</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-4">📋 Returns</h3>
                    <div className="space-y-3 text-gray-300">
                      <p>✅ 30-day guarantee</p>
                      <p>🔄 Free returns</p>
                      <p>💳 Full refund in 5-7 days</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Price & Actions */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-3">{product.name}</h1>
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-gray-400" />
                <span className="text-gray-400">{product.views || 0} viewing</span>
              </div>
            </div>

            {/* Price Card */}
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-lg p-6 space-y-3">
              <div className="space-y-1">
                <p className="text-gray-300 text-sm">Price</p>
                <p className="text-5xl font-bold text-green-400">${productPrice.toFixed(2)}</p>
              </div>
              
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

            {/* Quantity */}
            <div className="space-y-3">
              <p className="text-gray-400 font-semibold">Quantity</p>
              <div className="flex items-center gap-4 bg-slate-800 rounded-lg p-4 border border-slate-700 w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-gray-400 hover:text-white p-1 transition"
                >
                  <Minus size={20} />
                </button>
                <span className="text-white font-bold text-2xl w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-gray-400 hover:text-white p-1 transition"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Buttons */}
            <button
              onClick={handleShare}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check size={20} className="text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Share
                </>
              )}
            </button>

            <button
              onClick={() => addToCart()}
              disabled={product.inventory === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
            >
              <ShoppingCart size={20} />
              Add to Cart
            </button>

            <button
              onClick={() => {
                if (product.inventory === 0) {
                  alert('Out of stock');
                  return;
                }
                setShowCheckout(true);
              }}
              disabled={product.inventory === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition"
            >
              <Zap size={24} />
              Buy Now
            </button>

            {/* Trust */}
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
                  <p className="text-white font-semibold text-sm">Fast Shipping</p>
                  <p className="text-gray-400 text-xs">5-7 days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw size={20} className="text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold text-sm">30-Day Returns</p>
                  <p className="text-gray-400 text-xs">Money-back</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a href="mailto:support@dropshipwithmonk.sbs" className="hover:text-white">support@dropshipwithmonk.sbs</a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp size={28} className="text-orange-400" />
              <h2 className="text-3xl font-bold text-white">🔥 Related Products</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((prod) => (
                <div key={prod.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                  {prod.image && (
                    <div className="h-40 overflow-hidden bg-slate-700 relative">
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      {prod.onSale && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">SALE</div>
                      )}
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition">{prod.name}</h3>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                      {prod.rating && (
                        <div className="flex items-center gap-1">
                          <Star size={16} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-400">{prod.rating}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-700">
                      <Link
                        href={`/p/${prod.id}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold text-center transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => addToCart(prod)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-sm font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <ShoppingCart size={14} />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 lg:px-8 py-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Lock size={28} className="text-white" />
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white">Secure Checkout</h2>
                  <p className="text-blue-100 text-sm">Protected by Stripe</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-blue-500 rounded-lg transition"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 lg:p-8">
              {/* Form */}
              <div className="lg:col-span-2">
                {checkoutError && (
                  <div className="mb-6 bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg flex gap-3">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <p className="text-sm">{checkoutError}</p>
                  </div>
                )}

                <form onSubmit={handleCheckout} className="space-y-6">
                  {/* Contact */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                      <h3 className="text-lg font-bold text-white">Contact</h3>
                    </div>
                    
                    <div className="space-y-4 bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Email</label>
                        <input
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-slate-800 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            formErrors.email ? 'border-red-500' : 'border-slate-600'
                          }`}
                        />
                        {formErrors.email && <p className="text-red-400 text-sm mt-1">{formErrors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Full Name</label>
                        <input
                          type="text"
                          name="fullName"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-slate-800 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            formErrors.fullName ? 'border-red-500' : 'border-slate-600'
                          }`}
                        />
                        {formErrors.fullName && <p className="text-red-400 text-sm mt-1">{formErrors.fullName}</p>}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          placeholder="+1 (555) 000-0000"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-slate-800 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            formErrors.phone ? 'border-red-500' : 'border-slate-600'
                          }`}
                        />
                        {formErrors.phone && <p className="text-red-400 text-sm mt-1">{formErrors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                      <h3 className="text-lg font-bold text-white">Address</h3>
                    </div>
                    
                    <div className="space-y-4 bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                      <div>
                        <label className="block text-sm text-gray-300 mb-2">Street</label>
                        <input
                          type="text"
                          name="address"
                          placeholder="123 Main Street"
                          value={formData.address}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 bg-slate-800 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            formErrors.address ? 'border-red-500' : 'border-slate-600'
                          }`}
                        />
                        {formErrors.address && <p className="text-red-400 text-sm mt-1">{formErrors.address}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">City</label>
                          <input
                            type="text"
                            name="city"
                            placeholder="New York"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">State</label>
                          <input
                            type="text"
                            name="state"
                            placeholder="NY"
                            value={formData.state}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">ZIP</label>
                          <input
                            type="text"
                            name="zipCode"
                            placeholder="10001"
                            value={formData.zipCode}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-2">Country</label>
                          <select
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option>United States</option>
                            <option>Canada</option>
                            <option>United Kingdom</option>
                            <option>Australia</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                      <h3 className="text-lg font-bold text-white">Payment</h3>
                    </div>
                    
                    <div className="bg-slate-700/50 p-4 rounded-lg border border-blue-500">
                      <div className="flex items-center gap-3">
                        <CreditCard size={24} className="text-blue-400" />
                        <div>
                          <p className="font-semibold text-white">Credit Card</p>
                          <p className="text-sm text-gray-400">Secure via Stripe</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-4 rounded-lg font-bold text-lg transition flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? (
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

                  <p className="text-xs text-gray-400 text-center">
                    ✅ SSL Secure • 🔒 PCI Compliant • 📦 Fast Shipping
                  </p>
                </form>
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-lg border border-slate-600 p-6 sticky top-8">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <ShoppingCart size={20} />
                    Summary
                  </h3>

                  {/* Items */}
                  <div className="space-y-3 mb-6 pb-6 border-b border-slate-600 max-h-64 overflow-y-auto">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start bg-slate-700/50 p-3 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white line-clamp-2">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-green-400">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 text-sm mb-6">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Shipping</span>
                      <span>${shipping.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Tax</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span className="text-green-400">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Trust */}
                  <div className="space-y-2 pb-6 border-b border-slate-600">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Lock size={14} className="text-green-400" />
                      <span>SSL Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Shield size={14} className="text-green-400" />
                      <span>PCI Compliant</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center mt-4">
                    Redirected to Stripe for payment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
