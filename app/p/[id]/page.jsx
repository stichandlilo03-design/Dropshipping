'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Star, ShoppingCart, Share2, Heart, Copy, Check } from 'lucide-react';

export default function ProductPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleAddToCart = () => {
    alert(`✅ Added ${quantity} × ${product.name} to cart!`);
  };

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Image */}
          <div className="flex items-center justify-center">
            <div className="w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
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
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <h1 className="text-4xl font-bold text-white">{product.name}</h1>
                {product.badge && (
                  <span className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-lg text-sm font-bold">
                    {product.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            {product.reviews && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={24}
                      className={i < Math.round(product.rating || 4) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                    />
                  ))}
                </div>
                <span className="text-gray-400">
                  <span className="font-bold text-white">{product.rating || 4.5}</span> ({product.reviews} reviews)
                </span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-bold text-white mb-3">📝 Description</h3>
                <p className="text-gray-300 leading-relaxed text-base">{product.description}</p>
              </div>
            )}

            {/* Price Box */}
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-lg p-8 space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Price</p>
                <p className="text-5xl font-bold text-green-400">${parseFloat(product.price || 0).toFixed(2)}</p>
              </div>

              {/* Stock Status */}
              {product.inventory !== undefined && (
                <div className="pt-4 border-t border-green-500/30">
                  {product.inventory > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-semibold text-lg">
                        {product.inventory > 10 ? '✅ In Stock' : `⚠️ Only ${product.inventory} left!`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span className="text-red-400 font-semibold text-lg">Out of Stock</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-3">
              <p className="text-gray-400 font-semibold">Quantity</p>
              <div className="flex items-center gap-6 bg-slate-800 rounded-lg p-4 w-fit border border-slate-700">
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

            {/* Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={product.inventory === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3"
              >
                <ShoppingCart size={24} />
                {product.inventory === 0 ? 'Out of Stock' : `Add to Cart - $${(parseFloat(product.price || 0) * quantity).toFixed(2)}`}
              </button>

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
                    Share Product
                  </>
                )}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3">
              <p className="text-gray-400 text-sm font-semibold">Why Buy From Us?</p>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span>100% Authentic</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span>Free Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span>30-Day Returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✅</span>
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 pt-8 text-center">
          <p className="text-gray-400 mb-4">Need help?</p>
          <a href="mailto:support@dropshipwithmonk.sbs" className="text-blue-400 hover:underline font-semibold">
            Contact us: support@dropshipwithmonk.sbs
          </a>
        </div>
      </div>
    </div>
  );
}
