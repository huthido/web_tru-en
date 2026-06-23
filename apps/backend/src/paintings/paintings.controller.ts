import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaintingsService } from './paintings.service';
import { CreatePaintingDto } from './dto/create-painting.dto';
import { UpdatePaintingDto } from './dto/update-painting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { imageMulterFilter } from '../common/image/multer-filter';

@Controller('paintings')
export class PaintingsController {
  constructor(
    private readonly paintingsService: PaintingsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Get()
  async getList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.paintingsService.getList({ page, limit, status, authorId });
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.paintingsService.getOne(id);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageMulterFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const url = await this.cloudinaryService.uploadImage(file, 'paintings', user.id);
    return { url };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: any, @Body() dto: CreatePaintingDto) {
    return this.paintingsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdatePaintingDto,
  ) {
    return this.paintingsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paintingsService.delete(id, user.id);
  }

  @Patch(':id/sold')
  @UseGuards(JwtAuthGuard)
  async markSold(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paintingsService.markSold(id, user.id);
  }
}
