import {
    BadRequestException,
    Injectable,
    PipeTransform,
} from '@nestjs/common';
import sharp from 'sharp';

export interface ImageValidationOptions {
    maxSizeBytes?: number;
    maxWidth?: number;
}

const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_WIDTH = 2000;

@Injectable()
export class ImageValidationPipe
    implements PipeTransform<Express.Multer.File | undefined, Promise<Express.Multer.File>>
{
    private readonly maxSizeBytes: number;
    private readonly maxWidth: number;

    constructor(opts: ImageValidationOptions = {}) {
        this.maxSizeBytes = opts.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
        this.maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
    }

    async transform(file: Express.Multer.File | undefined): Promise<Express.Multer.File> {
        if (!file) {
            throw new BadRequestException('Không có file ảnh');
        }
        if (file.size > this.maxSizeBytes) {
            const mb = (this.maxSizeBytes / 1024 / 1024).toFixed(1);
            throw new BadRequestException(`Ảnh vượt ${mb}MB`);
        }
        let meta: sharp.Metadata;
        try {
            meta = await sharp(file.buffer).metadata();
        } catch {
            throw new BadRequestException('File không phải ảnh hợp lệ');
        }
        if (!meta.width || !meta.height) {
            throw new BadRequestException('Không đọc được kích thước ảnh');
        }
        if (meta.width > this.maxWidth) {
            throw new BadRequestException(
                `Chiều rộng ảnh vượt ${this.maxWidth}px (ảnh ${meta.width}px)`,
            );
        }
        return file;
    }
}
