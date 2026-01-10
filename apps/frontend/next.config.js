/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'static.truyenfull.vision', 'cache.staticscdn.net', 'iads.staticscdn.net', 'images.unsplash.com', 'lh3.googleusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'static.truyenfull.vision',
      },
      {
        protocol: 'https',
        hostname: 'cache.staticscdn.net',
      },
      {
        protocol: 'https',
        hostname: 'iads.staticscdn.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    // Image optimization settings - PRO MAX
    formats: ['image/avif', 'image/webp'], // AVIF first (best compression), then WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Icon and thumbnail sizes
    minimumCacheTTL: 31536000, // 1 year cache (images don't change often)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Code splitting
  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'axios'],
  },
  async rewrites() {
    // 🍎 iOS Safari Fix: Proxy API requests to same domain
    // This makes cookies work as first-party cookies!
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`, // Remove /api duplication
      },
    ];
  },
};

module.exports = nextConfig;

