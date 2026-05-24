import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Post,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ImageNormalizePipe } from '../common/pipes/image-normalize.pipe';
import { imageMulterFilter } from '../common/image/multer-filter';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly cloudinaryService: CloudinaryService
  ) { }

  @Public()
  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(updateSettingsDto);
  }

  @Post('upload-logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: imageMulterFilter,
    })
  )
  async uploadLogo(
    @UploadedFile(
      new ImageNormalizePipe({
        maxSizeBytes: 5 * 1024 * 1024,
        maxWidth: 1024,
        quality: 90,
        policy: 'force-webp',
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.cloudinaryService.uploadImage(file, 'settings');

    // Update settings with new logo
    await this.settingsService.updateSettings({ siteLogo: imageUrl });

    return {
      success: true,
      data: { url: imageUrl },
      message: 'Logo uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('upload-favicon')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 1 * 1024 * 1024, // 1MB
      },
      fileFilter: imageMulterFilter,
    })
  )
  async uploadFavicon(
    @UploadedFile(
      new ImageNormalizePipe({
        maxSizeBytes: 1 * 1024 * 1024,
        maxWidth: 256,
        quality: 90,
        policy: 'force-webp',
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.cloudinaryService.uploadImage(file, 'settings');

    // Update settings with new favicon
    await this.settingsService.updateSettings({ siteFavicon: imageUrl });

    return {
      success: true,
      data: { url: imageUrl },
      message: 'Favicon uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
