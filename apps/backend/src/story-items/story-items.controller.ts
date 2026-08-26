import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StoryItemsService } from './story-items.service';
import { CreateStoryItemDto } from './dto/create-story-item.dto';
import { UpdateStoryItemDto } from './dto/update-story-item.dto';
import { BuyStoryItemDto } from './dto/buy-story-item.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageNormalizePipe } from '../common/pipes/image-normalize.pipe';
import { imageMulterFilter } from '../common/image/multer-filter';

// Chặn kiểu file nguy hiểm cho phần "file tải về" (tránh XSS khi mở từ CDN).
const BLOCKED_FILE_EXT = /\.(html?|xhtml|svg|js|mjs|exe|bat|cmd|sh|php|jar|msi|scr|com)$/i;
function itemFileFilter(_req: any, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) {
  if (BLOCKED_FILE_EXT.test(file.originalname || '') || /html|javascript|svg/i.test(file.mimetype || '')) {
    return cb(new BadRequestException('Định dạng file không được phép'), false);
  }
  cb(null, true);
}

@Controller()
export class StoryItemsController {
  constructor(
    private readonly service: StoryItemsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ─── Công khai: danh sách vật phẩm của truyện (kèm số đã sở hữu nếu đăng nhập) ───
  @Public()
  @Get('stories/:storyId/items')
  list(@Param('storyId') storyId: string, @CurrentUser() user?: { id?: string }) {
    return this.service.listForStory(storyId, user?.id);
  }

  // ─── Kho đồ của người dùng ───
  @Get('me/items')
  myItems(@CurrentUser() user: { id: string }) {
    return this.service.myItems(user.id);
  }

  // ─── Quản lý (tác giả/admin) ───
  @Get('stories/:storyId/items/manage')
  manage(@Param('storyId') storyId: string, @CurrentUser() user: { id: string; role?: string }) {
    return this.service.listForAuthor(storyId, user.id, user.role === 'ADMIN');
  }

  @Post('stories/:storyId/items')
  create(
    @Param('storyId') storyId: string,
    @Body() dto: CreateStoryItemDto,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    return this.service.create(storyId, user.id, user.role === 'ADMIN', dto);
  }

  @Patch('items/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStoryItemDto,
    @CurrentUser() user: { id: string; role?: string },
  ) {
    return this.service.update(id, user.id, user.role === 'ADMIN', dto);
  }

  @Delete('items/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role?: string }) {
    return this.service.remove(id, user.id, user.role === 'ADMIN');
  }

  // ─── Mua + tải ───
  @Post('items/:id/buy')
  buy(
    @Param('id') id: string,
    @Body() dto: BuyStoryItemDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.buy(id, user.id, dto.quantity ?? 1);
  }

  @Get('items/:id/download')
  download(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.getDownloadUrl(id, user.id);
  }

  // ─── Upload ảnh + file ───
  @Post('items/upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageMulterFilter,
    }),
  )
  async uploadImage(
    @UploadedFile(
      new ImageNormalizePipe({ maxSizeBytes: 5 * 1024 * 1024, maxWidth: 1200, quality: 90, policy: 'force-webp' }),
    )
    file: Express.Multer.File,
  ) {
    const url = await this.cloudinary.uploadImage(file, 'story-items');
    return { success: true, data: { url }, timestamp: new Date().toISOString() };
  }

  @Post('items/upload-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: itemFileFilter,
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu file');
    const url = await this.cloudinary.uploadFile(file, 'story-item-files');
    return { success: true, data: { url, name: file.originalname, size: file.size }, timestamp: new Date().toISOString() };
  }
}
