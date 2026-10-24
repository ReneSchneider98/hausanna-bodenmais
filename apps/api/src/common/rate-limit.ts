import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  UseInterceptors,
  applyDecorators,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { DomainError } from './domain-error.js';

const RATE = 'rateLimit';

/** Einfaches In-Memory-Limit pro IP und Route (reicht für einen Einzelserver). */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const cfg = this.reflector.get<{ limit: number; windowMs: number }>(RATE, ctx.getHandler());
    // In automatisierten Tests aus (dort wird absichtlich oft gebucht)
    if (cfg && process.env.NODE_ENV !== 'test') {
      const req = ctx.switchToHttp().getRequest<Request>();
      const key = `${req.ip}:${req.method}:${req.route?.path ?? req.path}`;
      const now = Date.now();
      const recent = (this.hits.get(key) ?? []).filter((t) => now - t < cfg.windowMs);
      if (recent.length >= cfg.limit) {
        throw new DomainError(
          'forbidden',
          'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.',
        );
      }
      recent.push(now);
      if (this.hits.size > 20_000) this.hits.clear();
      this.hits.set(key, recent);
    }
    return next.handle();
  }
}

export const RateLimit = (limit: number, windowMs: number) =>
  applyDecorators(SetMetadata(RATE, { limit, windowMs }), UseInterceptors(RateLimitInterceptor));
