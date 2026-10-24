import { jwtVerify, SignJWT } from 'jose';
import type { UserRole } from '@hausanna/shared';

export interface SessionClaims {
  sub: string;
  role: UserRole;
  /** muss zur tokenVersion des Benutzers passen (Abmelden überall / Sperren) */
  ver: number;
}

export const SESSION_COOKIE = 'hausanna_session';
export const SESSION_HOURS = 12;
/**
 * Lesbarer Hinweis "im Admin angemeldet" (kein Geheimnis): Die Webseite fragt nur dann
 * /api/auth/me ab und zeigt "Zur Verwaltung" – normale Besucher lösen keine Anfrage aus.
 */
export const ADMIN_HINT_COOKIE = 'hausanna_admin';

export async function signSession(claims: SessionClaims, secret: string): Promise<string> {
  return new SignJWT({ role: claims.role, ver: claims.ver })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') return null;
    return { sub: payload.sub, role: payload.role as UserRole, ver: payload.ver };
  } catch {
    return null;
  }
}
