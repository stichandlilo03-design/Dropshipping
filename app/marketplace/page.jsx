'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, ShoppingCart, Heart, Star, ArrowLeft, Loader } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Marketplace() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(['all']);

  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    try {
      console.log('[Marketplace] Loading all products from all sellers');
      setLoading(true);

      // Get all products from all sellers
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);

      const allProducts = [];
      const categoriesSet = new Set(['all']);

      productsSnap.forEach((doc) => {
        const productData = doc.data();
        allProducts.push({
          id: doc.id,
          ...productData,
        });

        // Extract categories
        if (productData.category) {
          categoriesSet.add(productData.category);
        }
      });

      console.log('[Marketplace] Loaded products:', allProducts.length);
      console.log('[Marketplace] Categories:', Array.from(categoriesSet));

      setProducts(allProducts);
      setCategories(Array.from(categoriesSet));
      applyFilters(allProducts, searchTerm, filterCategory, sortBy);
      setLoading(false);
    } catch (error) {
      console.error('[Marketplace] Error loading products:', error);
      setLoading(false);
    }
  };

  const applyFilters = (productsToFilter, search, category, sort) => {
    let filtered = [...productsToFilter];

    // Search filter
    if (search) {
      filtered = filtered.filter((product) =>
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter((product) => product.category === category);
    }

    // Sort
    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sort === 'price-low') {
      filtered.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
    } else if (sort === 'price-high') {
      filtered.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
    } else if (sort === 'popular') {
      filtered.sort((a, b) => (b.sales || 0) - (a.sales || 0));
    }

    setFilteredProducts(filtered);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(products, value, filterCategory, sortBy);
  };

  const handleCategoryFilter = (category) => {
    setFilterCategory(category);
    applyFilters(products, searchTerm, category, sortBy);
  };

  const handleSort = (sort) => {
    setSortBy(sort);
    applyFilters(products, searchTerm, filterCategory, sort);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="mx-auto mb-4 text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">🛍️ Marketplace</h1>
              <p className="text-xs text-gray-400">Browse products from all sellers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="space-y-6 mb-8">
          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full px-4 py-3 pl-12 bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-400">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-gray-300 border border-slate-700 hover:border-blue-500'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-400">Sort By</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'newest', label: '🆕 Newest' },
                { value: 'popular', label: '🔥 Popular' },
                { value: 'price-low', label: '💰 Price: Low to High' },
                { value: 'price-high', label: '💎 Price: High to Low' },
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => handleSort(sort.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    sortBy === sort.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-gray-300 border border-slate-700 hover:border-blue-500'
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/p/${product.id}`}
                className="group bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500 transition"
              >
                {/* Product Image */}
                {product.image ? (
                  <div className="h-48 overflow-hidden bg-slate-700 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    {product.onSale && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                        SALE
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-slate-700 flex items-center justify-center">
                    <ShoppingCart size={32} className="text-gray-600" />
                  </div>
                )}

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  {/* Name */}
                  <div>
                    <h3 className="font-semibold text-white line-clamp-2 group-hover:text-blue-400 transition">
                      {product.name}
                    </h3>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Rating */}
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">({product.reviews || 0})</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <div>
                      <p className="text-lg font-bold text-green-400">
                        ${parseFloat(product.price || 0).toFixed(2)}
                      </p>
                      {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                        <p className="text-xs text-gray-500 line-through">
                          ${parseFloat(product.originalPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-slate-700 rounded-lg transition text-gray-400 hover:text-red-400">
                        <Heart size={18} />
                      </button>
                      <button className="p-2 hover:bg-slate-700 rounded-lg transition text-gray-400 hover:text-blue-400">
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Seller Info */}
                  {product.sellerName && (
                    <p className="text-xs text-gray-500 border-t border-slate-700 pt-2">
                      Seller: <span className="text-blue-400">{product.sellerName}</span>
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingCart size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
