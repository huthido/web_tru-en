/**
 * Chuẩn hoá buffer ảnh: detect format thật bằng sharp, resize, re-encode theo
 * policy. Dùng chung cho ImageNormalizePipe (upload runtime) và migrate
 * Cloudinary → Garage script. GIF/SVG luôn passthrough để giữ animation/vector.
 */
import sharp = require('sharp');
import { extFromContentType, mimeFromSharpFormat } from './extensions';

export type NormalizePolicy = 'force-webp' | 'preserve-format' | 'force-jpeg';

export interface NormalizeOptions {
  /** Bắt buộc — width tối đa sau resize (px). */
  maxWidth: number;
  /** Quality cho lossy encoder (jpeg/webp/avif). Default 80. */
  quality?: number;
  /** Chiến lược output format. Default 'force-webp'. */
  policy?: NormalizePolicy;
  /** True (pipe): sharp lỗi → throw UnreadableImageError. False (migration): passthrough buffer gốc. */
  throwOnUnreadable?: boolean;
}

export interface NormalizedBuffer {
  buffer: Buffer;
  contentType: string;
  ext: string;
  originalContentType: string;
  width: number;
  height: number;
  originalBytes: number;
  outputBytes: number;
  resized: boolean;
  reencoded: boolean;
}

export class UnreadableImageError extends Error {
  constructor(
    public readonly declaredMime: string,
    public readonly reason: string,
  ) {
    super(`Unreadable image (declared=${declaredMime}): ${reason}`);
    this.name = 'UnreadableImageError';
  }
}

function passthrough(
  buf: Buffer,
  declaredCT: string,
  realCT?: string,
  width = 0,
  height = 0,
): NormalizedBuffer {
  return {
    buffer: buf,
    contentType: declaredCT,
    ext: extFromContentType(declaredCT),
    originalContentType: realCT ?? declaredCT,
    width,
    height,
    originalBytes: buf.length,
    outputBytes: buf.length,
    resized: false,
    reencoded: false,
  };
}

export async function normalizeBuffer(
  buf: Buffer,
  declaredCT: string,
  opts: NormalizeOptions,
): Promise<NormalizedBuffer> {
  const policy = opts.policy ?? 'force-webp';
  const quality = opts.quality ?? 80;
  const declaredType = (declaredCT || 'application/octet-stream').split(';')[0].trim().toLowerCase();

  // Animation + vector — passthrough nguyên xi.
  if (declaredType === 'image/gif' || declaredType === 'image/svg+xml') {
    return passthrough(buf, declaredCT);
  }

  let img: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    img = sharp(buf, { failOn: 'none', animated: false });
    meta = await img.metadata();
  } catch (err: any) {
    if (opts.throwOnUnreadable) {
      throw new UnreadableImageError(declaredType, err?.message || 'sharp parse failed');
    }
    return passthrough(buf, declaredCT);
  }

  if (!meta.width || !meta.height) {
    if (opts.throwOnUnreadable) {
      throw new UnreadableImageError(declaredType, 'missing-dimensions');
    }
    return passthrough(buf, declaredCT);
  }

  const realCT = mimeFromSharpFormat(meta.format);
  const needsResize = meta.width > opts.maxWidth;
  const pipeline = needsResize
    ? img.resize({ width: opts.maxWidth, withoutEnlargement: true })
    : img;

  let out: Buffer;
  let outCT: string;
  let outExt: string;

  if (policy === 'preserve-format') {
    // Giữ logic migration script: PNG-alpha→PNG, WebP→WebP, AVIF→AVIF, else→JPEG.
    if (meta.format === 'png' && meta.hasAlpha) {
      out = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
      outCT = 'image/png';
      outExt = '.png';
    } else if (meta.format === 'webp') {
      out = await pipeline.webp({ quality }).toBuffer();
      outCT = 'image/webp';
      outExt = '.webp';
    } else if (meta.format === 'avif') {
      out = await pipeline.avif({ quality }).toBuffer();
      outCT = 'image/avif';
      outExt = '.avif';
    } else {
      out = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      outCT = 'image/jpeg';
      outExt = '.jpg';
    }
  } else if (policy === 'force-jpeg') {
    out = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    outCT = 'image/jpeg';
    outExt = '.jpg';
  } else {
    // force-webp (default) — alpha giữ tự nhiên trong WebP.
    out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    outCT = 'image/webp';
    outExt = '.webp';
  }

  // Nếu không cần resize, không đổi format thật, và output không nhỏ hơn input → giữ input
  // (tiết kiệm CPU phía CDN + tránh re-encode JPEG vô ích).
  if (!needsResize && out.length >= buf.length && realCT === outCT) {
    return {
      buffer: buf,
      contentType: outCT,
      ext: outExt,
      originalContentType: realCT,
      width: meta.width,
      height: meta.height,
      originalBytes: buf.length,
      outputBytes: buf.length,
      resized: false,
      reencoded: false,
    };
  }

  return {
    buffer: out,
    contentType: outCT,
    ext: outExt,
    originalContentType: realCT,
    width: needsResize ? opts.maxWidth : meta.width,
    height: needsResize
      ? Math.round((meta.height * opts.maxWidth) / meta.width)
      : meta.height,
    originalBytes: buf.length,
    outputBytes: out.length,
    resized: needsResize,
    reencoded: true,
  };
}
