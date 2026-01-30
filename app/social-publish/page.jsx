'use client';

import { Suspense } from 'react';
import SocialPublishContent from './content';

// Loading component
function SocialPublishLoading() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function SocialPublish() {
  return (
    <Suspense fallback={<SocialPublishLoading />}>
      <SocialPublishContent />
    </Suspense>
  );
}
