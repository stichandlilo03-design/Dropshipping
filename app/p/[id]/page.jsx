'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Star, ShoppingCart, Share2, Heart } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        if (!params.id) {
          setError('Product ID not found');
          return;
        }

        // Try to get product from products collection
        const productRef = doc(db, 'products', params.id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          setProduct({
            id: params.id,
            ...data,
          });
          console.log('[Product Page] Loaded product:', params.id);
        } else {
          setError('Product not found');
          console.log('[Product Page] Product not found:', params.id);
        }
      } catch (err) {
        console.error('[Product Page] Error:', err);
        setError('Error loading product');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [params.id]);

  const handleAddToCart = () => {
    alert(`Added ${quantity} × ${product.name} to cart!`);
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    alert('Product link copied!');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link href="/" className="text-blue-400 hover:underline flex items-center gap-2 mb-8">
            <ArrowLeft size={20} />
            Back Home
          </Link>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <p className="text-gray-400 text-lg mb-4">❌ {error || 'Product not found'}</p>
            <p className="text-gray-500 text-sm mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const profit = parseFloat(product.price || 0) - parseFloat(product.cost || 0);
  const profitMargin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center gap-2">
            <ArrowLeft size={20} />
            Back
          </Link>
          <h1 className="text-xl font-bold text-white">Product Details</h1>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="flex items-center justify-center">
            <div className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22500%22%3E%3Crect fill=%22%23374151%22 width=%22500%22 height=%22500%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2232%22 fill=%22%239CA3AF%22%3ENo Image Available%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center text-gray-500">
                  <span className="text-lg">No Image Available</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Badge */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <h1 className="text-4xl font-bold text-white">{product.name}</h1>
                {product.badge && (
                  <span className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-lg text-sm font-bold">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Supplier */}
              {product.supplier && (
                <p className={`text-sm font-medium w-fit px-3 py-1 rounded ${
                  product.supplier?.includes('Shopify')
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-blue-900/50 text-blue-300'
                }`}>
                  📦 {product.supplier}
                </p>
              )}
            </div>

            {/* Rating */}
            {product.reviews && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < Math.round(product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                    />
                  ))}
                </div>
                <span className="text-gray-400">
                  {product.rating || 4.5} ({product.reviews} reviews)
                </span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-bold text-white mb-2">About this product</h3>
                <p className="text-gray-400 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-4xl font-bold text-green-400">${parseFloat(product.price || 0).toFixed(2)}</span>
              </div>

              {product.cost && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <span className="text-gray-400">Cost:</span>
                  <span className="text-lg text-orange-400">${parseFloat(product.cost).toFixed(2)}</span>
                </div>
              )}

              {product.cost && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Your Profit:</span>
                  <span className="text-lg font-bold text-blue-400">${profit.toFixed(2)} ({profitMargin}%)</span>
                </div>
              )}
            </div>

            {/* Inventory Status */}
            {product.inventory !== undefined && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Availability</p>
                {product.inventory > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-400 font-semibold">{product.inventory} in stock</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-400 font-semibold">Out of stock</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Quantity</p>
              <div className="flex items-center gap-4 bg-slate-800 rounded-lg p-4 w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="text-gray-400 hover:text-white text-2xl transition"
                >
                  −
                </button>
                <span className="text-white font-bold text-xl w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-gray-400 hover:text-white text-2xl transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                disabled={product.inventory === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold text-lg transition flex items-center justify-center gap-2"
              >
                <ShoppingCart size={24} />
                {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <button
                onClick={handleShare}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <Share2 size={24} />
                Share Product
              </button>
            </div>

            {/* Product Details Table */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white mb-3">Product Details</h3>
              <table className="w-full text-sm">
                <tbody className="space-y-2">
                  {product.category && (
                    <tr className="border-b border-slate-700">
                      <td className="py-2 text-gray-400">Category</td>
                      <td className="py-2 text-white">{product.category}</td>
                    </tr>
                  )}
                  {product.variants && (
                    <tr className="border-b border-slate-700">
                      <td className="py-2 text-gray-400">Variants</td>
                      <td className="py-2 text-white">{product.variants}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-700">
                    <td className="py-2 text-gray-400">SKU</td>
                    <td className="py-2 text-white text-mono">{params.id}</td>
                  </tr>
                  {product.createdAt && (
                    <tr>
                      <td className="py-2 text-gray-400">Added</td>
                      <td className="py-2 text-white">{new Date(product.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-16 pt-12 border-t border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Continue Shopping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Link key={i} href="/" className="bg-slate-800 rounded-lg border border-slate-700 hover:border-blue-500 transition p-4">
                <div className="bg-slate-700 h-40 rounded-lg mb-3"></div>
                <p className="text-white font-semibold mb-2">Similar Product {i}</p>
                <p className="text-green-400 font-bold">View Store →</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


================================================================================
