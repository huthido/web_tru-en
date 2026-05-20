import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { ReadingHistoryModule } from './reading-history/reading-history.module';
import { CategoriesModule } from './categories/categories.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AdminModule } from './admin/admin.module';
import { StatisticsModule } from './statistics/statistics.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AdsModule } from './ads/ads.module';
import { RatingsModule } from './ratings/ratings.module';
import { SearchModule } from './search/search.module';
import { PagesModule } from './pages/pages.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { MiddlewareModule } from './common/middleware/middleware.module';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { LoggerModule } from './common/logger/logger.module';
import { HealthController } from './health/health.controller';
import { QueueModule } from './queue/queue.module';
import { EmailModule } from './email/email.module';
import { MetricsModule } from './metrics/metrics.module';
import { RedisModule } from './redis/redis.module';

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

    // Logger
    LoggerModule,

    // Redis (pub/sub + cache). Global, must precede modules that depend on it.
    RedisModule,

    // Queue infrastructure (BullMQ + Redis). Must be before modules that produce jobs.
    QueueModule,

    // Email (registers email queue + processor)
    EmailModule,

    // Cloudinary
    CloudinaryModule,

    // Feature modules
    AuthModule,
    UsersModule,
    StoriesModule,
    ChaptersModule,
    CommentsModule,
    FollowsModule,
    ReadingHistoryModule,
    CategoriesModule,
    ApprovalsModule,
    AdminModule,
    StatisticsModule,
    AdsModule,
    RatingsModule,
    SearchModule,
    PagesModule,
    SettingsModule,
    NotificationsModule,
    WalletModule,
    PaymentsModule,
    MetricsModule,
    MiddlewareModule, // Must be imported to provide MaintenanceMiddleware
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global JWT guard (can be overridden with @Public())
    },
    MaintenanceMiddleware, // Add to providers for type resolution
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MaintenanceMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}

