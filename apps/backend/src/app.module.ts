import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StoriesModule } from './stories/stories.module';
import { ChaptersModule } from './chapters/chapters.module';
import { CommentsModule } from './comments/comments.module';
import { FollowsModule } from './follows/follows.module';
import { CategoriesModule } from './categories/categories.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AdminModule } from './admin/admin.module';
import { StatisticsModule } from './statistics/statistics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AdsModule } from './ads/ads.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database
    PrismaModule,

    // Cloudinary
    CloudinaryModule,

    // Feature modules
    AuthModule,
    UsersModule,
    StoriesModule,
    ChaptersModule,
    CommentsModule,
    FollowsModule,
    CategoriesModule,
    ApprovalsModule,
    AdminModule,
    StatisticsModule,
    AdsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global JWT guard (can be overridden with @Public())
    },
  ],
})
export class AppModule {}

