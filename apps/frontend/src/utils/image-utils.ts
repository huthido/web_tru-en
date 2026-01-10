/**
 * Image Optimization Utilities
 * Helper functions for image optimization across the app
 * Features: CDN integration, compression, format optimization
 */

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
 * Get optimal image sizes for different use cases
 * Responsive sizes for better performance
 */
export const ImageSizes = {
  // Book cover sizes
  bookCard: '(max-width: 640px) 150px, 150px',
  bookDetail: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px',
  bookThumbnail: '(max-width: 640px) 96px, 96px',

  // Ad sizes
  adBanner: '(max-width: 768px) 100vw, 800px',
  adPopup: '(max-width: 768px) 90vw, 800px',
  adFull: '100vw',

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
