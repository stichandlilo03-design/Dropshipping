'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Heart, Star, Check } from 'lucide-react';

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedItem, setAddedItem] = useState(null);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    // Check if logged in
    const customerData = localStorage.getItem('customer');
    if (!customerData) {
      router.push('/customer/login');
      return;
    }

    setCustomer(JSON.parse(customerData));

    // Load cart from localStorage
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      try {
        const parsedCart = JSON.parse(cartData);
        setCart(Array.isArray(parsedCart) ? parsedCart : []);
      } catch (e) {
        console.error('Error parsing cart:', e);
        setCart([]);
      }
    }

    // Load products from Firestore
    loadProducts();
  }, [router]);

  const loadProducts = async () => {
    try {
      console.log('[Shop] Loading products...');
      setLoading(true);

      const response = await fetch('/api/products');
      const data = await response.json();

      if (data.success && Array.isArray(data.products)) {
        console.log('[Shop] Loaded products:', data.products.length);
        setProducts(data.products);
      } else {
        console.error('[Shop] Invalid response:', data);
        // Show sample products if API fails
        setProducts([
          {
            id: '1',
            name: 'Sample T-Shirt',
            price: 29.99,
            image: 'https://via.placeholder.com/300x300?text=T-Shirt',
            description: 'Comfortable cotton t-shirt',
            category: 'Apparel',
            stock: 50,
          },
          {
            id: '2',
            name: 'Sample Hoodie',
            price: 49.99,
            image: 'https://via.placeholder.com/300x300?text=Hoodie',
            description: 'Warm and cozy hoodie',
            category: 'Apparel',
            stock: 30,
          },
        ]);
      }
      setLoading(false);
    } catch (err) {
      console.error('[Shop] Error loading products:', err);
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    console.log('[Shop] Adding to cart:', product.id, product.name);

    // Check if item already in cart
    const existingItem = cart.find(item => item.id === product.id);

    let updatedCart;
    if (existingItem) {
      // Increase quantity
      updatedCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: (item.quantity || 1) + 1 }
          : item
      );
    } else {
      // Add new item
      updatedCart = [
        ...cart,
        {
          id: String(product.id),
          productId: String(product.productId || product.id),
          name: String(product.name || product.productName || 'Product'),
          productName: String(product.name || product.productName || 'Product'),
          price: parseFloat(product.price),
          quantity: 1,
          image: product.image ? String(product.image) : '',
          description: product.description ? String(product.description) : '',
        },
      ];
    }

    console.log('[Shop] Updated cart:', updatedCart);

    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);

    // Show confirmation
    setAddedItem(product.id);
    setTimeout(() => setAddedItem(null), 2000);
  };

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">🛍️ Shop</h1>
            <p className="text-gray-400 text-sm">{products.length} products available</p>
          </div>
          <Link
            href="/checkout"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition"
          >
            <ShoppingCart size={20} />
            Checkout
            {cartCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{cartCount}</span>}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition group">
                {/* Image */}
                <div className="relative w-full h-48 bg-slate-700 overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                  <button className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 rounded-lg transition">
                    <Heart size={20} className="text-red-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-bold line-clamp-2">{product.name || product.productName}</h3>
                    <p className="text-gray-400 text-xs mt-1">{product.category || 'Product'}</p>
                  </div>

                  {product.description && (
                    <p className="text-gray-400 text-sm line-clamp-2">{product.description}</p>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-gray-400 text-xs ml-2">(42 reviews)</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <span className="text-green-400 font-bold text-lg">${parseFloat(product.price).toFixed(2)}</span>
                    <span className="text-gray-400 text-xs">Stock: {product.stock || '∞'}</span>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => addToCart(product)}
                    className={`w-full py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                      addedItem === product.id
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {addedItem === product.id ? (
                      <>
                        <Check size={18} />
                        Added!
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={18} />
                        Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Counter */}
      {cartCount > 0 && (
        <Link
          href="/checkout"
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition"
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {cartCount}
          </span>
        </Link>
      )}
    </div>
  );
}
