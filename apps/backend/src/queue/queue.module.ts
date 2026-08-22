import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

export const EMAIL_QUEUE = 'email';
export const TTS_QUEUE = 'tts';

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
    // Sinh audio AI cho chương (VieNeu-TTS worker). Job chạy dài (nhiều phút)
    // nên concurrency giới hạn ở processor; retry 1 lần là đủ (lỗi thường do
    // worker down — user bấm lại được).
    BullModule.registerQueue({
      name: TTS_QUEUE,
      defaultJobOptions: {
        // Worker TTS tự recycle / bị OOM-kill → "fetch failed" tức thì; 4 lần
        // với backoff 60s/120s/240s đủ để chờ worker lên lại (~15s).
        attempts: 4,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { age: 24 * 3600, count: 500 },
        removeOnFail: { age: 7 * 24 * 3600 },
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
