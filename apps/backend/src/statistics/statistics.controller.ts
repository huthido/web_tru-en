import { Controller, Get, Post, Req, Body, UseGuards, Param, Query } from '@nestjs/common';
import type { Request } from 'express';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStats() {
    return this.statisticsService.getAllStats();
  }

  @Get('dashboard')
  async getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }

  @Get('user-growth')
  async getUserGrowth() {
    return this.statisticsService.getUserGrowthData(7);
  }

  @Get('story-views')
  async getStoryViews() {
    return this.statisticsService.getStoryViewsData(7);
  }

  @Get('stories/:storyId/views-by-month')
  async getStoryViewsByMonth(
    @Param('storyId') storyId: string,
    @Query('months') months?: string,
  ) {
    const parsed = parseInt(months ?? '', 10);
    const clamped = Math.min(Math.max(Number.isNaN(parsed) ? 12 : parsed, 1), 24);
    return this.statisticsService.getStoryViewsByMonth(storyId, clamped);
  }

  /** Xếp hạng truyện theo tổng lượt nghe (audio). */
  @Get('audio/stories')
  async getAudioTopStories(@Query('limit') limit?: string) {
    const parsed = parseInt(limit ?? '', 10);
    const clamped = Math.min(Math.max(Number.isNaN(parsed) ? 20 : parsed, 1), 100);
    return this.statisticsService.getAudioTopStories(clamped);
  }

  /** Xếp hạng người dùng theo tổng lượt nghe (audio). */
  @Get('audio/users')
  async getAudioTopUsers(@Query('limit') limit?: string) {
    const parsed = parseInt(limit ?? '', 10);
    const clamped = Math.min(Math.max(Number.isNaN(parsed) ? 20 : parsed, 1), 100);
    return this.statisticsService.getAudioTopUsers(clamped);
  }
}

@Controller('statistics')
export class PublicStatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Public()
  @Get('stories/:storyId')
  async getStoryStats(@Param('storyId') storyId: string) {
    return this.statisticsService.getStoryStats(storyId);
  }

  @Public()
  @Get('platform')
  async getPlatformStats() {
    return this.statisticsService.getPlatformStats();
  }

  /**
   * Ghi 1 lượt NGHE cho một chương — đếm MỖI LẦN bấm nút nghe (play audio /
   * giọng AI / Web Speech). Public: đếm cả khách. @CurrentUser tự có nếu
   * request kèm token hợp lệ.
   */
  @Public()
  @Post('chapters/:chapterId/listen')
  async recordListen(
    @Param('chapterId') chapterId: string,
    @Body('source') source: string | undefined,
    @Req() req: Request,
    @CurrentUser() user?: { id?: string },
  ) {
    return this.statisticsService.recordListen(chapterId, {
      userId: user?.id,
      ua: req.headers['user-agent'],
      source,
    });
  }

  @Get('users/:userId/activity')
  @UseGuards(JwtAuthGuard)
  async getUserActivity(@Param('userId') userId: string) {
    return this.statisticsService.getUserActivity(userId);
  }

  @Public()
  @Get('popular')
  async getPopularStories(
    @Query('timeframe') timeframe?: 'day' | 'week' | 'month' | 'all',
    @Query('limit') limit?: string
  ) {
    return this.statisticsService.getPopularStories(
      timeframe || 'all',
      limit ? parseInt(limit) : 20
    );
  }

  @Public()
  @Get('trending')
  async getTrendingStories(@Query('limit') limit?: string) {
    return this.statisticsService.getTrendingStories(limit ? parseInt(limit) : 20);
  }
}

