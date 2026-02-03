// /app/p/[id]/social-publish-button.jsx
// One-click social publishing button for products

'use client';

import { useState } from 'react';
import { Share2, Loader, Check, AlertCircle } from 'lucide-react';

export default function ProductSocialPublishButton({ product }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const platforms = [
    { id: 'tiktok', name: 'TikTok Shop', icon: '🎵', color: 'from-black to-slate-800' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-pink-500 to-red-500' },
    { id: 'facebook', name: 'Facebook', icon: '👥', color: 'from-blue-600 to-blue-400' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌', color: 'from-red-600 to-red-400' },
  ];

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setLoading(true);
    console.log('[ProductPublish] Publishing to platforms:', selectedPlatforms);

    try {
      const response = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productDescription: product.description,
          productPrice: product.price,
          imageUrl: product.image,
          platforms: selectedPlatforms,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[ProductPublish] ✅ Published successfully:', data);
        setResults(data.results);
        setSelectedPlatforms([]);
      } else {
        console.error('[ProductPublish] Error:', data.error);
        alert('Failed to publish: ' + data.error);
      }
    } catch (error) {
      console.error('[ProductPublish] Error:', error);
      alert('Error publishing to social media');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition"
      >
        <Share2 size={18} />
        Publish
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50 p-6 space-y-4">
          <h3 className="text-white font-bold text-lg">Publish to Social Media</h3>

          {/* Platform Selection */}
          <div className="space-y-3">
            {platforms.map(platform => (
              <label key={platform.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => togglePlatform(platform.id)}
                  className="w-4 h-4 rounded accent-purple-600"
                />
                <div className={`w-8 h-8 rounded flex items-center justify-center text-lg`}>
                  {platform.icon}
                </div>
                <span className="text-gray-300">{platform.name}</span>
              </label>
            ))}
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={loading || selectedPlatforms.length === 0}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-2 rounded-lg font-bold transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Share2 size={18} />
                Publish Now
              </>
            )}
          </button>

          {/* Results */}
          {results && (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  {result.success ? (
                    <Check size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {result.platform}
                    </p>
                    {result.success ? (
                      <p className="text-green-400 text-xs">Published ✅</p>
                    ) : (
                      <p className="text-red-400 text-xs">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Close */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full text-center text-gray-400 hover:text-white text-sm transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
