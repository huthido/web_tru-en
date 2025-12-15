import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdsService } from './ads.service';
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

@Controller('ads')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
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
   * Public endpoint to get active ads for display
   */
  @Public()
  @Get('active')
  findActiveAds(
    @Query('type') type?: AdType,
    @Query('position') position?: AdPosition,
  ) {
    return this.adsService.findActiveAds(type, position);
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
   * Track ad view (public endpoint)
   */
  @Public()
  @Post(':id/view')
  incrementViewCount(@Param('id') id: string) {
    return this.adsService.incrementViewCount(id);
  }

  /**
   * Track ad click (public endpoint)
   */
  @Public()
  @Post(':id/click')
  incrementClickCount(@Param('id') id: string) {
    return this.adsService.incrementClickCount(id);
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
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const imageUrl = await this.cloudinaryService.uploadImage(file, 'ads');

    return {
      success: true,
      data: { imageUrl },
      message: 'Ad image uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}

