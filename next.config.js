/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode for development
  reactStrictMode: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  
  // Handle dynamic pages that shouldn't be statically generated
  experimental: {
    // This helps with dynamic routes
    isrMemoryCacheSize: 52 * 50, // 52MB
  },
};

module.exports = nextConfig;
