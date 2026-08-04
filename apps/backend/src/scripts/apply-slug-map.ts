/**
 * Đổi slug truyện theo đúng bảng ánh xạ trong `apps/frontend/slug-redirects.json`.
 *
 * Bối cảnh: `generateSlug` từng xoá luôn nguyên âm có dấu thay vì chuyển thành
 * chữ không dấu, nên 82/128 truyện công khai đang mang URL vô nghĩa —
 * `/vt-khu-ca-qu` thay vì `/vet-khau-cua-quy`. Hàm đã được sửa nên truyện mới
 * sinh slug đúng, nhưng dữ liệu cũ thì vẫn nguyên.
 *
 * Script CỐ TÌNH không tự tính slug mới. Nó chỉ áp đúng file JSON đã được xem
 * lại và commit — cũng chính file mà `next.config.js` dùng để sinh 301 redirect.
 * Một nguồn sự thật duy nhất, nên DB và bảng redirect không thể lệch nhau.
 *
 * Slug CHƯƠNG không đụng tới. Chúng cũng méo (`chap-1-khi-u`), nhưng redirect
 * wildcard `/truyen/{cũ}/:path*` giữ nguyên toàn bộ URL chương bên dưới nên
 * không có gì gãy, mà đổi chúng sẽ cần ~1.500 rule redirect — không đáng.
 *
 * Cách chạy (trong container backend):
 *   docker cp apps/frontend/slug-redirects.json <backend>:/tmp/slugs.json
 *   docker exec <backend> node dist/scripts/apply-slug-map.js            # xem trước
 *   docker exec <backend> node dist/scripts/apply-slug-map.js --apply    # ghi thật
 *
 * Gọi thẳng `node`, ĐỪNG qua `npm run`: npm không chuyển tham số vị trí xuống
 * script. Không truyền đường dẫn thì script tự đọc /tmp/slugs.json (hoặc biến
 * môi trường SLUG_MAP).
 *
 * THỨ TỰ TRIỂN KHAI quan trọng — xem docs/adsense-doi-slug-runbook.md.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

type SlugMapEntry = { from: string; to: string; title?: string };

/** Nơi runbook bảo copy file vào — dùng khi không truyền đường dẫn. */
const DEFAULT_MAP_PATH = '/tmp/slugs.json';

