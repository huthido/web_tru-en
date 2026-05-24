import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageNormalizePipe } from '../common/pipes/image-normalize.pipe';

@Controller('pages')
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Public()
  @Get()
  findAll() {
    return this.pagesService.findAll();
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.pagesService.findOne(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createPageDto: CreatePageDto) {
    return this.pagesService.create(createPageDto);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('slug') slug: string, @Body() updatePageDto: UpdatePageDto) {
    return this.pagesService.update(slug, updatePageDto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('slug') slug: string) {
    return this.pagesService.remove(slug);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    })
  )
  async uploadImage(
    @UploadedFile(
      new ImageNormalizePipe({
        maxSizeBytes: 10 * 1024 * 1024,
        maxWidth: 1280,
        quality: 80,
        policy: 'force-webp',
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.cloudinaryService.uploadImage(file, 'pages');

    return {
      success: true,
      data: { url: imageUrl },
      message: 'Image uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
