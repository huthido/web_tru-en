import { Controller, Get, Header } from '@nestjs/common';
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
 * In production, restrict via Traefik IP allowlist or a basic-auth label
 * if the backend is internet-exposed.
 */
@Controller('metrics')
export class MetricsController {
    @Public()
    @Get()
    @Header('Content-Type', register.contentType)
    async metrics(): Promise<string> {
        return register.metrics();
    }
}
