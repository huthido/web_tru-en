import { Injectable, Logger, Optional, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    // Optional to avoid a hard circular dep; wallet uses settings, settings invalidates wallet cache.
    @Optional() @Inject(forwardRef(() => WalletService)) private wallet?: WalletService,
  ) { }

  async getSettings() {
    try {
      let settings = await this.prisma.settings.findFirst();

      // If no settings exist, create default settings
      if (!settings) {
        settings = await this.prisma.settings.create({
          data: {
            siteName: 'Web Truyện HungYeu',
            siteDescription: 'Nền tảng đọc truyện online',
            maintenanceMode: false,
            allowRegistration: true,
            requireEmailVerification: false,
          },
        });
      }

      return settings;
    } catch (error) {
      // Handle database connection errors gracefully
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P1001') {
          // Database connection error - return default settings
          this.logger.warn('Database unavailable, returning default settings');
          return {
            siteName: 'Web Truyện HungYeu',
            siteDescription: 'Nền tảng đọc truyện online',
            maintenanceMode: false,
            allowRegistration: true,
            requireEmailVerification: false,
            siteLogo: null,
            siteFavicon: null,
            siteUrl: null,
            maintenanceMessage: null,
            id: 'default',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    try {
      // Convert empty strings to null for optional string fields (not boolean)
      const cleanedData: any = {};
      for (const [key, value] of Object.entries(updateSettingsDto)) {
        if (value === '' && typeof value === 'string') {
          // Convert empty string to null for optional fields
          cleanedData[key] = null;
        } else if (value === undefined) {
          // Skip undefined values
          continue;
        } else {
          cleanedData[key] = value;
        }
      }

      let settings = await this.prisma.settings.findFirst();

      if (!settings) {
        // Create if doesn't exist
        settings = await this.prisma.settings.create({
          data: cleanedData,
        });
      } else {
        // Update existing
        settings = await this.prisma.settings.update({
          where: { id: settings.id },
          data: cleanedData,
        });
      }

      // If the donation fee % changed, invalidate the wallet cache so the new
      // rate takes effect on the very next donation rather than after 60s.
      if ('donationPlatformFeePercent' in cleanedData && this.wallet) {
        this.wallet.invalidateFeeCache();
      }

      return settings;
    } catch (error) {
      // Handle database connection errors gracefully
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P1001') {
          // Database connection error - throw meaningful error
          this.logger.error('Database unavailable, cannot update settings');
          throw new Error('Database unavailable. Please try again later.');
        }
      }
      // Re-throw other errors
      throw error;
    }
  }
}
