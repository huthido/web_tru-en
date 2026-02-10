import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as path from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnvironmentVariables } from './common/utils/env-validation';
import { AppLoggerService } from './common/logger/logger.service';

// Validate environment variables before starting
validateEnvironmentVariables();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Cookie parser for HTTP-only cookies
  app.use(cookieParser());

  // Serve uploaded files statically (for local storage fallback)
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // CORS
  const corsOrigin = configService.get('CORS_ORIGIN');
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((origin: string) => origin.trim())
    : ['http://localhost:3000'];

  // Add frontend URL to allowed origins if not already included
  const frontendUrl = configService.get('FRONTEND_URL');
  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        // Log CORS errors for debugging
        console.warn(`[CORS] Blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter
  const loggerService = app.get(AppLoggerService);
  app.useGlobalFilters(new AllExceptionsFilter(loggerService));

  const port = configService.get('PORT') || 3001;
  const host = '0.0.0.0'; // 🔥 Required for Render/Docker to detect the open port

  await app.listen(port, host);

  const url = await app.getUrl();
  console.log(`🚀 Backend server is ready and listening on: ${url}`);
  console.log(`Environment: ${configService.get('NODE_ENV') || 'development'}`);
}

bootstrap();

