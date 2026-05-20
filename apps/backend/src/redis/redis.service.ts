import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin Redis client used by:
 * - NotificationsService (pub/sub for cross-instance SSE fan-out).
 * - WalletService / SettingsService (cache shared across instances).
 *
 * Why two connections? Redis pub/sub mode is exclusive — a subscribed
 * connection cannot execute any other command. So we keep a `commands`
 * client for GET/SET/PUBLISH and a separate `subscriber` client for
 * SUBSCRIBE. Standard pattern.
 *
 * If REDIS_URL is unset, every method is a graceful no-op so dev /
 * single-instance deploys still work without Redis. Callers should check
 * `isEnabled()` when they need to choose between an in-process fallback
 * and the cross-instance path (e.g. NotificationsService falls back to
 * its in-process Subject so SSE still works locally).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private commands: Redis | null = null;
    private subscriber: Redis | null = null;
    /** channel → set of handlers (one Redis SUBSCRIBE per channel; multiple in-process listeners share it). */
    private subscribers = new Map<string, Set<(msg: string) => void>>();

    constructor(private config: ConfigService) {
        const url = this.config.get<string>('REDIS_URL');
        if (!url) {
            this.logger.warn('REDIS_URL not set — pub/sub disabled, cache fallback to in-process.');
            return;
        }
        const opts = {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        };
        this.commands = new Redis(url, opts);
        this.subscriber = new Redis(url, opts);
        this.commands.on('error', (err) => this.logger.warn(`Redis commands error: ${err.message}`));
        this.subscriber.on('error', (err) => this.logger.warn(`Redis subscriber error: ${err.message}`));
        this.subscriber.on('message', (channel, message) => {
            const handlers = this.subscribers.get(channel);
            if (!handlers) return;
            handlers.forEach((h) => {
                try {
                    h(message);
                } catch (e: any) {
                    this.logger.warn(`Subscriber handler threw for channel ${channel}: ${e.message}`);
                }
            });
        });
        this.logger.log('Redis service ready (pub/sub + cache enabled).');
    }

    isEnabled(): boolean {
        return !!this.commands && !!this.subscriber;
    }

    async publish(channel: string, message: string): Promise<void> {
        if (!this.commands) return;
        try {
            await this.commands.publish(channel, message);
        } catch (e: any) {
            this.logger.warn(`publish(${channel}) failed: ${e.message}`);
        }
    }

    async subscribe(channel: string, handler: (msg: string) => void): Promise<void> {
        if (!this.subscriber) return;
        let handlers = this.subscribers.get(channel);
        if (!handlers) {
            handlers = new Set();
            this.subscribers.set(channel, handlers);
            try {
                await this.subscriber.subscribe(channel);
            } catch (e: any) {
                this.logger.warn(`subscribe(${channel}) failed: ${e.message}`);
                this.subscribers.delete(channel);
                return;
            }
        }
        handlers.add(handler);
    }

    async get(key: string): Promise<string | null> {
        if (!this.commands) return null;
        try {
            return await this.commands.get(key);
        } catch (e: any) {
            this.logger.warn(`get(${key}) failed: ${e.message}`);
            return null;
        }
    }

    async set(key: string, value: string, ttlSec?: number): Promise<void> {
        if (!this.commands) return;
        try {
            if (ttlSec) {
                await this.commands.set(key, value, 'EX', ttlSec);
            } else {
                await this.commands.set(key, value);
            }
        } catch (e: any) {
            this.logger.warn(`set(${key}) failed: ${e.message}`);
        }
    }

    async del(...keys: string[]): Promise<void> {
        if (!this.commands || keys.length === 0) return;
        try {
            await this.commands.del(...keys);
        } catch (e: any) {
            this.logger.warn(`del(${keys.join(',')}) failed: ${e.message}`);
        }
    }

    async onModuleDestroy() {
        try { await this.commands?.quit(); } catch { /* shutdown noise */ }
        try { await this.subscriber?.quit(); } catch { /* shutdown noise */ }
    }
}
