'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, addDoc, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Star, ShoppingCart, Heart, Copy, Check, Truck, Shield, RefreshCw, Mail, AlertCircle, Loader, X, Plus, Minus, TrendingUp, Eye, Zap, Lock, Trash2 } from 'lucide-react';

// Use same key as checkout page expects
const CART_STORAGE_KEY = 'cart';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const cartRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [cart, setCart] = useState([]);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
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

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Check both old and new keys for backwards compatibility
        const savedCart = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem('shoppingCart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          const cartArray = Array.isArray(parsedCart) ? parsedCart : [];
          setCart(cartArray);
          console.log('[Cart] Loaded from localStorage:', cartArray.length, 'items');
        }
      } catch (err) {
        console.error('[Cart] Error loading from localStorage:', err);
        setCart([]);
      }
      setCartLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && cartLoaded) {
      try {
        if (cart.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
          console.log('[Cart] Saved to localStorage:', cart.length, 'items');
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
          console.log('[Cart] Cleared from localStorage');
        }
      } catch (err) {
        console.error('[Cart] Error saving to localStorage:', err);
      }
    }
  }, [cart, cartLoaded]);

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

          try {
            const currentViews = productData.views || 0;
            await updateDoc(productRef, {
              views: currentViews + 1,
              lastViewed: new Date().toISOString(),
            });
            
            setProduct(prev => ({
              ...prev,
              views: currentViews + 1
            }));
          } catch (err) {
            console.log('[Views] Could not update views:', err.message);
          }
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

    if (!itemToAdd) {
      console.error('[Cart] No product to add');
      return;
    }

    // Ensure all required fields are present and correct types
    const cartItem = {
      id: String(itemToAdd.id),
      productId: String(itemToAdd.productId || itemToAdd.id),
      name: String(itemToAdd.name || itemToAdd.productName || 'Product'),
      productName: String(itemToAdd.name || itemToAdd.productName || 'Product'),
      price: parseFloat(itemToAdd.price) || 0,
      quantity: parseInt(itemQuantity) || 1,
      image: itemToAdd.image ? String(itemToAdd.image) : '',
      category: itemToAdd.category ? String(itemToAdd.category) : '',
      description: itemToAdd.description ? String(itemToAdd.description) : '',
    };

    console.log('[Cart] Adding item:', cartItem);

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === cartItem.id);
      let updated;
      
      if (existingItem) {
        updated = prevCart.map(item =>
          item.id === cartItem.id
            ? { ...item, quantity: item.quantity + itemQuantity }
            : item
        );
      } else {
        updated = [...prevCart, cartItem];
      }

      console.log('[Cart] Updated cart:', updated);
      return updated;
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
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

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = 10.00;
  const tax = parseFloat((cartTotal * 0.08).toFixed(2));
  const grandTotal = parseFloat((cartTotal + shipping + tax).toFixed(2));

  // Email check and redirect flow
  const handleEmailCheck = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.email.includes('@')) {
      setFormErrors({ email: 'Valid email required' });
      return;
    }

    setCheckoutError(null);
    setEmailCheckLoading(true);

    try {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);
      
      const exists = !querySnapshot.empty;

      // Save checkout data to localStorage before redirecting
      const checkoutData = {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
        cartData: cart,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));

      if (exists) {
        // Email exists - redirect to login
        window.location.href = `/customer/login?email=${encodeURIComponent(formData.email)}&checkout=true`;
      } else {
        // Email doesn't exist - redirect to register
        window.location.href = `/customer/register?email=${encodeURIComponent(formData.email)}&checkout=true`;
      }
    } catch (err) {
      console.error('[Email Check] Error:', err);
      setCheckoutError('Error checking email. Please try again.');
    } finally {
      setEmailCheckLoading(false);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto w-full">
          <Link href="/" className="text-blue-400 hover:underline flex items-center gap-2 mb-8">
            <ArrowLeft size={20} />
            Back Home
          </Link>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 sm:p-12 text-center">
            <p className="text-4xl sm:text-5xl mb-4">❌</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm sm:text-base">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back</span>
            </Link>
            
            <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-slate-600">
              <Link 
                href="/customer/login" 
                className="text-gray-400 hover:text-white text-sm font-medium transition"
              >
                Login
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                href="/customer/register" 
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition"
              >
                Register
              </Link>
            </div>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white">🛍️ Product</h1>
          <div className="flex items-center gap-2 sm:gap-4 relative">
            {/* Cart Button */}
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

              {/* Dropdown */}
              {showCartDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4 flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <ShoppingCart size={20} />
                      <span className="hidden sm:inline">Your Cart</span>
                      <span className="sm:hidden">Cart</span>
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
                      <div className="p-6 sm:p-8 text-center">
                        <ShoppingCart size={40} className="text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">Your cart is empty</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700">
                        {cart.map((item) => (
                          <div key={item.id} className="p-3 sm:p-4 hover:bg-slate-700/50 transition">
                            {/* Product Image & Info */}
                            <div className="flex gap-3 mb-3">
                              {item.image && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                                  />
                                </div>
                              )}

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 mb-1">{item.name}</h4>
                                
                                <div className="space-y-1 mb-2">
                                  {item.category && (
                                    <p className="text-xs text-gray-400">{item.category}</p>
                                  )}
                                  <p className="text-xs sm:text-sm font-bold text-green-400">${parseFloat(item.price || 0).toFixed(2)}</p>
                                </div>

                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition"
                                >
                                  <Trash2 size={12} />
                                  Remove
                                </button>
                              </div>
                            </div>

                            {/* Quantity & Subtotal */}
                            <div className="flex items-center justify-between bg-slate-700/30 rounded p-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                  className="text-gray-400 hover:text-white p-1 transition rounded hover:bg-slate-600"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-white font-bold w-6 text-center text-sm">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                  className="text-gray-400 hover:text-white p-1 transition rounded hover:bg-slate-600"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-blue-400">${(parseFloat(item.price || 0) * item.quantity).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {cart.length > 0 && (
                    <div className="border-t border-slate-700 bg-slate-900 px-4 sm:px-6 py-4">
                      <div className="space-y-2 mb-4 bg-slate-800 p-3 rounded-lg text-sm">
                        <div className="flex justify-between text-gray-400">
                          <span>Subtotal</span>
                          <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Shipping</span>
                          <span className="font-semibold">$10.00</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
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

      <div className="w-full">
        {showSuccess && (
          <div className="bg-green-900/30 border-b border-green-500 text-green-200 p-3 sm:p-4 flex items-center gap-3 sticky top-16 z-30">
            <Check size={20} />
            <span className="text-sm">✅ Added to cart! You can keep shopping.</span>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 mb-12">
            {/* Left: Product Image & Details */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              {/* Product Image */}
              <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative w-full">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-auto max-h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-60 sm:h-96 flex items-center justify-center bg-slate-700 text-gray-500">
                    No Image
                  </div>
                )}
                {product.onSale && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-sm sm:text-base">
                    SALE
                  </div>
                )}
              </div>

              {/* Seller Info */}
              {product.sellerName && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <p className="text-gray-400 text-xs sm:text-sm">Sold by</p>
                  <p className="text-white font-semibold text-base sm:text-lg">{product.sellerName}</p>
                </div>
              )}

              {/* Tabs */}
              <div className="border-b border-slate-700 flex gap-2 sm:gap-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-3 sm:px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-3 sm:px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'reviews'
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={`px-3 sm:px-4 py-3 font-semibold border-b-2 transition whitespace-nowrap text-sm sm:text-base ${
                    activeTab === 'shipping'
                      ? 'border-blue-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Shipping
                </button>
              </div>

              {/* Tab Content */}
              <div className="w-full">
                {activeTab === 'details' && product.description && (
                  <div className="space-y-4">
                    <h3 className="text-lg sm:text-xl font-bold text-white">Product Description</h3>
                    <p className="text-gray-300 leading-relaxed text-sm sm:text-base">{product.description}</p>
                    {product.category && (
                      <div className="pt-4 border-t border-slate-700">
                        <p className="text-xs sm:text-sm text-gray-400">Category</p>
                        <p className="text-white font-semibold text-sm sm:text-base">{product.category}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    {product.reviews && product.reviews > 0 ? (
                      <div className="space-y-2">
                        <h3 className="text-lg sm:text-xl font-bold text-white">Customer Reviews</h3>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={20}
                                className={i < Math.round(product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                              />
                            ))}
                          </div>
                          <span className="text-white text-sm sm:text-base">
                            <span className="font-bold text-base sm:text-lg">{product.rating || 4.5}</span> / 5
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm">{product.reviews} verified reviews</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No reviews yet. Be the first!</p>
                    )}
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="w-full space-y-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">🚚 Shipping</h3>
                      <div className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
                        <p>📦 Standard: 5-7 days ($10.00)</p>
                        <p>🚚 Expedited: 2-3 days ($25.00)</p>
                        <p>✈️ International: 10-15 days ($35.00+)</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">📋 Returns</h3>
                      <div className="space-y-2 sm:space-y-3 text-gray-300 text-sm sm:text-base">
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
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">{product.name}</h1>
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-gray-400" />
                  <span className="text-gray-400 text-sm">{product.views || 0} viewing</span>
                </div>
              </div>

              {/* Price Card */}
              <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-lg p-4 sm:p-6 space-y-3">
                <div className="space-y-1">
                  <p className="text-gray-300 text-xs sm:text-sm">Price</p>
                  <p className="text-3xl sm:text-5xl font-bold text-green-400">${productPrice.toFixed(2)}</p>
                </div>
                
                {product.inventory !== undefined && (
                  <div className="pt-3 border-t border-green-500/30">
                    {product.inventory > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-semibold text-xs sm:text-base">
                          {product.inventory > 10 ? '✅ In Stock' : `⚠️ Only ${product.inventory} left!`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-red-400 font-semibold text-xs sm:text-base">Out of Stock</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2 sm:space-y-3">
                <p className="text-gray-400 font-semibold text-sm">Quantity</p>
                <div className="flex items-center gap-3 sm:gap-4 bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700 w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-gray-400 hover:text-white p-1 transition"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-white font-bold text-xl sm:text-2xl w-10 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-gray-400 hover:text-white p-1 transition"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <button
                onClick={handleShare}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 sm:py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition text-sm sm:text-base"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-green-400" />
                    <span className="hidden sm:inline">Copied!</span>
                    <span className="sm:hidden">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              <button
                onClick={() => addToCart()}
                disabled={product.inventory === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 sm:py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition text-sm sm:text-base"
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
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition"
              >
                <Zap size={20} />
                Buy Now
              </button>

              {/* Trust */}
              <div className="space-y-2 sm:space-y-3 bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-700">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Shield size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-xs sm:text-sm">Secure Checkout</p>
                    <p className="text-gray-400 text-xs">Powered by Stripe</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Truck size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-xs sm:text-sm">Fast Shipping</p>
                    <p className="text-gray-400 text-xs">5-7 days</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <RefreshCw size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold text-xs sm:text-sm">30-Day Returns</p>
                    <p className="text-gray-400 text-xs">Money-back</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <a href="mailto:support@dropshipwithmonk.sbs" className="hover:text-white truncate">support@dropshipwithmonk.sbs</a>
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mb-12 sm:mb-16">
              <div className="flex items-center gap-2 mb-6 sm:mb-8">
                <TrendingUp size={24} className="text-orange-400" />
                <h2 className="text-2xl sm:text-3xl font-bold text-white">🔥 Related</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                    <div className="p-3 sm:p-4 space-y-3">
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition text-sm sm:text-base">{prod.name}</h3>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-lg sm:text-2xl font-bold text-green-400">${parseFloat(prod.price || 0).toFixed(2)}</p>
                        {prod.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-400">{prod.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-slate-700">
                        <Link
                          href={`/p/${prod.id}`}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs sm:text-sm font-semibold text-center transition"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => addToCart(prod)}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <ShoppingCart size={12} />
                          <span className="hidden sm:inline">Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between rounded-t-2xl gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Lock size={24} className="text-white flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">Checkout</h2>
                  <p className="text-blue-100 text-xs sm:text-sm">Step 1: Verify Email</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-blue-500 rounded-lg transition flex-shrink-0"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              {checkoutError && (
                <div className="mb-6 bg-red-900/30 border border-red-500 text-red-200 p-3 sm:p-4 rounded-lg flex gap-2 sm:gap-3">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm">{checkoutError}</p>
                </div>
              )}

              <form onSubmit={handleEmailCheck} className="space-y-4 sm:space-y-6 max-w-md">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2 font-semibold">Email Address</label>
                  <p className="text-xs text-gray-400 mb-2">We'll check if you have an account with us</p>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-3 sm:px-4 py-3 bg-slate-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                      formErrors.email ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                  {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
                </div>

                <button
                  type="submit"
                  disabled={emailCheckLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 rounded-lg font-bold text-base transition flex items-center justify-center gap-2"
                >
                  {emailCheckLoading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Continue
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  ✅ Your data is secure
                </p>
              </form>

              {/* Order Summary */}
              <div className="mt-8 pt-8 border-t border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <ShoppingCart size={16} />
                  Order Summary
                </h3>
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>$10.00</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 flex justify-between text-white font-bold">
                    <span>Total</span>
                    <span className="text-green-400">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
