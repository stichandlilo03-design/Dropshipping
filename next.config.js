/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    cacheMaxMemorySize: 52 * 1024 * 1024, // 52MB (default is 50MB)
  },
};

module.exports = nextConfig;
