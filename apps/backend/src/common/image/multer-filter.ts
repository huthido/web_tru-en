import { extname } from 'path';
import type { Request } from 'express';

/**
 * fileFilter dùng cho FileInterceptor — chấp nhận ảnh kể cả khi browser không
 * gán đúng MIME (vd Chrome desktop gửi HEIC với content-type
 * application/octet-stream). Fallback qua extension. ImageNormalizePipe sẽ
 * detect format thật bằng sharp ở bước sau.
 */
const IMAGE_EXT_RE = /\.(heic|heif|jpe?g|png|webp|avif|gif|bmp|tiff?|svg)$/i;

export function imageMulterFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  const ext = extname(file.originalname || '').toLowerCase();
  if (IMAGE_EXT_RE.test(ext)) {
    return cb(null, true);
  }
  return cb(
    new Error(`Chỉ chấp nhận file ảnh (nhận được mime="${file.mimetype}" name="${file.originalname}")`),
    false,
  );
}
