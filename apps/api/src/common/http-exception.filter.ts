import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
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
    res.status(500).json({ statusCode: 500, message: 'Interner Fehler' });
  }
}
