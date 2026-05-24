import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { AdsService } from './ads.service';
import { AnalyticsService } from './analytics.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/ad-query.dto';
import { AdType, AdPosition } from './dto/create-ad.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageNormalizePipe } from '../common/pipes/image-normalize.pipe';
import { imageMulterFilter } from '../common/image/multer-filter';

@Controller('ads')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly analyticsService: AnalyticsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createAdDto: CreateAdDto, @CurrentUser() user: any) {
    return this.adsService.create(createAdDto, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: AdQueryDto) {
    return this.adsService.findAll(query);
  }

  /**
   * Public endpoint to get active ads for display.
   * `platform=web|mobile` để client lọc đúng source (mobile bỏ AdSense/CUSTOM_SCRIPT,
   * web bỏ AdMob/FAN).
   */
  @Public()
  @Get('active')
  findActiveAds(
    @Query('type') type?: AdType,
    @Query('position') position?: AdPosition,
    @Query('platform') platform?: 'web' | 'mobile',
  ) {
    return this.adsService.findActiveAds(type, position, platform);
  }

  /**
   * Snapshot cấu hình ads + GDPR cho client init network SDK.
   * Public — không expose secret, chỉ publisher ID / app ID cần ở client.
   */
  @Public()
  @Get('config')
  getPublicConfig() {
    return this.adsService.getPublicConfig();
  }

  /**
   * Nội dung ads.txt (Google AdSense verify). Frontend Next.js sẽ rewrite
   * `/ads.txt` → endpoint này và set Content-Type: text/plain.
   * Trả JSON wrap để qua ResponseInterceptor mà không bị xử lý kỳ lạ.
   */
  @Public()
  @Get('ads-txt-content')
  async getAdsTxt() {
    const content = await this.adsService.getAdsTxt();
    return { content };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateAdDto: UpdateAdDto,
    @CurrentUser() user: any,
  ) {
    return this.adsService.update(id, updateAdDto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adsService.remove(id, user.id);
  }

  /**
   * Track ad impression (new method with fraud prevention)
   */
  @Public()
  @Post(':id/impression')
  async trackImpression(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user?: any,
  ) {
    const metadata = {
      userId: user?.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    return this.adsService.trackImpression(id, metadata);
  }

  /**
   * Track ad click (new method with fraud prevention)
   */
  @Public()
  @Post(':id/track-click')
  async trackClick(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user?: any,
  ) {
    const metadata = {
      userId: user?.id,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    return this.adsService.trackClick(id, metadata);
  }

  /**
   * Track ad view (legacy - public endpoint)
   * @deprecated Use /impression endpoint instead
   */
  @Public()
  @Post(':id/view')
  incrementViewCount(@Param('id') id: string) {
    return this.adsService.incrementViewCount(id);
  }

  /**
   * Track ad click (legacy - public endpoint)
   * @deprecated Use /track-click endpoint instead
   */
  @Public()
  @Post(':id/click')
  incrementClickCount(@Param('id') id: string) {
    return this.adsService.incrementClickCount(id);
  }

  /**
   * Get ad analytics (admin only)
   */
  @Get(':id/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdAnalytics(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange = from && to ? {
      from: new Date(from),
      to: new Date(to),
    } : undefined;
    
    return this.analyticsService.getAdAnalytics(id, dateRange);
  }

  /**
   * Get platform analytics (admin only)
   */
  @Get('analytics/platform')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getPlatformAnalytics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange = from && to ? {
      from: new Date(from),
      to: new Date(to),
    } : undefined;
    
    return this.analyticsService.getPlatformAnalytics(dateRange);
  }

  /**
   * Upload ad image to Cloudinary
   */
  @Post('upload-image')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: imageMulterFilter,
    })
  )
  async uploadImage(
    @UploadedFile(
      new ImageNormalizePipe({
        maxSizeBytes: 10 * 1024 * 1024,
        maxWidth: 1600,
        quality: 82,
        policy: 'force-webp',
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.cloudinaryService.uploadImage(file, 'ads');

    return {
      success: true,
      data: { imageUrl },
      message: 'Ad image uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}

