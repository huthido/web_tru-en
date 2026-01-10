'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { shouldUnoptimizeImage, optimizeImageUrl, getBestImageFormat } from '@/utils/image-utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  unoptimized?: boolean;
  loading?: 'lazy' | 'eager';
}

/**
 * Generate a blur placeholder data URL (SVG)
 * Creates a lightweight SVG placeholder for blur effect
 * Works on both client and server
 * Improved version with better visual quality
 */
export function generateBlurPlaceholder(width: number = 10, height: number = 10): string {
  // Create a more sophisticated blur placeholder
  // Using a subtle gradient that works well as a blur placeholder
  // Works in both browser and server (no Buffer dependency)
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad-${width}-${height}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#e5e7eb;stop-opacity:1" /><stop offset="50%" style="stop-color:#d1d5db;stop-opacity:1" /><stop offset="100%" style="stop-color:#9ca3af;stop-opacity:1" /></linearGradient></defs><rect width="100%" height="100%" fill="url(#grad-${width}-${height})" /></svg>`;

  // Use btoa for browser (works in both client and server if available)
  try {
    if (typeof window !== 'undefined' && typeof btoa !== 'undefined') {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    }
  } catch (e) {
    // Fall through to default
  }

  // For server-side rendering or when btoa is not available, return a simple base64 encoded placeholder
  // This is a generic gradient placeholder that works for any size
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZTZlN2ViO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iNTAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZDFkNWRiO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzljYTNhZjtzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyYWQpIiAvPjwvc3ZnPg==';
}

/**
 * Optimized Image Component
 * Features:
 * - Automatic lazy loading (Intersection Observer enhanced)
 * - WebP/AVIF format support (automatic detection)
 * - Responsive images with proper srcset
 * - Enhanced blur placeholder
 * - Error handling with retry
 * - CDN optimization
 * - Image compression via Next.js
 * - Better loading states
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  sizes,
  objectFit = 'cover',
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  unoptimized = false,
  loading = 'lazy',
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Optimize image URL with CDN parameters if supported
  const optimizedSrc = useMemo(() => {
    if (unoptimized || shouldUnoptimizeImage(src)) {
      return src;
    }

    // Try to optimize the URL if CDN supports it
    const format = getBestImageFormat();
    return optimizeImageUrl(src, {
      width: width,
      height: height,
      quality,
      format,
    });
  }, [src, width, height, quality, unoptimized]);

  // Generate blur placeholder
  const blurPlaceholder = useMemo(() => {
    if (blurDataURL) return blurDataURL;
    if (placeholder === 'blur') {
      return generateBlurPlaceholder(width || 10, height || 10);
    }
    return undefined;
  }, [blurDataURL, placeholder, width, height]);

  // Check if image should be unoptimized
  const shouldUnoptimize = useMemo(() => {
    return unoptimized || shouldUnoptimizeImage(src);
  }, [unoptimized, src]);

  // Determine object fit class
  const objectFitClass = useMemo(() => {
    const classes = {
      contain: 'object-contain',
      cover: 'object-cover',
      fill: 'object-fill',
      none: 'object-none',
      'scale-down': 'object-scale-down',
    };
    return classes[objectFit];
  }, [objectFit]);

  // Default sizes if not provided
  const defaultSizes = useMemo(() => {
    if (sizes) return sizes;
    if (fill) {
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
    }
    return width ? `${width}px` : '800px';
  }, [sizes, fill, width]);

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Handle image error with retry logic
  const handleError = () => {
    if (retryCount < 2 && !shouldUnoptimize) {
      // Retry with original URL if optimization failed
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      return;
    }
    setImageError(true);
    setIsLoading(false);
    onError?.();
  };

  // Error state UI
  if (imageError) {
    return (
      <div
        className={`bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${className}`}
        style={fill ? {} : { width, height }}
        role="img"
        aria-label={alt}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-400 dark:text-gray-500"
        >
          <path
            d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  // Use original src if retry is needed
  const imageSrc = retryCount > 0 ? src : optimizedSrc;

  const imageProps = {
    src: imageSrc,
    alt,
    className: `${objectFitClass} ${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`,
    priority: priority || loading === 'eager',
    sizes: defaultSizes,
    quality,
    unoptimized: shouldUnoptimize,
    loading: priority ? undefined : loading,
    onLoad: handleLoad,
    onError: handleError,
    ...(placeholder === 'blur' && blurPlaceholder && {
      placeholder: 'blur' as const,
      blurDataURL: blurPlaceholder,
    }),
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
      />
    );
  }

  if (!width || !height) {
    console.warn('OptimizedImage: width and height are required when fill is false');
    return null;
  }

  return (
    <Image
      {...imageProps}
      width={width}
      height={height}
    />
  );
}
