/**
 * Chuẩn hoá buffer ảnh: detect format thật bằng sharp, resize, re-encode theo
 * policy. Dùng chung cho ImageNormalizePipe (upload runtime) và migrate
 * Cloudinary → Garage script. GIF/SVG luôn passthrough để giữ animation/vector.
 *
 * HEIC/HEIF: sharp 0.33 cần libheif runtime (Linux: apk add vips-heif; macOS:
 * brew sharp). Khi không có (Windows dev, Alpine không cài), fallback sang
 * `heic-convert` (libheif WASM, pure JS) để decode → JPEG → đưa lại sharp.
 * Chậm hơn native nhưng đảm bảo HEIC chạy được mọi nơi.
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

/**
 * Detect HEIF/HEIC qua magic bytes (`ftyp` + brand HEIC/MIF1/...). Browser
 * thường gửi với MIME 'application/octet-stream' nên không tin được mime.
 */
function isHeifBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.toString('ascii', 4, 8) !== 'ftyp') return false;
  const brand = buf.toString('ascii', 8, 12).toLowerCase();
  return ['heic', 'heix', 'heif', 'mif1', 'msf1', 'hevc', 'hevm', 'hevs'].includes(brand);
}

async function convertHeicToJpeg(buf: Buffer): Promise<Buffer> {
  // Lazy-require: chỉ load WASM khi thật sự gặp HEIC; tiết kiệm startup time.
  const convert: (opts: {
    buffer: ArrayBuffer | Buffer | Uint8Array;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }) => Promise<ArrayBuffer> = require('heic-convert');
  const ab = await convert({ buffer: buf, format: 'JPEG', quality: 0.92 });
  return Buffer.from(ab);
}

async function runSharpPipeline(
  buf: Buffer,
  declaredCT: string,
  opts: NormalizeOptions,
): Promise<NormalizedBuffer> {
  const policy = opts.policy ?? 'force-webp';
  const quality = opts.quality ?? 80;
  const declaredType = (declaredCT || 'application/octet-stream')
    .split(';')[0]
    .trim()
    .toLowerCase();

  let img: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    img = sharp(buf, { failOn: 'none', animated: false });
    meta = await img.metadata();
  } catch (err: any) {
    throw new UnreadableImageError(declaredType, err?.message || 'sharp parse failed');
  }

  if (!meta.width || !meta.height) {
    throw new UnreadableImageError(declaredType, 'missing-dimensions');
  }

  const realCT = mimeFromSharpFormat(meta.format);
  const needsResize = meta.width > opts.maxWidth;
  const pipeline = needsResize
    ? img.resize({ width: opts.maxWidth, withoutEnlargement: true })
    : img;

  let out: Buffer;
  let outCT: string;
  let outExt: string;

  try {
    if (policy === 'preserve-format') {
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
      out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
      outCT = 'image/webp';
      outExt = '.webp';
    }
  } catch (err: any) {
    throw new UnreadableImageError(
      realCT,
      `encode-failed (format=${meta.format}): ${err?.message || 'unknown'}`,
    );
  }

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

export async function normalizeBuffer(
  buf: Buffer,
  declaredCT: string,
  opts: NormalizeOptions,
): Promise<NormalizedBuffer> {
  const declaredType = (declaredCT || 'application/octet-stream')
    .split(';')[0]
    .trim()
    .toLowerCase();

  // Animation + vector — passthrough nguyên xi.
  if (declaredType === 'image/gif' || declaredType === 'image/svg+xml') {
    return passthrough(buf, declaredCT);
  }

  const heifByMagic = isHeifBuffer(buf);

  try {
    return await runSharpPipeline(buf, declaredCT, opts);
  } catch (err) {
    // Sharp fail trên HEIC (libheif chưa cài / không decode được) → fallback
    // sang heic-convert WASM. Đảm bảo HEIC chạy được trên cả Windows dev và
    // Linux không có vips-heif.
    if (err instanceof UnreadableImageError && heifByMagic) {
      try {
        const jpegBuf = await convertHeicToJpeg(buf);
        return await runSharpPipeline(jpegBuf, 'image/jpeg', opts);
      } catch (convertErr: any) {
        const reason = `heic-convert fallback failed: ${convertErr?.message || 'unknown'}`;
        if (opts.throwOnUnreadable) {
          throw new UnreadableImageError('image/heic', reason);
        }
        return passthrough(buf, declaredCT);
      }
    }

    if (opts.throwOnUnreadable) throw err;
    return passthrough(buf, declaredCT);
  }
}
