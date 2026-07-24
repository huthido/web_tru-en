import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ArtService } from './art.service';
import { CreateArtPostDto } from './dto/create-art-post.dto';
import { CreateArtCommentDto } from './dto/create-art-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { imageMulterFilter } from '../common/image/multer-filter';

@Controller('art')
export class ArtController {
  constructor(
    private readonly artService: ArtService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── Posts ─────────────────────────────────────────────────────────────────

  @Public()
  @Get('posts')
  async getFeed(
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('userId') userId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.artService.getFeed(cursor, limit, user?.id, userId);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(@CurrentUser() user: any, @Body() dto: CreateArtPostDto) {
    return this.artService.createPost(user.id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') id: string, @CurrentUser() user: any) {
    return this.artService.deletePost(id, user.id);
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageMulterFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const url = await this.cloudinaryService.uploadImage(file, 'art-posts', user.id);
    return { url };
  }

  // ── Likes ─────────────────────────────────────────────────────────────────

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('id') id: string, @CurrentUser() user: any) {
    return this.artService.toggleLike(id, user.id);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Public()
  @Get('posts/:id/comments')
  async getComments(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.artService.getComments(id, cursor, limit);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateArtCommentDto,
  ) {
    return this.artService.addComment(id, user.id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.artService.deleteComment(id, user.id);
  }

  // ── Stories 24h ───────────────────────────────────────────────────────────

  @Public()
  @Get('stories')
  async getStories(@CurrentUser() user?: any) {
    return this.artService.getActiveStories(user?.id);
  }

  @Post('stories')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageMulterFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async createStory(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const url = await this.cloudinaryService.uploadImage(file, 'art-stories', user.id);
    return this.artService.createStory(user.id, url);
  }

  @Post('stories/:id/view')
  @UseGuards(JwtAuthGuard)
  async viewStory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.artService.viewStory(id, user.id);
  }
}
