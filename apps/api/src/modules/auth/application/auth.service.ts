import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { CreateUser, UpdateUser, User } from '@hausanna/shared';
import { ENV, type Env } from '../../../config/env.js';
import { DomainError, notFound } from '../../../common/domain-error.js';
import type { SessionUser } from '../../../common/auth.decorators.js';
import { EVENT_LOG, type EventLogPort } from '../../events/domain/event-log.port.js';
import { hashPassword, verifyPassword } from '../domain/password.js';
import { signSession, verifySession } from '../domain/session-token.js';
import { toUser, UsersRepository } from '../infrastructure/users.repository.js';

/** Einfacher Schutz gegen Passwort-Raten: max. 10 Versuche / 15 Min. pro E-Mail */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60_000;

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Auth');
  private readonly attempts = new Map<string, { count: number; since: number }>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly users: UsersRepository,
    @Inject(EVENT_LOG) private readonly events: EventLogPort,
  ) {}

  /** Legt beim allerersten Start den Admin aus ADMIN_EMAIL/ADMIN_PASSWORD an. */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.ADMIN_EMAIL || !this.env.ADMIN_PASSWORD) return;
    if ((await this.users.count()) > 0) return;
    await this.users.insert({
      email: this.env.ADMIN_EMAIL,
      name: 'Administrator',
      role: 'admin',
      passwordHash: await hashPassword(this.env.ADMIN_PASSWORD),
    });
    this.logger.log(`Erster Admin angelegt: ${this.env.ADMIN_EMAIL}`);
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const key = email.toLowerCase();
    const now = Date.now();
    const a = this.attempts.get(key);
    if (a && now - a.since < WINDOW_MS && a.count >= MAX_ATTEMPTS) {
      throw new DomainError(
        'forbidden',
        'Zu viele Versuche. Bitte in 15 Minuten erneut probieren.',
      );
    }
    const row = await this.users.findByEmail(key);
    const ok = row?.active && (await verifyPassword(password, row.passwordHash));
    if (!row || !ok) {
      const next =
        a && now - a.since < WINDOW_MS ? { ...a, count: a.count + 1 } : { count: 1, since: now };
      this.attempts.set(key, next);
      if (next.count === 5) {
        await this.events.record('warning', 'auth', `Mehrere fehlgeschlagene Logins für ${key}`);
      }
      throw new DomainError('unauthorized', 'E-Mail oder Passwort falsch');
    }
    this.attempts.delete(key);
    await this.users.update(row.id, { lastLoginAt: new Date() });
    const token = await signSession(
      { sub: row.id, role: row.role, ver: row.tokenVersion },
      this.env.JWT_SECRET,
    );
    return { token, user: toUser(row) };
  }

  /** Prüft Cookie-Token gegen DB (gesperrt? abgemeldet? Rolle geändert?). */
  async resolveSession(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const claims = await verifySession(token, this.env.JWT_SECRET);
    if (!claims) return null;
    const row = await this.users.findById(claims.sub);
    if (!row || !row.active || row.tokenVersion !== claims.ver) return null;
    return { id: row.id, email: row.email, name: row.name, role: row.role };
  }

  async logoutEverywhere(userId: string): Promise<void> {
    await this.users.update(userId, { bumpTokenVersion: true });
  }

  async me(userId: string): Promise<User> {
    const row = await this.users.findById(userId);
    if (!row) throw notFound('Benutzer');
    return toUser(row);
  }

  async listUsers(): Promise<User[]> {
    return (await this.users.findAll()).map(toUser);
  }

  async createUser(input: CreateUser, by: SessionUser): Promise<User> {
    if (await this.users.findByEmail(input.email)) {
      throw new DomainError('conflict', 'Diese E-Mail ist bereits vergeben');
    }
    const row = await this.users.insert({
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    });
    await this.events.record('info', 'auth', `Benutzer ${row.email} angelegt von ${by.email}`);
    return toUser(row);
  }

  async updateUser(id: string, input: UpdateUser, by: SessionUser): Promise<User> {
    const existing = await this.users.findById(id);
    if (!existing) throw notFound('Benutzer');
    const losesAdmin =
      existing.role === 'admin' &&
      existing.active &&
      (input.role === 'editor' || input.active === false);
    if (losesAdmin && (await this.users.countActiveAdmins()) <= 1) {
      throw new DomainError(
        'conflict',
        'Der letzte aktive Administrator kann nicht entfernt werden',
      );
    }
    const row = await this.users.update(id, {
      name: input.name,
      role: input.role,
      active: input.active,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
      // Passwort/Rolle/Sperre geändert → bestehende Sitzungen beenden
      bumpTokenVersion: Boolean(input.password || input.role || input.active === false),
    });
    await this.events.record('info', 'auth', `Benutzer ${existing.email} geändert von ${by.email}`);
    return toUser(row!);
  }
}
