/**
 * Migrate ảnh từ Cloudinary về Garage (S3) — chạy MỘT LẦN.
 *
 * Quét toàn bộ DB tìm URL trỏ res.cloudinary.com, tải ảnh về, upload lên Garage,
 * rồi cập nhật URL trong DB sang Garage. Ảnh trên Cloudinary KHÔNG bị xoá — vẫn
 * giữ làm backup. Script idempotent: chạy lại chỉ xử lý URL Cloudinary còn sót.
 *
 * Cách chạy (trên server, trong container backend):
 *   docker exec <backend-container> node dist/scripts/migrate-cloudinary-to-garage.js
 *   docker exec <backend-container> npm run migrate:cloudinary
 *
 * Yêu cầu: Garage đã cấu hình (S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY) và đã
 * bootstrap (bucket + key). Nếu chưa, script sẽ báo lỗi và dừng.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { normalizeBuffer } from '../common/image/normalize-buffer';

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDINARY_URL_REGEX = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>)\\]+/g;

const isCloudinaryUrl = (url?: string | null): url is string =>
  !!url && url.includes(CLOUDINARY_HOST);

// Migration giữ format gốc (preserve-format) — không ép WebP cho dữ liệu cũ để
// tránh thay đổi extension hàng loạt trong DB (URL đã được index nhiều nơi).
// Endpoint upload runtime mới (ImageNormalizePipe) dùng force-webp cho ảnh tương lai.
const MAX_WIDTH_BY_FOLDER: Record<string, number> = {
  avatars: 512,
  'story-covers': 1080,
  ads: 1600,
  banners: 1600,
  'chapter-images': 1280,
  pages: 1280,
};
const DEFAULT_MAX_WIDTH = 1280;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function bootstrap() {
  const logger = new Logger('MigrateCloudinary');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const cloudinary = app.get(CloudinaryService);

  if (!cloudinary.garageEnabled) {
    logger.error('Garage chưa được cấu hình (S3_*). Không thể migrate — hủy.');
    await app.close();
    process.exit(1);
  }

  const stats = { migrated: 0, failed: 0, bytesIn: 0, bytesOut: 0 };
  // Cache: 1 URL Cloudinary chỉ tải + upload đúng 1 lần dù xuất hiện nhiều nơi.
  const cache = new Map<string, string>();
  const failedUrls = new Set<string>();

  async function migrate(url: string, folder: string): Promise<string | null> {
    if (cache.has(url)) return cache.get(url)!;
    if (failedUrls.has(url)) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const maxWidth = MAX_WIDTH_BY_FOLDER[folder] ?? DEFAULT_MAX_WIDTH;
      const normalized = await normalizeBuffer(buffer, contentType, {
        maxWidth,
        quality: 80,
        policy: 'preserve-format',
        throwOnUnreadable: false,
      });
      const garageUrl = await cloudinary.migrateBufferToGarage(
        normalized.buffer,
        folder,
        `migrated${normalized.ext}`,
        normalized.contentType,
      );
      cache.set(url, garageUrl);
      stats.migrated++;
      stats.bytesIn += normalized.originalBytes;
      stats.bytesOut += normalized.outputBytes;
      const delta =
        normalized.outputBytes < normalized.originalBytes
          ? ` (${formatSize(normalized.originalBytes)} → ${formatSize(normalized.outputBytes)}, -${(
              (1 - normalized.outputBytes / normalized.originalBytes) *
              100
            ).toFixed(0)}%)`
          : '';
      logger.log(`✓ [${folder}]${normalized.resized ? ' [resized]' : ''} ${url} → ${garageUrl}${delta}`);
      return garageUrl;
    } catch (err: any) {
      stats.failed++;
      failedUrls.add(url);
      logger.error(`✗ ${url} — ${err.message}`);
      return null;
    }
  }

  // Thay mọi URL Cloudinary trong một đoạn HTML. Trả null nếu không có gì đổi.
  async function migrateHtml(html: string, folder: string): Promise<string | null> {
    const urls = html.match(CLOUDINARY_URL_REGEX);
    if (!urls) return null;
    let updated = html;
    let changed = false;
    for (const url of [...new Set(urls)]) {
      const garageUrl = await migrate(url, folder);
      if (garageUrl) {
        updated = updated.split(url).join(garageUrl);
        changed = true;
      }
    }
    return changed ? updated : null;
  }

  // ===== 1. Các field URL đơn giản =====
  logger.log('--- Field URL đơn giản ---');

  const users = await prisma.user.findMany({ select: { id: true, avatar: true } });
  for (const u of users) {
    if (!isCloudinaryUrl(u.avatar)) continue;
    const newUrl = await migrate(u.avatar, 'avatars');
    if (newUrl) await prisma.user.update({ where: { id: u.id }, data: { avatar: newUrl } });
  }

  const stories = await prisma.story.findMany({ select: { id: true, coverImage: true } });
  for (const s of stories) {
    if (!isCloudinaryUrl(s.coverImage)) continue;
    const newUrl = await migrate(s.coverImage, 'story-covers');
    if (newUrl) await prisma.story.update({ where: { id: s.id }, data: { coverImage: newUrl } });
  }

  const ads = await prisma.ad.findMany({ select: { id: true, imageUrl: true } });
  for (const a of ads) {
    if (!isCloudinaryUrl(a.imageUrl)) continue;
    const newUrl = await migrate(a.imageUrl, 'ads');
    if (newUrl) await prisma.ad.update({ where: { id: a.id }, data: { imageUrl: newUrl } });
  }

  const banners = await prisma.banner.findMany({ select: { id: true, imageUrl: true } });
  for (const b of banners) {
    if (!isCloudinaryUrl(b.imageUrl)) continue;
    const newUrl = await migrate(b.imageUrl, 'banners');
    if (newUrl) await prisma.banner.update({ where: { id: b.id }, data: { imageUrl: newUrl } });
  }

  const userImages = await prisma.userImage.findMany({
    select: { id: true, url: true, folder: true },
  });
  for (const img of userImages) {
    if (!isCloudinaryUrl(img.url)) continue;
    const newUrl = await migrate(img.url, img.folder || 'misc');
    if (newUrl) await prisma.userImage.update({ where: { id: img.id }, data: { url: newUrl } });
  }

  // Chapter.images[] — mảng URL
  const chaptersWithImages = await prisma.chapter.findMany({
    select: { id: true, images: true },
  });
  for (const c of chaptersWithImages) {
    if (!c.images?.some(isCloudinaryUrl)) continue;
    const newImages: string[] = [];
    for (const img of c.images) {
      if (isCloudinaryUrl(img)) {
        const newUrl = await migrate(img, 'chapter-images');
        newImages.push(newUrl || img);
      } else {
        newImages.push(img);
      }
    }
    await prisma.chapter.update({ where: { id: c.id }, data: { images: newImages } });
  }

  // ===== 2. Ảnh nhúng trong nội dung HTML =====
  logger.log('--- Ảnh nhúng trong HTML (chương / trang) ---');

  const chapters = await prisma.chapter.findMany({ select: { id: true, content: true } });
  for (const c of chapters) {
    if (!c.content || !c.content.includes(CLOUDINARY_HOST)) continue;
    const updated = await migrateHtml(c.content, 'chapter-images');
    if (updated) await prisma.chapter.update({ where: { id: c.id }, data: { content: updated } });
  }

  const pages = await prisma.page.findMany({ select: { id: true, content: true } });
  for (const p of pages) {
    if (!p.content || !p.content.includes(CLOUDINARY_HOST)) continue;
    const updated = await migrateHtml(p.content, 'pages');
    if (updated) await prisma.page.update({ where: { id: p.id }, data: { content: updated } });
  }

  // ===== Tổng kết =====
  const saved = stats.bytesIn - stats.bytesOut;
  const savedPct = stats.bytesIn > 0 ? ((saved / stats.bytesIn) * 100).toFixed(0) : '0';
  logger.log('============================================');
  logger.log(`HOÀN TẤT — ảnh migrate thành công: ${stats.migrated}, thất bại: ${stats.failed}`);
  logger.log(
    `Dung lượng: ${formatSize(stats.bytesIn)} → ${formatSize(stats.bytesOut)} (tiết kiệm ${formatSize(saved)}, -${savedPct}%)`,
  );
  if (failedUrls.size > 0) {
    logger.warn(`URL thất bại (DB giữ nguyên link Cloudinary cũ):`);
    for (const url of failedUrls) logger.warn(`  - ${url}`);
  }
  logger.log('============================================');

  await app.close();
  process.exit(stats.failed > 0 ? 1 : 0);
}

bootstrap().catch((err) => {
  console.error('Migration script lỗi:', err);
  process.exit(1);
});
