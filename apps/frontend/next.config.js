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

// next/image yêu cầu whitelist host của ảnh từ xa. Ảnh upload local
// (story-covers, avatar...) do backend phục vụ tại /uploads/* — host của
// backend lấy từ NEXT_PUBLIC_API_URL nên dev lẫn prod đều tự khớp.
const apiImagePatterns = [];
try {
  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009');
  apiImagePatterns.push({
    protocol: apiUrl.protocol.replace(':', ''),
    hostname: apiUrl.hostname,
    ...(apiUrl.port ? { port: apiUrl.port } : {}),
    pathname: '/uploads/**',
  });
} catch (e) {
  // NEXT_PUBLIC_API_URL không hợp lệ -> bỏ qua, vẫn còn localhost bên dưới.
}

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Produces a self-contained server in .next/standalone for Docker
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
      // Ảnh upload local do backend phục vụ (story-covers, avatar...).
      ...apiImagePatterns,
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3009',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3009',
        pathname: '/uploads/**',
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
    //
    // NEXT_PUBLIC_API_URL must be passed as a BUILD ARG (Next inlines it at
    // build time). If it's missing in a production build we fail loudly here
    // instead of silently proxying every /api/* call to a dead default URL.
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3001');

    if (!backendUrl) {
      throw new Error(
        'NEXT_PUBLIC_API_URL is required for production builds — it is used by ' +
        'the /api/* rewrite proxy. Pass it as a Docker build arg (see ' +
        'apps/frontend/Dockerfile) / Coolify build env.'
      );
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`, // Keep /api prefix for backend
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