async function bootstrap() {
  const logger = new Logger('ApplySlugMap');
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  // Thứ tự ưu tiên: tham số dòng lệnh → biến môi trường → đường dẫn mặc định.
  //
  // Có mặc định vì `npm run <script> /tmp/slugs.json` KHÔNG chuyển tham số vị
  // trí xuống script — npm nuốt mất, script chạy như thể không có đường dẫn rồi
  // báo "thiếu file" một cách khó hiểu. Với mặc định này thì cả hai cách gọi
  // đều chạy được, miễn là file đã được copy vào đúng chỗ.
  const mapPath = args.find((a) => !a.startsWith('--')) || process.env.SLUG_MAP || DEFAULT_MAP_PATH;

  logger.log(`Đọc bảng ánh xạ: ${mapPath}`);

  let entries: SlugMapEntry[];
  try {
    entries = JSON.parse(readFileSync(mapPath, 'utf8'));
    if (!Array.isArray(entries)) throw new Error('file JSON phải là một mảng');
  } catch (error) {
    logger.error(`Không đọc được ${mapPath}: ${(error as Error).message}`);
    logger.error('Copy file vào container trước:');
    logger.error(
      `  docker cp apps/frontend/slug-redirects.json <backend>:${DEFAULT_MAP_PATH}`
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);

  try {
    // ---- Kiểm tra toàn bộ TRƯỚC khi ghi một dòng nào ----
    // Đổi slug là thao tác không thể lùi bằng một lệnh, nên thà dừng sớm còn hơn
    // đổi được nửa chừng rồi hỏng: lúc đó nửa số URL cũ đã chết mà bảng redirect
    // lại không khớp với DB.
    const problems: string[] = [];
    const seenTo = new Set<string>();
    const willFree = new Set(entries.map((e) => e.from));
    let alreadyDone = 0;

    for (const { from, to } of entries) {
      if (!from || !to) {
        problems.push(`dòng thiếu from/to: ${JSON.stringify({ from, to })}`);
        continue;
      }
      if (seenTo.has(to)) {
        problems.push(`slug đích "${to}" xuất hiện hai lần trong file`);
        continue;
      }
      seenTo.add(to);

      const source = await prisma.story.findUnique({
        where: { slug: from },
        select: { id: true },
      });

      if (!source) {
        // Có thể script đã chạy rồi — kiểm tra xem slug đích đã tồn tại chưa.
        const done = await prisma.story.findUnique({ where: { slug: to }, select: { id: true } });
        if (done) {
          alreadyDone++;
        } else {
          problems.push(`không tìm thấy truyện nào có slug "${from}" (và "${to}" cũng chưa tồn tại)`);
        }
        continue;
      }

      const occupied = await prisma.story.findUnique({
        where: { slug: to },
        select: { id: true, slug: true },
      });

      // Đích bị chiếm mà kẻ chiếm KHÔNG nằm trong danh sách sắp được giải phóng
      // thì đổi sẽ vi phạm ràng buộc unique.
      if (occupied && occupied.id !== source.id && !willFree.has(occupied.slug)) {
        problems.push(`slug đích "${to}" đang bị một truyện khác chiếm`);
      }
    }

    if (problems.length > 0) {
      logger.error(`Dừng lại, có ${problems.length} vấn đề — chưa ghi gì:`);
      problems.forEach((p) => logger.error(`  - ${p}`));
      process.exitCode = 1;
      return;
    }

    const todo = entries.length - alreadyDone;
    logger.log(
      `Kiểm tra xong: ${todo} truyện cần đổi, ${alreadyDone} đã đổi từ trước.` +
        (apply ? '' : ' (dry-run, chưa ghi gì)')
    );

    if (!apply) {
      entries.slice(0, 10).forEach((e) => logger.log(`  /${e.from} → /${e.to}`));
      if (entries.length > 10) logger.log(`  ... và ${entries.length - 10} dòng nữa`);
      logger.log('Thêm --apply để ghi thật.');
      return;
    }

    // Chốt danh sách id ↔ slug đích TRƯỚC khi ghi, vì ngay sau bước đổi tạm bên
    // dưới thì không còn tra được truyện theo slug cũ nữa.
    const plan: { id: string; from: string; to: string }[] = [];
    for (const { from, to } of entries) {
      const story = await prisma.story.findUnique({ where: { slug: from }, select: { id: true } });
      if (story) plan.push({ id: story.id, from, to });
    }

    // ---- Ghi trong MỘT transaction ----
    // Tất cả cùng thành công hoặc cùng thất bại: nếu đứt giữa chừng thì DB và
    // bảng 301 trong next.config.js sẽ nói hai chuyện khác nhau, mà đó đúng là
    // trạng thái tệ nhất — URL cũ chết còn URL mới thì chưa có.
    await prisma.$transaction(async (tx) => {
      // Pha 1: dời hết sang slug tạm để giải phóng mọi tên cũ. Cần thiết vì hai
      // truyện có thể hoán đổi slug cho nhau (A→B, B→A); ghi thẳng sẽ vướng
      // ràng buộc unique ngay ở bước đầu.
      for (const { id } of plan) {
        await tx.story.update({ where: { id }, data: { slug: `tmp-slug-${id}` } });
      }

      // Pha 2: đặt slug đích.
      for (const { id, to } of plan) {
        await tx.story.update({ where: { id }, data: { slug: to } });
      }
    });

    plan.forEach((p) => logger.log(`  /${p.from} → /${p.to}`));
    logger.log(`Xong: đã đổi ${plan.length} slug (${alreadyDone} truyện đã đúng từ trước).`);
  } catch (error) {
    logger.error(`Lỗi: ${(error as Error).message}`, (error as Error).stack);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
