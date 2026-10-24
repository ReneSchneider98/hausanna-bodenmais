import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@hausanna/shared';

export const IS_PUBLIC = 'isPublic';
/** Route ohne Login erreichbar (öffentliche Webseite, Webhooks) */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
/** Nur für diese Rollen (Standard: jeder eingeloggte Benutzer) */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUser =>
    ctx.switchToHttp().getRequest<{ user: SessionUser }>().user,
);
