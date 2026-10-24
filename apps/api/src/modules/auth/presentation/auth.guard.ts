import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@hausanna/shared';
import { DomainError } from '../../../common/domain-error.js';
import { IS_PUBLIC, ROLES, type SessionUser } from '../../../common/auth.decorators.js';
import { AuthService } from '../application/auth.service.js';
import { SESSION_COOKIE } from '../domain/session-token.js';

/**
 * Global aktiv: Jede Route braucht Login, außer sie ist mit @Public() markiert.
 * Schreibende Admin-Requests müssen zusätzlich den Header X-Requested-With tragen
 * (einfacher CSRF-Schutz, zusätzlich zu SameSite=Strict).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    const user = await this.auth.resolveSession(cookies[SESSION_COOKIE]);
    if (!user) throw new DomainError('unauthorized', 'Bitte anmelden');

    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'hausanna-admin') {
      throw new DomainError('forbidden', 'Ungültige Anfrage');
    }

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(user.role)) {
      throw new DomainError('forbidden', 'Dafür fehlt die Berechtigung');
    }
    req.user = user;
    return true;
  }
}
