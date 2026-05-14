import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface RequiredEnvVars {
  [key: string]: {
    name: string;
    description: string;
    optional?: boolean;
  };
}

const REQUIRED_ENV_VARS: RequiredEnvVars = {
  DATABASE_URL: {
    name: 'DATABASE_URL',
    description: 'PostgreSQL database connection string',
  },
  JWT_SECRET: {
    name: 'JWT_SECRET',
    description: 'Secret key for JWT token signing',
  },
  CLOUDINARY_CLOUD_NAME: {
    name: 'CLOUDINARY_CLOUD_NAME',
    description: 'Cloudinary cloud name for image uploads',
    optional: true,
  },
  CLOUDINARY_API_KEY: {
    name: 'CLOUDINARY_API_KEY',
    description: 'Cloudinary API key',
    optional: true,
  },
  CLOUDINARY_API_SECRET: {
    name: 'CLOUDINARY_API_SECRET',
    description: 'Cloudinary API secret',
    optional: true,
  },
  GOOGLE_CLIENT_ID: {
    name: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth Client ID',
    optional: true,
  },
  GOOGLE_CLIENT_SECRET: {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth Client Secret',
    optional: true,
  },
  FACEBOOK_APP_ID: {
    name: 'FACEBOOK_APP_ID',
    description: 'Facebook OAuth App ID',
    optional: true,
  },
  FACEBOOK_APP_SECRET: {
    name: 'FACEBOOK_APP_SECRET',
    description: 'Facebook OAuth App Secret',
    optional: true,
  },
};

export function validateEnvironmentVariables(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];

    if (!value || value.trim() === '') {
      if (config.optional) {
        warnings.push(`⚠️  ${config.name} is not set (optional): ${config.description}`);
      } else {
        missing.push(`❌ ${config.name}: ${config.description}`);
      }
    } else {
      logger.log(`✅ ${config.name} is set`);
    }
  }

  if (warnings.length > 0) {
    logger.warn('Environment Variable Warnings:');
    warnings.forEach((warning) => logger.warn(warning));
  }

  if (missing.length > 0) {
    logger.error('Missing Required Environment Variables:');
    missing.forEach((error) => logger.error(error));
    logger.error('\nPlease set the required environment variables in your .env file');
    logger.error('See apps/backend/env.example for reference\n');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    logger.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
  }

  // Production hardening checks
  if (process.env.NODE_ENV === 'production') {
    const corsOrigin = process.env.CORS_ORIGIN;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!corsOrigin && !frontendUrl) {
      logger.error(
        '❌ Neither CORS_ORIGIN nor FRONTEND_URL is set in production. ' +
          'The API will only accept requests from http://localhost:3000.'
      );
    } else if (corsOrigin === '*') {
      logger.warn(
        '⚠️  CORS_ORIGIN="*" in production allows requests from any origin. ' +
          'Consider whitelisting your frontend domain(s) only.'
      );
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      logger.warn(
        '⚠️  Cloudinary credentials missing in production. The /uploads static ' +
          'directory is local-only and will lose files on instance restart or when scaled.'
      );
    }
  }

  logger.log('✅ All required environment variables are set');
}
