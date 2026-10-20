import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReadingHistoryService } from './reading-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class ReadingHistoryController {
  constructor(private readonly readingHistoryService: ReadingHistoryService) {}

  @Post('chapters/:chapterId/progress')
  @UseGuards(JwtAuthGuard)
  async saveProgress(
    @Param('chapterId') chapterId: string,
    @CurrentUser() user: any,
    @Body() body: { progress: number }
  ) {
    return this.readingHistoryService.saveProgress(
      user.id,
      chapterId,
      body.progress
    );
  }

  @Get('chapters/:chapterId/progress')
  @UseGuards(JwtAuthGuard)
  async getChapterProgress(
    @Param('chapterId') chapterId: string,
    @CurrentUser() user: any
  ) {
    return this.readingHistoryService.getChapterProgress(user.id, chapterId);
  }

  /**
   * Chương user đang đọc dở của một truyện (null nếu chưa đọc) — dùng cho nút
   * "Đọc tiếp chương N" ở trang chi tiết truyện.
   */
  @Get('reading-history/story/:storyId')
  @UseGuards(JwtAuthGuard)
  async getStoryProgress(
    @Param('storyId') storyId: string,
    @CurrentUser() user: any
  ) {
    return this.readingHistoryService.getStoryProgress(user.id, storyId);
  }
}
