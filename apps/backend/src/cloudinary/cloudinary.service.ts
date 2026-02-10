import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly useCloudinary: boolean;
  private readonly uploadsDir: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.useCloudinary = !!(cloudName && apiKey && apiSecret);

    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured - using cloud storage');
    } else {
      this.logger.warn('Cloudinary credentials not found - using local file storage');
    }

    // Setup local uploads directory (always, as fallback)
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  getConfig() {
    return {
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      useCloudinary: this.useCloudinary,
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'avatars',
    userId?: string,
  ): Promise<string> {
    let imageUrl: string;

    if (!this.useCloudinary) {
      imageUrl = this.saveToLocal(file.buffer, folder, file.originalname);
    } else {
      imageUrl = await this.uploadToCloudinary(file.buffer, folder);
    }

    // Save record to DB if userId provided
    if (userId) {
      try {
        await this.prisma.userImage.create({
          data: {
            userId,
            url: imageUrl,
            folder,
            filename: file.originalname,
            size: file.size,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to save image record: ${err}`);
      }
    }

    return imageUrl;
  }

  async uploadImageFromBuffer(
    buffer: Buffer,
    folder: string = 'avatars'
  ): Promise<string> {
    if (!this.useCloudinary) {
      return this.saveToLocal(buffer, folder, 'image.jpg');
    }
    return this.uploadToCloudinary(buffer, folder);
  }

  /**
   * Get all images uploaded by a user, optionally filtered by folder.
   */
  async getUserImages(userId: string, folder?: string) {
    const where: any = { userId };
    if (folder) {
      where.folder = folder;
    }

    return this.prisma.userImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        filename: true,
        folder: true,
        size: true,
        createdAt: true,
      },
    });
  }

  /**
   * Delete a user image record (and local file if applicable).
   */
  async deleteUserImage(userId: string, imageId: string) {
    const image = await this.prisma.userImage.findFirst({
      where: { id: imageId, userId },
    });

    if (!image) {
      throw new Error('Image not found');
    }

    // Delete local file if it's a local upload
    if (!this.useCloudinary && image.url.includes('/uploads/')) {
      try {
        const urlPath = new URL(image.url).pathname; // e.g. /uploads/chapter-images/abc.jpg
        const filePath = path.join(process.cwd(), urlPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        this.logger.warn(`Failed to delete local file: ${err}`);
      }
    }

    await this.prisma.userImage.delete({
      where: { id: imageId },
    });

    return { success: true };
  }

  /**
   * Upload to Cloudinary with folder-specific transformations.
   */
  private uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
    let transformation: any[] = [];

    if (folder === 'avatars') {
      transformation = [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ];
    } else if (folder === 'story-covers') {
      transformation = [
        { width: 600, height: 800, crop: 'fill', gravity: 'auto' },
        { quality: 'auto', fetch_format: 'auto' },
      ];
    } else if (folder === 'chapter-images') {
      transformation = [
        { width: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ];
    } else if (folder === 'ads') {
      transformation = [
        { quality: 'auto', fetch_format: 'auto' },
        { flags: 'progressive' },
      ];
    } else {
      transformation = [
        { quality: 'auto', fetch_format: 'auto' },
      ];
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Cloudinary upload failed: Unknown error'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Save file to local disk as fallback when Cloudinary is not configured.
   */
  private saveToLocal(buffer: Buffer, folder: string, originalName: string): string {
    const folderPath = path.join(this.uploadsDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const ext = path.extname(originalName) || '.jpg';
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(folderPath, uniqueName);

    fs.writeFileSync(filePath, buffer);
    this.logger.log(`Saved image locally: ${filePath}`);

    const port = this.configService.get('PORT') || 3001;
    const baseUrl = this.configService.get('BACKEND_URL') || `http://localhost:${port}`;
    return `${baseUrl}/uploads/${folder}/${uniqueName}`;
  }
}
