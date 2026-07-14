import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
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

