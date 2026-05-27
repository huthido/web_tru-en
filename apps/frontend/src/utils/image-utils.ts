/**
 * Image Optimization Utilities
 * Helper functions for image optimization across the app
 * Features: CDN integration, compression, format optimization
 */

// Mirrors remotePatterns in next.config.js — these domains are whitelisted at build time
// and can be used directly with next/image. All other HTTPS domains must go through the proxy.
const BUILTIN_IMAGE_DOMAINS = new Set([
  'res.cloudinary.com',
  'static.truyenfull.vision',
  'cache.staticscdn.net',
  'iads.staticscdn.net',
  'images.unsplash.com',
  'lh3.googleusercontent.com',
  'gtvseo.com',
  'ui-avatars.com',
  'i.pinimg.com',
]);

/**
 * Trả về src an toàn cho next/image khi hiển thị ảnh từ domain ngoài.
 * - Domain built-in → giữ nguyên URL (đã có trong remotePatterns).
 * - Domain khác (admin-added) → route qua /api/image-proxy để validate trước khi fetch.
 * - URL tương đối / data: / blob: → giữ nguyên.
 */
export function getExternalImageSrc(src: string): string {
  if (!src) return src;
  if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) return src;
  try {
    const { hostname } = new URL(src);
    if (BUILTIN_IMAGE_DOMAINS.has(hostname.toLowerCase())) return src;
    return `/api/image-proxy?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

/**
 * Check if image URL should be unoptimized
 * Some external CDNs don't support Next.js image optimization
 */
export function shouldUnoptimizeImage(src: string): boolean {
  if (!src) return false;

  const unoptimizedDomains = [
    'images.unsplash.com',
    'cache.staticscdn.net',
    'iads.staticscdn.net',
  ];

  return unoptimizedDomains.some(domain => src.includes(domain));
}

/**
 * Kiểm tra src có dùng được cho next/image hay không.
 *
 * next/image chỉ nhận: URL tuyệt đối (http/https), đường dẫn gốc (bắt đầu "/"),
 * hoặc data:/blob:. Bất kỳ giá trị nào khác — chuỗi rác, path tương đối thiếu
 * "/" (ví dụ "s") — sẽ khiến next/image NÉM lỗi runtime làm trắng cả trang.
 * Dùng hàm này để chặn (guard) trước mọi <Image>, fallback an toàn thay vì crash.
 */
export function isUsableImageSrc(src: unknown): src is string {
  if (typeof src !== 'string') return false;
  const s = src.trim();
  if (!s) return false;
  return (
    s.startsWith('/') ||
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:') ||
    s.startsWith('blob:')
  );
}

/**
 * Get optimal image sizes for different use cases
 * Responsive sizes for better performance
 */
export const ImageSizes = {
  // Book cover sizes
  bookCard: '(max-width: 640px) 150px, 150px',
  bookDetail: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px',
  bookThumbnail: '(max-width: 640px) 96px, 96px',

  // Ad sizes
  banner: '(max-width: 768px) 100vw, (max-width: 1200px) 728px, 970px',
  adBanner: '(max-width: 768px) 100vw, 800px',
  adPopup: '(max-width: 768px) 90vw, 800px',
  adFull: '100vw',
  sidebar: '(max-width: 1024px) 0px, 256px',

  // General responsive
  responsive: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fullWidth: '100vw',

  // Avatar/Profile
  avatar: '(max-width: 640px) 40px, 64px',
  avatarLarge: '(max-width: 640px) 96px, 128px',

  // QR Code / Support images
  qrCode: '(max-width: 768px) 256px, 320px',

  // Logo
  logo: '(max-width: 768px) 120px, 150px',
} as const;

/**
 * Get optimal quality for different image types
 */
export const ImageQuality = {
  thumbnail: 75,
  standard: 85,
  high: 90,
  maximum: 100,
} as const;

/**
 * Optimize image URL with CDN parameters
 * Supports multiple CDN providers with automatic format optimization
 */
export function optimizeImageUrl(
  src: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  }
): string {
  if (!src) return src;

  const { width, height, quality = 85, format = 'auto' } = options || {};

  // Cloudinary optimization
  if (src.includes('cloudinary.com')) {
    const url = new URL(src);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    if (format === 'webp') url.searchParams.set('f', 'webp');
    if (format === 'avif') url.searchParams.set('f', 'avif');
    if (format === 'auto') url.searchParams.set('f', 'auto');
    return url.toString();
  }

  // Static CDN optimization (if supported)
  if (src.includes('cache.staticscdn.net') || src.includes('iads.staticscdn.net')) {
    // These CDNs might support query parameters for optimization
    // Adjust based on your CDN provider's API
    const url = new URL(src);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    return url.toString();
  }

  // Return original URL if no optimization available
  return src;
}

/**
 * Generate Cloudinary optimized URL (legacy function, use optimizeImageUrl instead)
 * @deprecated Use optimizeImageUrl instead
 */
export function getOptimizedCloudinaryUrl(
  src: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  }
): string {
  return optimizeImageUrl(src, options);
}

/**
 * Get responsive srcset for better image loading
 * Generates multiple image sizes for responsive loading
 */
export function getResponsiveSrcSet(
  baseUrl: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  return sizes
    .map(size => `${optimizeImageUrl(baseUrl, { width: size })} ${size}w`)
    .join(', ');
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Check if browser supports AVIF format
 */
export function supportsAVIF(): boolean {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  try {
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  } catch {
    return false;
  }
}

/**
 * Get best image format based on browser support
 */
export function getBestImageFormat(): 'webp' | 'avif' | 'auto' {
  if (typeof window === 'undefined') return 'auto';
  if (supportsAVIF()) return 'avif';
  if (supportsWebP()) return 'webp';
  return 'auto';
}
