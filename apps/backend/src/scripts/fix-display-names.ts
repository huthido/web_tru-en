/**
 * Dọn tên hiển thị hỏng do bug ghép tên Google OAuth — chạy MỘT LẦN sau khi
 * deploy bản vá `google.strategy.ts`.
 *
 * Bug cũ: `displayName = name.givenName + ' ' + name.familyName`. Tài khoản
 * Google chỉ có một phần tên thì `familyName` là `undefined`, phép cộng chuỗi
 * sinh ra `"TunaPiece undefined"`. Tên hỏng được lưu vào `user.displayName`,
 * rồi chép sang `story.authorName` lúc tạo truyện nên lộ ra API công khai —
 * một tín hiệu "nội dung kém tin cậy" với Google/AdSense.
 *
 * Script chỉ cắt phần rác ở đuôi, KHÔNG đặt tên mới cho ai:
 *   "TunaPiece undefined"  → "TunaPiece"
 *   "undefined undefined"  → lấy phần trước @ của email, cuối cùng mới tới username
 *
 * Mặc định chạy thử (dry-run) và chỉ in ra những gì sẽ đổi. Thêm `--apply` để
 * ghi thật. Idempotent: chạy lại lần nữa không tìm thấy bản ghi nào.
 *
 * Cách chạy (trên server, trong container backend):
 *   docker exec <backend-container> node dist/scripts/fix-display-names.js
 *   docker exec <backend-container> node dist/scripts/fix-display-names.js --apply
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/** Các mẩu rác mà phép cộng chuỗi với giá trị thiếu đã để lại. */
const JUNK_TOKENS = ['undefined', 'null'];

/**
 * Bỏ token rác ở đầu/cuối tên. Chỉ xử lý token đứng riêng thành một từ để
 * không cắt nhầm tên thật có chứa chuỗi con (ví dụ "Undefinedo").
 */
function cleanName(raw: string): string {
  const words = raw.split(/\s+/).filter(Boolean);
  const kept = words.filter((word) => !JUNK_TOKENS.includes(word.toLowerCase()));
  return kept.join(' ').trim();
}

function hasJunk(raw?: string | null): boolean {
  if (!raw) return false;
  return raw
    .split(/\s+/)
    .some((word) => JUNK_TOKENS.includes(word.toLowerCase()));
}

async function bootstrap() {
  const logger = new Logger('FixDisplayNames');
  const apply = process.argv.includes('--apply');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);

  try {
    // Prisma không có toán tử "chứa từ", nên lọc thô bằng `contains` rồi mới
    // kiểm tra chính xác ở tầng JS bằng hasJunk().
    const candidates = await prisma.user.findMany({
      where: {
        OR: JUNK_TOKENS.map((token) => ({
          displayName: { contains: token, mode: 'insensitive' as const },
        })),
      },
      select: { id: true, username: true, email: true, displayName: true },
    });

    const broken = candidates.filter((user) => hasJunk(user.displayName));

    logger.log(
      `Tìm thấy ${broken.length} user có tên hiển thị hỏng${apply ? '' : ' (dry-run, chưa ghi gì)'}`
    );

    let userUpdates = 0;
    let storyUpdates = 0;

    for (const user of broken) {
      const oldName = user.displayName || '';
      const cleaned =
        cleanName(oldName) || user.email?.split('@')[0] || user.username;

      if (!cleaned || cleaned === oldName) continue;

      // Chỉ sửa những truyện còn mang đúng tên hỏng cũ. Tác giả đã tự đổi
      // authorName sang tên khác thì giữ nguyên lựa chọn của họ.
      const affectedStories = await prisma.story.count({
        where: { authorId: user.id, authorName: oldName },
      });

      logger.log(
        `  ${user.username}: "${oldName}" → "${cleaned}" (${affectedStories} truyện)`
      );

      if (apply) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { displayName: cleaned },
          }),
          prisma.story.updateMany({
            where: { authorId: user.id, authorName: oldName },
            data: { authorName: cleaned },
          }),
        ]);
      }

      userUpdates++;
      storyUpdates += affectedStories;
    }

    // Truyện của tác giả khác có thể vẫn giữ tên hỏng nếu user đã đổi displayName
    // bằng tay trước đó — quét thêm một lượt cho sạch.
    const orphanStories = await prisma.story.findMany({
      where: {
        OR: JUNK_TOKENS.map((token) => ({
          authorName: { contains: token, mode: 'insensitive' as const },
        })),
      },
      select: { id: true, slug: true, authorName: true },
    });

    for (const story of orphanStories.filter((s) => hasJunk(s.authorName))) {
      const cleaned = cleanName(story.authorName || '');
      if (!cleaned || cleaned === story.authorName) continue;

      logger.log(
        `  [truyện] ${story.slug}: "${story.authorName}" → "${cleaned}"`
      );

      if (apply) {
        await prisma.story.update({
          where: { id: story.id },
          data: { authorName: cleaned },
        });
      }
      storyUpdates++;
    }

    logger.log(
      apply
        ? `Xong: đã sửa ${userUpdates} user, ${storyUpdates} truyện.`
        : `Dry-run: sẽ sửa ${userUpdates} user, ${storyUpdates} truyện. Chạy lại với --apply để ghi.`
    );
  } catch (error) {
    logger.error(`Lỗi: ${(error as Error).message}`, (error as Error).stack);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
