import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import type { Request } from 'express';

/**
 * fileFilter dùng cho FileInterceptor upload audio chương — chấp nhận các
 * định dạng phổ biến kể cả khi browser gán MIME application/octet-stream
 * (fallback qua extension, giống imageMulterFilter).
 */
const AUDIO_EXT_RE = /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac|webm)$/i;

export function audioMulterFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (file.mimetype && file.mimetype.startsWith('audio/')) {
    return cb(null, true);
  }
  // Một số browser gửi m4a/webm audio với MIME video/* hoặc octet-stream.
  const ext = extname(file.originalname || '').toLowerCase();
  if (AUDIO_EXT_RE.test(ext)) {
    return cb(null, true);
  }
  return cb(
    new BadRequestException(
      `Chỉ chấp nhận file audio mp3/m4a/aac/ogg/wav/flac (nhận được mime="${file.mimetype}" name="${file.originalname}")`,
    ),
    false,
  );
}
