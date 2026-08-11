import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import sharp = require('sharp');
import { Public } from '../auth/decorators/public.decorator';

/** Ảnh gốc tối đa cho phép transcode — chặn fetch file khổng lồ. */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Fallback cho trình duyệt không decode được WebP (Safari iOS < 14).
 *
 * Toàn bộ ảnh upload được chuẩn hoá `force-webp` và lưu tĩnh trên Garage —
 * không có content negotiation như Cloudinary f_auto, nên iOS 12 tải file về
 * mà không hiển thị được. HTML lại cache chung (s-maxage) nên không thể phân
 * nhánh theo User-Agent phía server; phía client sẽ probe WebP và viết lại
 * `src` sang endpoint này (xem frontend components/compat/webp-fallback.tsx).
 *
 * Chỉ nhận URL thuộc allowlist (CDN Garage + Cloudinary) — tránh SSRF.
 * Response cache dài hạn để CDN gánh, backend chỉ transcode lần đầu.
 */
@Controller('images')
export class ImagesCompatController {
  private readonly logger = new Logger(ImagesCompatController.name);
  private readonly allowedHosts: Set<string>;

  constructor(config: ConfigService) {
    this.allowedHosts = new Set(['res.cloudinary.com']);
    const publicBase = (config.get<string>('S3_PUBLIC_BASE_URL') || '').trim();
    if (publicBase) {
      try {
        this.allowedHosts.add(new URL(publicBase).host);
      } catch {
        // publicBase hỏng thì CloudinaryService đã log lỗi riêng
      }
    }
  }

  @Public()
  @SkipThrottle()
  @Get('compat')
  async compat(@Query('src') src: string, @Res() res: Response) {
    if (!src) {
      throw new BadRequestException('Thiếu tham số src');
    }

    let url: URL;
    try {
      url = new URL(src);
    } catch {
      throw new BadRequestException('src không phải URL hợp lệ');
    }
    if (url.protocol !== 'https:' || !this.allowedHosts.has(url.host)) {
      throw new BadRequestException('Nguồn ảnh không được phép');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url, { signal: controller.signal });
    } catch {
      throw new NotFoundException('Không tải được ảnh nguồn');
    } finally {
      clearTimeout(timer);
    }

    if (!upstream.ok) {
      throw new NotFoundException('Ảnh nguồn không tồn tại');
    }
    const declaredSize = Number(upstream.headers.get('content-length') || 0);
    if (declaredSize > MAX_SOURCE_BYTES) {
      throw new BadRequestException('Ảnh nguồn quá lớn');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
      throw new BadRequestException('Ảnh nguồn quá lớn');
    }

    // URL Garage đặt tên theo UUID, nội dung bất biến → cache thẳng tay.
    const cacheControl =
      'public, max-age=604800, s-maxage=31536000, stale-while-revalidate=86400';

    const sourceType = (upstream.headers.get('content-type') || '').toLowerCase();
    const needsTranscode =
      sourceType.includes('webp') || sourceType.includes('avif');

    if (!needsTranscode) {
      // Nguồn vốn đã là định dạng phổ thông — trả nguyên bản.
      res.setHeader('Content-Type', sourceType || 'application/octet-stream');
      res.setHeader('Cache-Control', cacheControl);
      res.send(buffer);
      return;
    }

    try {
      const jpeg = await sharp(buffer).jpeg({ quality: 82 }).toBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', cacheControl);
      res.send(jpeg);
    } catch (e: any) {
      this.logger.warn(`Transcode thất bại cho ${url.host}: ${e?.message ?? e}`);
      throw new BadRequestException('Không chuyển mã được ảnh nguồn');
    }
  }
}
