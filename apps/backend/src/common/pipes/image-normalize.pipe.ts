import {
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
} from '@nestjs/common';
import {
  normalizeBuffer,
  NormalizePolicy,
  UnreadableImageError,
} from '../image/normalize-buffer';
import { replaceExt } from '../image/extensions';

export interface ImageNormalizeOptions {
  /** Hard limit kích thước file đầu vào (sau khi multer đã pass). Default 10MB. */
  maxSizeBytes?: number;
  /** Width tối đa sau resize (px). Default 2000. */
  maxWidth: number;
  /** Quality cho lossy encoder. Default 80. */
  quality?: number;
  /** Chiến lược output format. Default 'force-webp'. */
  policy?: NormalizePolicy;
}

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ImageNormalizePipe
  implements PipeTransform<Express.Multer.File | undefined, Promise<Express.Multer.File>>
{
  private readonly logger = new Logger(ImageNormalizePipe.name);
  private readonly maxSizeBytes: number;
  private readonly maxWidth: number;
  private readonly quality: number | undefined;
  private readonly policy: NormalizePolicy;

  constructor(opts: ImageNormalizeOptions) {
    this.maxSizeBytes = opts.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    this.maxWidth = opts.maxWidth;
    this.quality = opts.quality;
    this.policy = opts.policy ?? 'force-webp';
  }

  async transform(
    file: Express.Multer.File | undefined,
  ): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException('Không có file ảnh');
    }
    if (file.size > this.maxSizeBytes) {
      const mb = (this.maxSizeBytes / 1024 / 1024).toFixed(1);
      throw new BadRequestException(`Ảnh vượt ${mb}MB`);
    }

    let result;
    try {
      result = await normalizeBuffer(file.buffer, file.mimetype, {
        maxWidth: this.maxWidth,
        quality: this.quality,
        policy: this.policy,
        throwOnUnreadable: true,
      });
    } catch (err) {
      const declaredMime = file.mimetype || 'không rõ';
      if (err instanceof UnreadableImageError) {
        this.logger.warn(
          `normalize fail: declaredMime=${declaredMime} size=${file.size}B reason=${err.reason}`,
        );
        throw new BadRequestException(buildVietnameseError(declaredMime, err.reason));
      }
      const msg = (err as Error)?.message || 'unknown';
      this.logger.error(
        `normalize unexpected error: declaredMime=${declaredMime} size=${file.size}B err=${msg}`,
      );
      throw new BadRequestException(
        `Không xử lý được ảnh (${declaredMime}). Hãy thử lại hoặc đổi định dạng.`,
      );
    }

    file.buffer = result.buffer;
    file.mimetype = result.contentType;
    file.size = result.buffer.length;
    file.originalname = replaceExt(file.originalname, result.ext);

    if (result.reencoded || result.resized) {
      this.logger.log(
        `normalize ${result.originalContentType}→${result.contentType} ` +
          `${result.originalBytes}B→${result.outputBytes}B` +
          (result.resized ? ` [resized→${result.width}px]` : ''),
      );
    }

    return file;
  }
}

function buildVietnameseError(declaredMime: string, reason: string): string {
  const m = declaredMime.toLowerCase();

  if (m === 'application/pdf' || m === 'application/octet-stream') {
    return `Tệp không phải ảnh (${declaredMime}). Hãy chọn JPG, PNG, WebP, HEIC hoặc GIF.`;
  }
  if (m === 'image/heic' || m === 'image/heif') {
    return 'Không đọc được ảnh HEIC. Hãy cập nhật ứng dụng, hoặc chụp lại bằng định dạng JPG.';
  }
  if (reason === 'missing-dimensions') {
    return 'Không đọc được kích thước ảnh. File có thể bị hỏng.';
  }
  if (reason.includes('unsupported') || reason.includes('Input')) {
    return `Định dạng ảnh "${declaredMime}" chưa hỗ trợ. Hãy dùng JPG, PNG, WebP, HEIC hoặc GIF.`;
  }
  return `Không đọc được ảnh (${declaredMime}). File có thể bị hỏng — hãy thử lại bằng ảnh khác.`;
}
