import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EVENT_LOG, type EventLogPort } from '../modules/events/domain/event-log.port.js';
import { DomainError } from './domain-error.js';

const STATUS: Record<DomainError['code'], number> = {
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  validation: HttpStatus.BAD_REQUEST,
  forbidden: HttpStatus.FORBIDDEN,
  unauthorized: HttpStatus.UNAUTHORIZED,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
};

/** Einheitliches Fehlerformat { statusCode, message, code } für alle Clients. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');
  /** gleiche Fehlermeldung höchstens 1× pro 10 Minuten ins Dashboard */
  private readonly recent = new Map<string, number>();

  constructor(@Optional() @Inject(EVENT_LOG) private readonly events?: EventLogPort) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof DomainError) {
      res.status(STATUS[exception.code]).json({
        statusCode: STATUS[exception.code],
        message: exception.message,
        code: exception.code,
      });
      return;
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'object' && body && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;
      res.status(exception.getStatus()).json({ statusCode: exception.getStatus(), message });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    const req = host.switchToHttp().getRequest<Request>();
    const message = exception instanceof Error ? exception.message : String(exception);
    const key = `${req.method} ${req.path} ${message}`;
    const now = Date.now();
    if ((this.recent.get(key) ?? 0) < now - 10 * 60_000) {
      this.recent.set(key, now);
      void this.events?.record(
        'error',
        'system',
        `Serverfehler bei ${req.method} ${req.path}: ${message}`,
      );
    }
    res.status(500).json({ statusCode: 500, message: 'Interner Fehler' });
  }
}
