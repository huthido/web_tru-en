import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

/**
 * Stdout-only Winston logger.
 *
 * Why no file transports?
 * Container orchestration (Coolify / Docker / k8s) already captures stdout
 * into its own log aggregation pipeline — writing duplicate files inside the
 * container costs disk in an ephemeral filesystem and is invisible to the
 * platform's log viewer. Centralized logs (Loki / ELK / Coolify built-in)
 * always read stdout, so we route there exclusively.
 *
 * Format:
 * - Production: JSON (machine-parseable for the aggregator).
 * - Development: colorized + human-readable.
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';

    const consoleFormat = isProd
      ? winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json(),
        )
      : winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? ` ${JSON.stringify(meta)}`
              : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          }),
        );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: { service: 'web-truyen-api' },
      transports: [new winston.transports.Console({ format: consoleFormat })],
      // Uncaught exceptions / rejections also land in stdout so the platform
      // captures them; no separate files needed.
      exceptionHandlers: [new winston.transports.Console({ format: consoleFormat })],
      rejectionHandlers: [new winston.transports.Console({ format: consoleFormat })],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
