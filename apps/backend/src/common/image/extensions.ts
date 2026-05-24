/**
 * Map MIME ↔ extension và sharp.format ↔ MIME.
 *
 * Dùng chung cho upload pipeline (ImageNormalizePipe) + migration script
 * (migrate-cloudinary-to-garage). Một nguồn duy nhất tránh lệch giữa logic
 * runtime và batch.
 */

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/svg+xml': '.svg',
};

export function extFromContentType(contentType: string): string {
  const type = contentType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[type] || '.jpg';
}

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  heif: 'image/heic',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
};

export function mimeFromSharpFormat(format: string | undefined): string {
  if (!format) return 'application/octet-stream';
  return SHARP_FORMAT_TO_MIME[format.toLowerCase()] || `image/${format.toLowerCase()}`;
}

export function replaceExt(filename: string | undefined, newExt: string): string {
  const base = (filename || 'image').replace(/\.[^.]+$/, '');
  return base + newExt;
}
