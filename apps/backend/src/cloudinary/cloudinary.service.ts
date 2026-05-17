import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly useCloudinary: boolean;
  private readonly useGarage: boolean;
  private readonly garage: S3Client | null = null;
  private readonly garageBucket: string;
  private readonly garagePublicBase: string;
  private readonly uploadsDir: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.useCloudinary = !!(cloudName && apiKey && apiSecret);

    // Garage (S3-compatible) configuration
    const s3Endpoint = this.configService.get<string>('S3_ENDPOINT');
    const s3AccessKey = this.configService.get<string>('S3_ACCESS_KEY');
    const s3SecretKey = this.configService.get<string>('S3_SECRET_KEY');
    this.garageBucket = this.configService.get<string>('S3_BUCKET') || 'web-truyen';
    this.garagePublicBase =
      this.configService.get<string>('S3_PUBLIC_BASE_URL') ||
      (s3Endpoint ? `${s3Endpoint.replace(/\/$/, '')}/${this.garageBucket}` : '');
    this.useGarage = !!(s3Endpoint && s3AccessKey && s3SecretKey);

    if (this.useGarage) {
      this.garage = new S3Client({
        endpoint: s3Endpoint,
        region: this.configService.get<string>('S3_REGION') || 'garage',
        credentials: {
          accessKeyId: s3AccessKey!,
          secretAccessKey: s3SecretKey!,
        },
        forcePathStyle: true, // Required for Garage / MinIO / non-AWS S3
      });
      this.logger.log(`Garage S3 storage configured - bucket: ${this.garageBucket}`);
    }

    if (this.useCloudinary) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured - using cloud storage');
    }

    if (!this.useGarage && !this.useCloudinary) {
      this.logger.warn(
        'No cloud storage configured (Garage / Cloudinary) - using local file storage',
      );
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

    // Priority: Garage > Cloudinary > local fallback
    if (this.useGarage) {
      imageUrl = await this.uploadToGarage(file.buffer, folder, file.originalname, file.mimetype);
    } else if (this.useCloudinary) {
      imageUrl = await this.uploadToCloudinary(file.buffer, folder);
    } else {
      imageUrl = this.saveToLocal(file.buffer, folder, file.originalname);
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
    if (this.useGarage) {
      return this.uploadToGarage(buffer, folder, 'image.jpg', 'image/jpeg');
    }
    if (this.useCloudinary) {
      return this.uploadToCloudinary(buffer, folder);
    }
    return this.saveToLocal(buffer, folder, 'image.jpg');
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

    // Delete from Garage if URL matches its public base
    if (this.useGarage && this.garage && this.garagePublicBase && image.url.startsWith(this.garagePublicBase)) {
      try {
        const key = image.url.slice(this.garagePublicBase.length).replace(/^\//, '');
        await this.garage.send(
          new DeleteObjectCommand({ Bucket: this.garageBucket, Key: key }),
        );
      } catch (err) {
        this.logger.warn(`Failed to delete Garage object: ${err}`);
      }
    } else if (!this.useCloudinary && image.url.includes('/uploads/')) {
      // Delete local file if it's a local upload
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
   * Upload to Garage (S3-compatible object storage).
   * URL form: {S3_PUBLIC_BASE_URL}/{folder}/{uuid}.{ext}
   */
  private async uploadToGarage(
    buffer: Buffer,
    folder: string,
    originalName: string,
    contentType: string = 'image/jpeg',
  ): Promise<string> {
    if (!this.garage) throw new Error('Garage S3 client not initialized');

    const ext = path.extname(originalName) || '.jpg';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.garage.send(
      new PutObjectCommand({
        Bucket: this.garageBucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        ACL: 'public-read', // Garage honors this only if bucket policy allows; harmless otherwise
      }),
    );

    return `${this.garagePublicBase.replace(/\/$/, '')}/${key}`;
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
   * Save file to local disk as fallback when Garage/Cloudinary is not configured.
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
