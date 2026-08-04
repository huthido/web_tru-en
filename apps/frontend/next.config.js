/** @type {import('next').NextConfig} */
// PWA cache cho CDN Garage — bật khi NEXT_PUBLIC_CDN_HOST có giá trị.
const pwaCdnHost = (process.env.NEXT_PUBLIC_CDN_HOST || '').trim();
const cdnRuntimeCache = pwaCdnHost
  ? [{
      // Escape dot trong hostname để regex không match wildcard.
      urlPattern: new RegExp(`^https://${pwaCdnHost.replace(/\./g, '\\.')}/.*`, 'i'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    }]
  : [];

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    ...cdnRuntimeCache,
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
    document: '/ngoai-tuyen',
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

// Garage CDN: ảnh upload đẩy thẳng lên Garage trả URL có hostname của
// S3_PUBLIC_BASE_URL (backend). Tách qua build arg NEXT_PUBLIC_CDN_HOST để
// next/image whitelist được. Bỏ trống = không bật (chưa dùng Garage).
const cdnImagePatterns = [];
const cdnHost = (process.env.NEXT_PUBLIC_CDN_HOST || '').trim();
if (cdnHost) {
  cdnImagePatterns.push({ protocol: 'https', hostname: cdnHost });
}

/**
 * 301 cho những truyện đã đổi slug.
 *
 * `generateSlug` từng xoá luôn nguyên âm có dấu thay vì chuyển thành chữ không
 * dấu, nên 82/128 truyện công khai mang URL vô nghĩa (`/vt-khu-ca-qu` thay vì
 * `/vet-khau-cua-quy`). Hàm đã sửa, dữ liệu cũ được đổi bằng
 * `apply-slug-map.js` — script đó đọc CHÍNH file JSON này, nên DB và bảng
 * redirect không thể lệch nhau.
 *
 * Mỗi truyện sinh hai rule:
 *   - đúng đường dẫn truyện
 *   - wildcard `:path*` để mọi URL chương bên dưới đi theo. Nhờ vậy slug chương
 *     (cũng méo, `chap-1-khi-u`) không cần đổi và không có URL nào gãy.
 *
 * File thiếu thì bỏ qua, không làm hỏng build — lần build đầu tiên chưa có nó.
 */
function slugRedirects() {
  let entries = [];
  try {
    entries = require('./slug-redirects.json');
  } catch (e) {
    return [];
  }

  return entries.flatMap(({ from, to }) => {
    if (!from || !to) return [];
    return [
      { source: `/truyen/${from}`, destination: `/truyen/${to}`, permanent: true },
      { source: `/truyen/${from}/:path*`, destination: `/truyen/${to}/:path*`, permanent: true },
    ];
  });
}

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Produces a self-contained server in .next/standalone for Docker
  images: {
    domains: ['res.cloudinary.com', 'static.truyenfull.vision', 'cache.staticscdn.net', 'iads.staticscdn.net', 'images.unsplash.com', 'lh3.googleusercontent.com', 'gtvseo.com', 'ui-avatars.com', 'i.pinimg.com'],
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
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      // Ảnh upload local do backend phục vụ (story-covers, avatar...).
      ...apiImagePatterns,
      // Garage CDN public (cdn.yourdomain.com) — bật bằng NEXT_PUBLIC_CDN_HOST.
      ...cdnImagePatterns,
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
  /**
   * Security headers + CSP whitelist cho 3rd-party ad networks.
   * Google AdSense/AdMob/FAN cần `unsafe-inline` + `unsafe-eval` cho script
   * inject của họ — không tránh được. Thay vào đó whitelist domain cụ thể
   * thay vì `*`.
   *
   * Dev mode (NODE_ENV !== 'production') loose hơn: cho phép connect HTTP
   * + WS để frontend fetch local backend (http://localhost:3009) + HMR
   * websocket. Prod giữ chặt chỉ HTTPS.
   */
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const connectSrc = isDev
      ? "connect-src 'self' http: https: ws: wss:"
      : "connect-src 'self' https: wss:";

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.googletagservices.com https://*.facebook.com https://*.fbcdn.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:", // ads serve images từ nhiều CDN
      "font-src 'self' data: https://fonts.gstatic.com",
      connectSrc,
      "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://*.facebook.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');

    /**
     * Cache cho trang nội dung công khai.
     *
     * Đo trên production 04/08/2026: MỌI trang HTML trả về
     * `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
     * Đó là mặc định của Next cho trang render động, và nó buộc Googlebot tải
     * lại toàn bộ ~1.600 URL chương ở mỗi lượt crawl — đốt sạch crawl budget
     * của một site mới, khiến phần lớn URL không bao giờ được index.
     *
     * Đặt `revalidate` trong page là chưa đủ: `/truyen` đọc `searchParams` nên
     * luôn bị đánh dấu động, Next sẽ không tự phát header ISR. Vì vậy khai báo
     * tường minh ở đây.
     *
     * An toàn để cache `public`: các server component chỉ prefetch API KHÔNG
     * kèm cookie, nên HTML sinh ra luôn là bản dành cho khách, giống hệt nhau
     * với mọi người dùng. Trạng thái đăng nhập được client tự nạp sau khi
     * hydrate. Các route cần đăng nhập KHÔNG nằm trong danh sách dưới đây và
     * vẫn giữ `no-store` mặc định.
     */
    const publicContentCache =
      'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';

    const PUBLIC_CONTENT_ROUTES = [
      '/',
      '/truyen',
      '/truyen/:path*',
      '/tranh',
      '/nghe-thuat',
      '/gioi-thieu',
      '/dieu-khoan',
      '/quyen-rieng-tu',
      '/ban-quyen',
      '/an-toan-tre-em',
      '/gop-y-phan-anh',
      '/lien-he-quang-cao',
      '/dang-ky-tac-gia',
      '/doi-tac-hop-tac',
    ];

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      ...PUBLIC_CONTENT_ROUTES.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: publicContentCache }],
      })),
      {
        // Sitemap dựng lại mỗi giờ (revalidate 3600) — cache khớp chu kỳ đó.
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },

  async redirects() {
    // URL tiếng Anh cũ → URL tiếng Việt mới (301). Giữ bookmark / link đã chia
    // sẻ / SEO không gãy sau khi đổi tên route. Query string được Next tự giữ.
    // Route con đổi tên (transactions→giao-dich, payment-result→...) khai báo
    // TRƯỚC route cha để khớp đúng, không dùng wildcard cho /wallet.
    const map = [
      ['/shop', '/cua-hang'],
      ['/wallet/transactions', '/vi-xu/giao-dich'],
      ['/wallet/payment-result', '/vi-xu/ket-qua-thanh-toan'],
      ['/wallet', '/vi-xu'],
      ['/profile', '/tai-khoan'],
      ['/favorites', '/yeu-thich'],
      ['/follows', '/dang-theo-doi'],
      ['/history', '/lich-su'],
      ['/library', '/thu-vien'],
      ['/search', '/tim-kiem'],
      ['/transfer', '/chuyen-xu'],
      ['/notifications', '/thong-bao'],
      // Trang hệ thống / pháp lý (client-side; redirect đỡ link ngoài store/PWA cũ)
      ['/maintenance', '/bao-tri'],
      ['/privacy', '/quyen-rieng-tu'],
      ['/terms', '/dieu-khoan'],
      ['/child-safety', '/an-toan-tre-em'],
      ['/offline', '/ngoai-tuyen'],
      ['/ads/:adId', '/xem-quang-cao/:adId'],
      // Phase 2 — đăng nhập/đăng ký (giữ /auth/callback + /auth/verify-email)
      ['/login', '/dang-nhap'],
      ['/register', '/dang-ky'],
      ['/forgot-password', '/quen-mat-khau'],
      ['/reset-password', '/dat-lai-mat-khau'],
      // Phase 3 — gộp route đọc truyện về /truyen (đã có /truyen/[slug] chi tiết)
      ['/stories/:storySlug/chapters/:chapterSlug', '/truyen/:storySlug/chuong/:chapterSlug'],
      ['/stories', '/truyen'],
      // Phase 4/5 — khu quản trị & tác giả: URL tiếng Anh cũ (từng live) → URL
      // tiếng Việt đầy đủ. Segment con đổi tên nên map tường minh, không wildcard.
      // Route cụ thể hơn đặt trước route tổng quát.
      ['/admin', '/quan-tri'],
      ['/admin/users', '/quan-tri/nguoi-dung'],
      ['/admin/ads/:id/analytics', '/quan-tri/quang-cao/:id/thong-ke'],
      ['/admin/ads/:id', '/quan-tri/quang-cao/:id'],
      ['/admin/ads', '/quan-tri/quang-cao'],
      ['/admin/ad-slots', '/quan-tri/vi-tri-quang-cao'],
      ['/admin/ad-bookings', '/quan-tri/dat-quang-cao'],
      ['/admin/coin-packages', '/quan-tri/goi-xu'],
      ['/admin/wallets', '/quan-tri/vi'],
      ['/admin/withdrawals', '/quan-tri/rut-xu'],
      ['/admin/payments', '/quan-tri/thanh-toan'],
      ['/admin/approvals', '/quan-tri/duyet-truyen'],
      ['/admin/stories', '/quan-tri/truyen'],
      ['/admin/chapters', '/quan-tri/chuong'],
      ['/admin/categories', '/quan-tri/the-loai'],
      ['/admin/pages', '/quan-tri/trang-noi-dung'],
      ['/admin/comments', '/quan-tri/binh-luan'],
      ['/admin/statistics', '/quan-tri/thong-ke'],
      ['/admin/notifications/create', '/quan-tri/thong-bao/tao'],
      ['/admin/notifications', '/quan-tri/thong-bao'],
      ['/admin/settings', '/quan-tri/cai-dat'],
      ['/author/dashboard', '/tac-gia/bang-dieu-khien'],
      ['/author/earnings', '/tac-gia/thu-nhap'],
      ['/author/eligibility', '/tac-gia/dieu-kien'],
      ['/author/followers', '/tac-gia/nguoi-theo-doi'],
      ['/author/withdrawals', '/tac-gia/rut-xu'],
      ['/author/stories/create', '/tac-gia/truyen/tao'],
      ['/author/stories/:storyId/chapters/create', '/tac-gia/truyen/:storyId/chuong/tao'],
      ['/author/stories/:storyId/chapters/:chapterId/edit', '/tac-gia/truyen/:storyId/chuong/:chapterId/sua'],
      ['/author/stories/:storyId/chapters', '/tac-gia/truyen/:storyId/chuong'],
      ['/author/stories/:storyId/edit', '/tac-gia/truyen/:storyId/sua'],
      ['/author/stories/:storyId/analytics', '/tac-gia/truyen/:storyId/thong-ke'],
      ['/author/stories', '/tac-gia/truyen'],
    ];
    // Tab nội dung cũ (?tab=) nay là trang riêng. Đặt TRƯỚC để khớp trước
    // redirect /stories→/truyen (một hop tới đúng trang).
    const tabRedirects = [
      { source: '/truyen', has: [{ type: 'query', key: 'tab', value: 'nghe-thuat' }], destination: '/nghe-thuat', permanent: true },
      { source: '/truyen', has: [{ type: 'query', key: 'tab', value: 'tranh' }], destination: '/tranh', permanent: true },
      { source: '/stories', has: [{ type: 'query', key: 'tab', value: 'nghe-thuat' }], destination: '/nghe-thuat', permanent: true },
      { source: '/stories', has: [{ type: 'query', key: 'tab', value: 'tranh' }], destination: '/tranh', permanent: true },
    ];
    return [
      ...tabRedirects,
      ...map.map(([source, destination]) => ({ source, destination, permanent: true })),
      ...slugRedirects(),
    ];
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
