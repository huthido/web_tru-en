import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global Redis service for pub/sub + cache.
 *
 * Separate from QueueModule (BullMQ) on purpose:
 * - BullMQ owns its own ioredis connections under the hood.
 * - RedisService here is a thin façade for application-level pub/sub +
 *   key-value cache that the rest of the codebase consumes.
 */
@Global()
@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
