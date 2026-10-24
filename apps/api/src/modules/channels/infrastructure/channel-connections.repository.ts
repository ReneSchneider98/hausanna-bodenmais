import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../../infrastructure/database/drizzle.js';
import { accommodations, channelConnections } from '../../../infrastructure/database/schema.js';
import { DB } from '../../../infrastructure/database/tokens.js';

export type ConnectionRow = typeof channelConnections.$inferSelect & {
  accommodationName: string;
  accommodationStatus: string;
};

@Injectable()
export class ChannelConnectionsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Stellt sicher, dass jede Unterkunft eine (deaktivierte) Verbindung hat. */
  async ensureAll(): Promise<void> {
    const accs = await this.db.select({ id: accommodations.id }).from(accommodations);
    if (accs.length === 0) return;
    await this.db
      .insert(channelConnections)
      .values(accs.map((a) => ({ accommodationId: a.id })))
      .onConflictDoNothing();
  }

  async list(): Promise<ConnectionRow[]> {
    await this.ensureAll();
    const rows = await this.db
      .select({
        c: channelConnections,
        name: accommodations.name,
        status: accommodations.status,
        sort: accommodations.sortOrder,
      })
      .from(channelConnections)
      .innerJoin(accommodations, eq(accommodations.id, channelConnections.accommodationId))
      .orderBy(asc(accommodations.sortOrder), asc(accommodations.name));
    return rows.map((r) => ({ ...r.c, accommodationName: r.name, accommodationStatus: r.status }));
  }

  async get(accommodationId: string): Promise<ConnectionRow | undefined> {
    return (await this.list()).find((c) => c.accommodationId === accommodationId);
  }

  async findByExportToken(token: string): Promise<ConnectionRow | undefined> {
    return (await this.list()).find((c) => c.icalExportToken === token);
  }

  async update(
    accommodationId: string,
    data: Partial<
      Pick<
        ConnectionRow,
        | 'enabled'
        | 'beds24RoomId'
        | 'icalImportUrls'
        | 'lastSyncAt'
        | 'lastError'
        | 'lastExportFetchAt'
      >
    >,
  ): Promise<void> {
    await this.ensureAll();
    await this.db
      .update(channelConnections)
      .set(data)
      .where(eq(channelConnections.accommodationId, accommodationId));
  }
}
