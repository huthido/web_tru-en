import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

// Metadata key set by NestJS's @Sse() decorator on the route handler.
const SSE_METADATA = 'sse';

/**
 * Wraps every successful response in a uniform { success, data, timestamp }
 * envelope. Registered globally in main.ts so the whole API is consistent —
 * the frontend apiClient unwraps this envelope in one place.
 *
 * Pass-through cases (NOT wrapped):
 *  - @Sse() endpoints — they emit a stream of MessageEvents, not a response.
 *  - payloads already in ApiResponse shape (have a `success` field) — e.g.
 *    hand-built envelopes, or results like BuyChapterResponse.
 *  - non-JSON payloads: strings (Prometheus /metrics) and Buffers — their
 *    controllers set their own Content-Type.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Never touch Server-Sent Events: each emission is a MessageEvent.
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler())) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If data is already in ApiResponse format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Don't wrap non-JSON responses (e.g. Prometheus /metrics returns a
        // raw string, file/buffer responses).
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
          return data;
        }

        // Wrap in standard API response format
        const response: ApiResponse = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };

        return response;
      })
    );
  }
}

