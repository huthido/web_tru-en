import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  getConfig() {
    return {
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
    };
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'avatars'
  ): Promise<string> {
    // Different transformations for different folders
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

      uploadStream.end(file.buffer);
    });
  }

  async uploadImageFromBuffer(
    buffer: Buffer,
    folder: string = 'avatars'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
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
        )
        .end(buffer);
    });
  }
}

