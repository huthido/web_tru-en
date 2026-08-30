import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import type { Request } from 'express';

/**
 * fileFilter dùng cho FileInterceptor — chấp nhận ảnh kể cả khi browser không
 * gán đúng MIME (vd Chrome desktop gửi HEIC với content-type
 * application/octet-stream). Fallback qua extension. ImageNormalizePipe sẽ
 * detect format thật bằng sharp ở bước sau.
 */
const IMAGE_EXT_RE = /\.(heic|heif|jpe?g|png|webp|avif|gif|bmp|tiff?)$/i;

export function imageMulterFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  // SVG bị TỪ CHỐI: là ảnh vector chứa script/HTML → nếu lưu nguyên trạng lên
  // CDN (cùng eTLD+1 với site) và mở trực tiếp sẽ chạy JS (stored XSS). Sharp
  // cũng không rasterize SVG trong ImageNormalizePipe (passthrough), nên phải
  // chặn ngay từ đây. Đường tải file vật phẩm đã chặn svg tương tự.
  const ext = extname(file.originalname || '').toLowerCase();
  const isSvg =
    ext === '.svg' ||
    /svg/i.test(file.mimetype || '');
  if (isSvg) {
    return cb(
      new BadRequestException('Không chấp nhận ảnh SVG vì lý do bảo mật'),
      false,
    );
  }
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  if (IMAGE_EXT_RE.test(ext)) {
    return cb(null, true);
  }
  // BadRequestException (không phải Error trần) để Nest trả 400 — file sai
  // định dạng là lỗi của client, trước đây rơi vào nhánh 500.
  return cb(
    new BadRequestException(
      `Chỉ chấp nhận file ảnh (nhận được mime="${file.mimetype}" name="${file.originalname}")`,
    ),
    false,
  );
}
