import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

export const EMAIL_QUEUE = 'email';

/**
 * Global queue infrastructure backed by Redis (BullMQ).
 *
 * Enabled when REDIS_URL is set. Otherwise queueing is silently disabled and
 * producers fall back to synchronous execution (see EmailService).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        const logger = new Logger('QueueModule');
        if (!url) {
          logger.warn('REDIS_URL not set — BullMQ will be disabled (sync fallback in producers).');
          // Provide a dummy localhost connection; queues won't actually be used because
          // EmailService.isQueueEnabled() guards every enqueue call.
          return {
            connection: { host: '127.0.0.1', port: 6379, lazyConnect: true, maxRetriesPerRequest: 0 },
          };
        }
        return { connection: { url } };
      },
    }),
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 24 * 3600, count: 1_000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
