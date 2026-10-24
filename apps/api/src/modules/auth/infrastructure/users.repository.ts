import { Inject, Injectable } from '@nestjs/common';
import { asc, count, eq, sql } from 'drizzle-orm';
import type { User, UserRole } from '@hausanna/shared';
import type { Database } from '../../../infrastructure/database/drizzle.js';
import { users } from '../../../infrastructure/database/schema.js';
import { DB } from '../../../infrastructure/database/tokens.js';

export type UserRow = typeof users.$inferSelect;

export function toUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    active: r.active,
    lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async count(): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(users);
    return row?.n ?? 0;
  }

  findAll(): Promise<UserRow[]> {
    return this.db.select().from(users).orderBy(asc(users.name));
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return row;
  }

  async insert(data: {
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
  }): Promise<UserRow> {
    const [row] = await this.db
      .insert(users)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();
    return row!;
  }

  async update(
    id: string,
    data: Partial<Pick<UserRow, 'name' | 'role' | 'active' | 'passwordHash' | 'lastLoginAt'>> & {
      bumpTokenVersion?: boolean;
    },
  ): Promise<UserRow | undefined> {
    const { bumpTokenVersion, ...rest } = data;
    const [row] = await this.db
      .update(users)
      .set({
        ...rest,
        ...(bumpTokenVersion ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
      })
      .where(eq(users.id, id))
      .returning();
    return row;
  }

  async countActiveAdmins(): Promise<number> {
    const rows = await this.db.select().from(users).where(eq(users.role, 'admin'));
    return rows.filter((r) => r.active).length;
  }
}
