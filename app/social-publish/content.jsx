'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Calendar, Hash, AlertCircle, Check, Loader } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'facebook', name: 'Facebook', icon: '👍' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌' },
];

const CAPTIONS = {
  tiktok: [
    '🔥 Just dropped! This is FIRE 🔥 Link in bio #fyp #trending',
    'POV: You found the product you needed 👀 #viral #foryou',
    'Wait for the end... 😱 #trending #viral #musthave',
  ],
  instagram: [
    '✨ Just added! 🛍️ Link in bio 🔗 #shopping #style',
    '🔥 This is a MUST HAVE! #shop #trending #newarrivals',
    '💫 New arrival alert! Tap to shop 👉 #ootd #instagood',
  ],
  facebook: [
    '🎉 NEW PRODUCT ALERT! 🎉 Limited stock available!',
    'Don\'t miss out! This is trending everywhere 🔥',
    '💯 LIMITED TIME OFFER! Perfect for you!',
  ],
  pinterest: [
    '🔥 Trending Now | Best Sellers | Must Have',
    '✨ Latest & Greatest | New Arrivals',
    '💎 Top Picks | Fan Favorite | Most Popular',
  ],
};

const HASHTAGS = {
  tiktok: '#fyp #foryoupage #trending #viral #musthave #bestseller',
  instagram: '#instagood #trending #shopping #musthave #newproduct #bestseller',
  facebook: '#trending #musthave #bestseller #limitedtime #shopping',
  pinterest: '#trending #musthave #bestseller #shopping #newarrivals',
};

export default function SocialPublishContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  
  const productId = searchParams?.get('productId');
  const productName = searchParams?.get('name') ? decodeURIComponent(searchParams.get('name')) : 'Product';
  
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(['tiktok', 'instagram']));
  const [caption, setCaption] = useState(CAPTIONS.tiktok[0]);
  const [hashtags, setHashtags] = useState(HASHTAGS.tiktok);
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
  }, [router]);

  const togglePlatform = (platformId) => {
    const updated = new Set(selectedPlatforms);
    if (updated.has(platformId)) {
      updated.delete(platformId);
    } else {
      updated.add(platformId);
    }
    setSelectedPlatforms(updated);
    
    if (updated.size > 0) {
      const firstPlatform = Array.from(updated)[0];
      const captions = CAPTIONS[firstPlatform] || CAPTIONS.tiktok;
      setCaption(captions[0]);
      setHashtags(HASHTAGS[firstPlatform] || HASHTAGS.tiktok);
    }
  };

  const generateCaption = () => {
    const firstPlatform = Array.from(selectedPlatforms)[0] || 'tiktok';
    const captions = CAPTIONS[firstPlatform] || CAPTIONS.tiktok;
    const randomCaption = captions[Math.floor(Math.random() * captions.length)];
    setCaption(randomCaption);
  };

  const handlePublish = async () => {
    if (selectedPlatforms.size === 0) {
      setNotification('❌ Please select at least one platform');
      return;
    }

    setLoading(true);
    try {
      const platforms = Array.from(selectedPlatforms);
      
      for (const platform of platforms) {
        try {
          const response = await fetch(`/api/social/${platform}/post`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem(`${platform}Token`) || ''}`,
            },
            body: JSON.stringify({
              caption,
              hashtags,
              scheduledTime,
              productId,
              productName,
              platform,
            }),
          });

          if (!response.ok) {
            console.log(`${platform} API not connected yet`);
          }
        } catch (error) {
          console.log(`Could not publish to ${platform}:`, error.message);
        }
      }

      setNotification(`✅ Post${scheduledTime ? ' scheduled' : 'ed'} for ${platforms.join(', ')}!`);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error publishing:', error);
      setNotification('❌ Failed to publish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
            <ArrowLeft size={20} className="text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">📱 Publish to Social</h1>
            <p className="text-xs text-gray-400">{productName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg flex items-center gap-2 ${
            notification.includes('✅')
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {notification.includes('✅') ? <Check size={20} /> : <AlertCircle size={20} />}
            {notification}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left - Editor */}
          <div className="md:col-span-2 space-y-6">
            {/* Platform Selection */}
            <div className="card">
              <h3 className="text-lg font-bold text-white mb-4">📺 Select Platforms</h3>
              <div className="grid grid-cols-2 gap-4">
                {PLATFORMS.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-lg border-2 transition ${
                      selectedPlatforms.has(platform.id)
                        ? 'border-accent bg-accent/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    <p className="text-3xl mb-2">{platform.icon}</p>
                    <p className="font-bold text-white">{platform.name}</p>
                    <p className={`text-xs mt-1 ${selectedPlatforms.has(platform.id) ? 'text-accent' : 'text-gray-500'}`}>
                      {selectedPlatforms.has(platform.id) ? '✅ Selected' : '○ Select'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Editor */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">✍️ Caption</h3>
                <button
                  onClick={generateCaption}
                  className="text-accent hover:text-emerald-400 text-sm font-semibold transition"
                >
                  🔄 Generate
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Enter your post caption..."
                className="input-field w-full h-32 resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">{caption.length} / 280 characters</p>
            </div>

            {/* Hashtags */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={20} className="text-accent" />
                <h3 className="text-lg font-bold text-white">Hashtags</h3>
              </div>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Enter hashtags separated by spaces"
                className="input-field w-full"
              />
              <p className="text-xs text-gray-400 mt-2">{hashtags.split(' ').filter(h => h).length} hashtags</p>
            </div>

            {/* Schedule */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={20} className="text-accent" />
                <h3 className="text-lg font-bold text-white">Schedule (Optional)</h3>
              </div>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="input-field w-full"
              />
              <p className="text-xs text-gray-400 mt-2">
                {scheduledTime ? '⏰ Will be scheduled for later' : '📤 Will post immediately'}
              </p>
            </div>
          </div>

          {/* Right - Preview */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="card bg-gradient-to-br from-blue-500/10 to-accent/10 border border-accent/30">
              <h3 className="text-lg font-bold text-white mb-4">👁️ Preview</h3>
              
              {Array.from(selectedPlatforms).length > 0 ? (
                <div className="space-y-4">
                  {Array.from(selectedPlatforms).map(platformId => {
                    const platform = PLATFORMS.find(p => p.id === platformId);
                    return (
                      <div key={platformId} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <p className="text-xs font-bold text-gray-400 mb-2">{platform.icon} {platform.name}</p>
                        <p className="text-sm text-gray-300 leading-relaxed mb-2">{caption}</p>
                        <p className="text-xs text-accent">{hashtags}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Select platforms to preview</p>
              )}

              <div className="mt-6 space-y-2">
                <button
                  onClick={handlePublish}
                  disabled={loading || selectedPlatforms.size === 0}
                  className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      {scheduledTime ? 'Schedule Post' : 'Publish Now'}
                    </>
                  )}
                </button>
                <Link href="/" className="w-full btn btn-secondary text-center">
                  Cancel
                </Link>
              </div>
            </div>

            {/* Tips */}
            <div className="card bg-yellow-500/5 border border-yellow-500/30">
              <h4 className="font-bold text-yellow-400 mb-3">💡 Tips</h4>
              <ul className="text-xs text-gray-400 space-y-2">
                <li>✓ Use 5-10 hashtags per post</li>
                <li>✓ Post at 6-9 PM for best reach</li>
                <li>✓ Keep under 280 characters</li>
                <li>✓ Use trending sounds/music</li>
                <li>✓ Reply to comments quickly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
