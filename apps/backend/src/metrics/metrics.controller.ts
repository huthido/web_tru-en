import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import { register, collectDefaultMetrics } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';

// Register Node.js process default metrics (CPU, memory, GC, event loop lag,
// open file descriptors). Called once at module load. The registry is a
// module-level singleton in prom-client.
collectDefaultMetrics({ prefix: 'web_truyen_' });

/**
 * Prometheus scrape endpoint.
 *   GET /api/metrics
 *
 * Exposes process-level metrics (CPU, memory, event loop lag, GC) plus any
 * counters/histograms registered elsewhere via `prom-client`'s global
 * registry. Public — Prometheus scrapers don't have auth in most setups.
 * When METRICS_TOKEN env var is set, requires Authorization: Bearer <token>.
 */
@Controller('metrics')
export class MetricsController {
    @Public()
    @Get()
    @Header('Content-Type', register.contentType)
    async metrics(@Headers('authorization') auth: string): Promise<string> {
        const token = process.env.METRICS_TOKEN;
        if (!token || auth !== `Bearer ${token}`) {
            throw new UnauthorizedException('Invalid metrics token');
        }
        return register.metrics();
    }
}
