'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Zap, DollarSign, TrendingUp, AlertCircle, Check, Loader, BarChart3 } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';

const AD_PLATFORMS = [
  { id: 'facebook', name: 'Facebook Ads', icon: '👍', minBudget: 5 },
  { id: 'tiktok', name: 'TikTok Ads', icon: '🎵', minBudget: 20 },
  { id: 'google', name: 'Google Ads', icon: '🔍', minBudget: 10 },
  { id: 'instagram', name: 'Instagram Ads', icon: '📷', minBudget: 5 },
];

const INTERESTS = [
  'Programming', 'Coding', 'Development', 'Web Design',
  'Fitness', 'Wellness', 'Yoga', 'Health',
  'Dogs', 'Pets', 'Animals', 'Cat Lovers',
  'Gaming', 'Esports', 'PC Games', 'Mobile Gaming',
  'Fashion', 'Style', 'Lifestyle', 'Travel',
];

const AGES = ['18-24', '25-34', '35-44', '45-54', '55+'];

export default function Marketing() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [campaigns, setCampaigns] = useState([]);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set(['facebook']));
  const [dailyBudget, setDailyBudget] = useState('10');
  const [duration, setDuration] = useState('10');
  const [selectedInterests, setSelectedInterests] = useState(new Set(['Programming']));
  const [selectedAgeRange, setSelectedAgeRange] = useState('25-34');
  const [targetingLocation, setTargetingLocation] = useState('Worldwide');

  useEffect(() => {
    setMounted(true);
    const currentUser = getUser();
    const token = getToken();

    if (!currentUser || !token) {
      router.push('/auth/login');
      return;
    }

    setUser(currentUser);
    loadCampaigns();
  }, [router]);

  const loadCampaigns = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('campaigns') || '[]');
      setCampaigns(saved);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const calculateROI = () => {
    const totalBudget = parseInt(dailyBudget) * parseInt(duration);
    const cpc = 0.5;
    const ctr = 0.02;
    const conversionRate = 0.02;
    const avgOrderValue = 35;
    const profitPerOrder = 20;

    const clicks = Math.round(totalBudget / cpc);
    const conversions = Math.round(clicks * ctr * conversionRate);
    const revenue = conversions * avgOrderValue;
    const profit = conversions * profitPerOrder;
    const roi = ((profit - totalBudget) / totalBudget) * 100;

    return {
      totalBudget,
      clicks,
      conversions,
      revenue: revenue.toFixed(2),
      profit: profit.toFixed(2),
      roi: roi.toFixed(0),
    };
  };

  const togglePlatform = (platformId) => {
    const updated = new Set(selectedPlatforms);
    if (updated.has(platformId)) {
      updated.delete(platformId);
    } else {
      updated.add(platformId);
    }
    setSelectedPlatforms(updated);
  };

  const toggleInterest = (interest) => {
    const updated = new Set(selectedInterests);
    if (updated.has(interest)) {
      updated.delete(interest);
    } else {
      updated.add(interest);
    }
    setSelectedInterests(updated);
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      setNotification('❌ Please enter a campaign name');
      return;
    }

    if (selectedPlatforms.size === 0) {
      setNotification('❌ Please select at least one platform');
      return;
    }

    if (selectedInterests.size < 3) {
      setNotification('❌ Please select at least 3 interests');
      return;
    }

    setLoading(true);
    try {
      const totalBudget = parseInt(dailyBudget) * parseInt(duration);
      const newCampaign = {
        id: Date.now(),
        name: campaignName,
        platforms: Array.from(selectedPlatforms),
        dailyBudget: parseFloat(dailyBudget),
        totalBudget,
        duration: parseInt(duration),
        interests: Array.from(selectedInterests),
        ageRange: selectedAgeRange,
        location: targetingLocation,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Try to publish to ad APIs
      for (const platform of newCampaign.platforms) {
        try {
          const response = await fetch(`/api/ads/${platform}/create-campaign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem(`${platform}Token`) || ''}`,
            },
            body: JSON.stringify(newCampaign),
          });

          if (response.ok) {
            newCampaign.status = 'active';
          }
        } catch (error) {
          console.log(`${platform} API not connected yet`);
        }
      }

      const updated = [...campaigns, newCampaign];
      setCampaigns(updated);
      localStorage.setItem('campaigns', JSON.stringify(updated));

      setNotification('✅ Campaign created successfully!');
      
      // Reset form
      setCampaignName('');
      setSelectedPlatforms(new Set(['facebook']));
      setDailyBudget('10');
      setDuration('10');
      setSelectedInterests(new Set(['Programming']));
      setSelectedAgeRange('25-34');
      setStep(1);

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setNotification('❌ Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const roi = calculateROI();

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-secondary border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">🎯 Ad Campaigns</h1>
              <p className="text-xs text-gray-400">Create and manage campaigns</p>
            </div>
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
          {/* Left - Campaign Builder */}
          <div className="md:col-span-2 space-y-6">
            {/* Step 1: Campaign Info */}
            {step === 1 && (
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">📝 Campaign Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g., Programmer Tshirt Q1 2025"
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-3">Select Ad Platforms</label>
                    <div className="grid grid-cols-2 gap-3">
                      {AD_PLATFORMS.map(platform => (
                        <button
                          key={platform.id}
                          onClick={() => togglePlatform(platform.id)}
                          className={`p-3 rounded-lg border-2 transition text-left ${
                            selectedPlatforms.has(platform.id)
                              ? 'border-accent bg-accent/10'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                        >
                          <p className="text-2xl">{platform.icon}</p>
                          <p className="font-bold text-white text-sm">{platform.name}</p>
                          <p className="text-xs text-gray-400">Min: ${platform.minBudget}/day</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!campaignName.trim() || selectedPlatforms.size === 0}
                    className="w-full btn btn-primary disabled:opacity-50"
                  >
                    Continue to Budget
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Budget */}
            {step === 2 && (
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">💰 Budget Setup</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Daily Budget ($)</label>
                    <input
                      type="number"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      min="5"
                      className="input-field w-full"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum: $5/day</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (days)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="1"
                      max="90"
                      className="input-field w-full"
                    />
                  </div>

                  <div className="bg-gray-800/50 rounded p-4">
                    <p className="text-sm text-gray-400 mb-1">Total Budget</p>
                    <p className="text-3xl font-bold text-accent">${roi.totalBudget}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 btn btn-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="flex-1 btn btn-primary"
                    >
                      Continue to Targeting
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Targeting */}
            {step === 3 && (
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">🎯 Target Audience</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Age Range</label>
                    <div className="flex gap-2 flex-wrap">
                      {AGES.map(age => (
                        <button
                          key={age}
                          onClick={() => setSelectedAgeRange(age)}
                          className={`px-4 py-2 rounded font-semibold transition ${
                            selectedAgeRange === age
                              ? 'bg-accent text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {age}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Location</label>
                    <input
                      type="text"
                      value={targetingLocation}
                      onChange={(e) => setTargetingLocation(e.target.value)}
                      placeholder="e.g., Worldwide, United States"
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Interests (Select 3+)</label>
                    <div className="flex gap-2 flex-wrap">
                      {INTERESTS.map(interest => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1 rounded text-sm font-semibold transition ${
                            selectedInterests.has(interest)
                              ? 'bg-accent text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Selected: {selectedInterests.size}/20</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 btn btn-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreateCampaign}
                      disabled={loading || selectedInterests.size < 3}
                      className="flex-1 btn btn-primary disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader size={16} className="animate-spin inline mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Campaign'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - ROI Projection */}
          <div className="space-y-6">
            {/* ROI Calculator */}
            <div className="card bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-green-400" />
                ROI Projection
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-400">Budget</p>
                  <p className="text-2xl font-bold text-accent">${roi.totalBudget}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-400">Est. Clicks</p>
                  <p className="text-2xl font-bold text-white">{roi.clicks}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-400">Est. Sales</p>
                  <p className="text-2xl font-bold text-green-400">{roi.conversions}</p>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <p className="text-xs text-gray-400">Est. Profit</p>
                  <p className="text-2xl font-bold text-green-300">${roi.profit}</p>
                </div>
                <div className={`rounded p-3 border-2 ${
                  parseInt(roi.roi) > 100
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-gray-800/50 border-gray-700'
                }`}>
                  <p className="text-xs text-gray-400">ROI</p>
                  <p className={`text-3xl font-bold ${parseInt(roi.roi) > 100 ? 'text-green-400' : 'text-white'}`}>
                    {roi.roi}%
                  </p>
                </div>
              </div>
              {parseInt(roi.roi) > 100 && (
                <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm font-semibold">
                  ✅ PROFITABLE CAMPAIGN!
                </div>
              )}
            </div>

            {/* Active Campaigns */}
            <div className="card">
              <h3 className="text-lg font-bold text-white mb-4">📊 Active ({campaigns.filter(c => c.status === 'active').length})</h3>
              {campaigns.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-gray-800/50 rounded p-3 border border-gray-700">
                      <p className="font-semibold text-white text-sm">{campaign.name}</p>
                      <p className="text-xs text-gray-400">
                        ${campaign.dailyBudget}/day • {campaign.platforms.join(', ')}
                      </p>
                      <p className={`text-xs mt-1 font-bold ${
                        campaign.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {campaign.status === 'active' ? '✅ Active' : '⏳ Pending'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No campaigns yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
