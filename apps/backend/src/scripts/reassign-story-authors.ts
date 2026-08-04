/**
 * Gán lại tên tác giả hiển thị cho từng truyện, theo một file CSV do người vận
 * hành tự điền.
 *
 * Bối cảnh: 54 truyện đang đứng tên tài khoản nhà `author` với displayName là
 * "Tác Giả" — một cái tên chung chung, không phải danh tính thật. Với Google
 * đó là tín hiệu xấu về E-E-A-T (không rõ ai chịu trách nhiệm nội dung), và là
 * một trong những thứ AdSense soi khi đánh giá "nội dung có giá trị thấp".
 *
 * Vì mỗi truyện có thể có một tác giả thật khác nhau, script KHÔNG tự đoán:
 * nó chỉ áp đúng những gì ghi trong CSV.
 *
 * File CSV lấy từ `tools/tac-gia-can-gan-lai.csv` (đã xuất sẵn). Chỉ cần điền
 * cột `authorName_moi`; dòng nào để trống thì bỏ qua, không đụng tới. Nhờ vậy
 * có thể làm dần từng đợt, chạy lại nhiều lần vẫn an toàn.
 *
 * Script CHỈ đổi `story.authorName` — trường hiển thị trên trang truyện và
 * trong JSON-LD. Nó KHÔNG chuyển quyền sở hữu (`authorId`), vì quyền sở hữu
 * quyết định ai được sửa truyện và ai nhận xu; việc đó phải làm qua trang quản
 * trị để còn xử lý cả ví và lịch sử giao dịch.
 *
 * Cách chạy (trong container backend, nhớ copy file CSV vào trước):
 *   docker cp tools/tac-gia-can-gan-lai.csv <backend>:/tmp/tacgia.csv
 *   docker exec <backend> node dist/scripts/reassign-story-authors.js           # xem trước
 *   docker exec <backend> node dist/scripts/reassign-story-authors.js --apply   # ghi thật
 *
 * Gọi thẳng `node`, ĐỪNG qua `npm run`: npm không chuyển tham số vị trí xuống
 * script. Không truyền đường dẫn thì script tự đọc /tmp/tacgia.csv (hoặc biến
 * môi trường AUTHOR_CSV).
 *
 * Không có `--apply` thì chỉ in ra dự định, không ghi gì.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/** Nơi runbook bảo copy file vào — dùng khi không truyền đường dẫn. */
const DEFAULT_CSV_PATH = '/tmp/tacgia.csv';

/**
 * Bộ tách CSV tối giản theo RFC 4180: hỗ trợ ô bọc nháy kép, dấu phẩy và xuống
 * dòng nằm trong ô, và nháy kép escape bằng cách viết đôi ("").
 *
 * Tự viết thay vì thêm thư viện: phần mô tả truyện trong file gần như chắc chắn
 * có dấu phẩy, nên cắt bằng `split(',')` sẽ hỏng, mà kéo về một dependency mới
 * chỉ để chạy một script một lần thì không đáng.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Bỏ BOM — file được xuất kèm BOM để Excel mở đúng tiếng Việt.
  const input = text.replace(/^﻿/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

async function bootstrap() {
  const logger = new Logger('ReassignStoryAuthors');
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  // Thứ tự ưu tiên: tham số dòng lệnh → biến môi trường → đường dẫn mặc định.
  // Có mặc định vì `npm run <script> /tmp/x.csv` KHÔNG chuyển tham số vị trí
  // xuống script — npm nuốt mất rồi script báo "thiếu file" một cách khó hiểu.
  const csvPath =
    args.find((a) => !a.startsWith('--')) || process.env.AUTHOR_CSV || DEFAULT_CSV_PATH;

  logger.log(`Đọc file CSV: ${csvPath}`);

  let rows: string[][];
  try {
    rows = parseCsv(readFileSync(csvPath, 'utf8'));
  } catch (error) {
    logger.error(`Không đọc được ${csvPath}: ${(error as Error).message}`);
    logger.error('Copy file vào container trước:');
    logger.error(`  docker cp tools/tac-gia-can-gan-lai.csv <backend>:${DEFAULT_CSV_PATH}`);
    process.exitCode = 1;
    return;
  }

  const header = rows.shift()?.map((h) => h.trim());
  if (!header) {
    logger.error('File CSV rỗng.');
    process.exitCode = 1;
    return;
  }

  const slugIndex = header.indexOf('slug');
  const nameIndex = header.indexOf('authorName_moi');
  if (slugIndex === -1 || nameIndex === -1) {
    logger.error(`CSV phải có cột "slug" và "authorName_moi". Đang thấy: ${header.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);

  let updated = 0;
  let blank = 0;
  let unchanged = 0;
  const notFound: string[] = [];

  try {
    for (const row of rows) {
      const slug = (row[slugIndex] || '').trim();
      const newName = (row[nameIndex] || '').trim();

      if (!slug) continue;
      if (!newName) {
        blank++;
        continue;
      }

      const story = await prisma.story.findUnique({
        where: { slug },
        select: { id: true, authorName: true, title: true },
      });

      if (!story) {
        notFound.push(slug);
        continue;
      }
      if (story.authorName === newName) {
        unchanged++;
        continue;
      }

      logger.log(`  ${slug}: "${story.authorName}" → "${newName}"  (${story.title})`);

      if (apply) {
        await prisma.story.update({
          where: { id: story.id },
          data: { authorName: newName },
        });
      }
      updated++;
    }

    if (notFound.length > 0) {
      logger.warn(`Không tìm thấy ${notFound.length} slug: ${notFound.join(', ')}`);
    }

    logger.log(
      apply
        ? `Xong: đã đổi ${updated} truyện. Bỏ qua ${blank} dòng chưa điền tên, ${unchanged} truyện đã đúng tên.`
        : `Dry-run: sẽ đổi ${updated} truyện. Bỏ qua ${blank} dòng chưa điền tên, ${unchanged} truyện đã đúng tên. ` +
            'Thêm --apply để ghi thật.'
    );
  } catch (error) {
    logger.error(`Lỗi: ${(error as Error).message}`, (error as Error).stack);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
