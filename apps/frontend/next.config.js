/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com', 'static.truyenfull.vision', 'cache.staticscdn.net', 'iads.staticscdn.net', 'images.unsplash.com', 'lh3.googleusercontent.com', 'gtvseo.com', 'ui-avatars.com'],
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
      {
        protocol: 'https',
        hostname: 'gtvseo.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
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
        destination: `${backendUrl}/api/:path*`, // Keep /api prefix for backend
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
