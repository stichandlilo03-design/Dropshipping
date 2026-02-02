'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2, Search, Loader, AlertCircle, Star, Eye, ArrowRight } from 'lucide-react';

export default function CustomerWishlist() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setLoading(true);
        const customer = localStorage.getItem('customer');
        const token = localStorage.getItem('customerToken');

        if (!customer || !token) {
          router.push('/customer/login');
          return;
        }

        const customerData = JSON.parse(customer);
        const customerId = customerData.id;

        // Get wishlist from Firestore
        const response = await fetch('/api/customers/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        
        if (data.success && data.customer.wishlist) {
          setWishlist(data.customer.wishlist);
          
          // Fetch product details for each wishlist item
          const productsData = {};
          for (const productId of data.customer.wishlist) {
            try {
              const productRes = await fetch(`/api/products/${productId}`);
              if (productRes.ok) {
                const productData = await productRes.json();
                productsData[productId] = productData;
              }
            } catch (err) {
              console.error('Error fetching product:', err);
            }
          }
          setProducts(productsData);
        }
      } catch (err) {
        console.error('[Wishlist] Error:', err);
        setError('Failed to load wishlist');
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [router]);

  const removeFromWishlist = async (productId) => {
    try {
      const token = localStorage.getItem('customerToken');
      const customer = JSON.parse(localStorage.getItem('customer'));

      const response = await fetch('/api/customers/wishlist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();
      
      if (data.success) {
        setWishlist(prev => prev.filter(id => id !== productId));
        setSuccess('Removed from wishlist');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to remove from wishlist');
    }
  };

  const addToCart = (product) => {
    try {
      const cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]');
      const existingItem = cart.find(item => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          ...product,
          quantity: 1,
          cartId: Date.now()
        });
      }

      localStorage.setItem('shoppingCart', JSON.stringify(cart));
      setSuccess('Added to cart!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add to cart');
    }
  };

  const filteredWishlist = wishlist.filter(id => {
    const product = products[id];
    if (!product) return false;
    return product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader size={40} className="text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 border-b border-red-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Heart size={32} className="fill-white" />
              Your Favorites
            </h1>
            <Link href="/customer/account" className="text-red-100 hover:text-white text-sm font-medium transition">
              Back to Account
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-green-900/30 border-b border-green-500 text-green-200 px-4 sm:px-6 py-4 flex items-center gap-3">
          <span>✅ {success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border-b border-red-500 text-red-200 px-4 sm:px-6 py-4 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search your favorites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Content */}
        {filteredWishlist.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <Heart size={48} className="text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">
              {wishlist.length === 0 ? 'Your wishlist is empty' : 'No matching products found'}
            </p>
            <Link href="/trending" className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition font-semibold">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWishlist.map(productId => {
              const product = products[productId];
              if (!product) return null;

              return (
                <div key={productId} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-red-500 transition group">
                  {/* Image */}
                  {product.image && (
                    <div className="h-48 overflow-hidden bg-slate-700 relative">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      {product.onSale && (
                        <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold">SALE</div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-red-400 transition text-sm sm:text-base mb-2">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs text-gray-400">{product.category}</p>
                      )}
                    </div>

                    {/* Rating & Price */}
                    <div className="flex items-center justify-between">
                      <p className="text-xl sm:text-2xl font-bold text-green-400">
                        ${parseFloat(product.price || 0).toFixed(2)}
                      </p>
                      {product.rating && (
                        <div className="flex items-center gap-1">
                          <Star size={16} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-400">{product.rating}</span>
                        </div>
                      )}
                    </div>

                    {/* Stock Status */}
                    {product.inventory !== undefined && (
                      <div className="text-xs">
                        {product.inventory > 0 ? (
                          <span className="text-green-400">✅ In Stock</span>
                        ) : (
                          <span className="text-red-400">❌ Out of Stock</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-slate-700">
                      <button
                        onClick={() => addToCart(product)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <ShoppingCart size={14} />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                      <Link
                        href={`/p/${productId}`}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">View</span>
                      </Link>
                      <button
                        onClick={() => removeFromWishlist(productId)}
                        className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 py-2 rounded text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
