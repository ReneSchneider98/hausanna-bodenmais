import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Collection, type Db, ObjectId } from 'mongodb';
import type { DashboardEvent, EventCategory, EventLevel } from '@hausanna/shared';
import { MONGO_DB } from '../../../infrastructure/database/tokens.js';
import type { EventLogPort } from '../domain/event-log.port.js';

interface EventDoc {
  _id?: ObjectId;
  level: EventLevel;
  category: EventCategory;
  message: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
  readAt: Date | null;
}

@Injectable()
export class MongoEventLogAdapter implements EventLogPort, OnModuleInit {
  private readonly logger = new Logger('Events');
  private readonly col: Collection<EventDoc>;

  constructor(@Inject(MONGO_DB) db: Db) {
    this.col = db.collection<EventDoc>('events');
  }

  async onModuleInit(): Promise<void> {
    // Meldungen nach 180 Tagen automatisch löschen
    await this.col
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 180 * 86400 })
      .catch((e: unknown) => this.logger.warn(`MongoDB nicht erreichbar: ${String(e)}`));
  }

  async record(
    level: EventLevel,
    category: EventCategory,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const log = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    this.logger[log](`[${category}] ${message}`);
    try {
      await this.col.insertOne({
        level,
        category,
        message,
        details: details ?? null,
        createdAt: new Date(),
        readAt: null,
      });
    } catch (e) {
      // Logging darf niemals eine Buchung scheitern lassen
      this.logger.error(`Event konnte nicht gespeichert werden: ${String(e)}`);
    }
  }

  async list(opts: { limit: number; unreadOnly?: boolean }): Promise<DashboardEvent[]> {
    const docs = await this.col
      .find(opts.unreadOnly ? { readAt: null } : {})
      .sort({ createdAt: -1 })
      .limit(opts.limit)
      .toArray();
    return docs.map((d) => ({
      id: String(d._id),
      level: d.level,
      category: d.category,
      message: d.message,
      details: d.details,
      createdAt: d.createdAt.toISOString(),
      readAt: d.readAt?.toISOString() ?? null,
    }));
  }

  async countUnread(): Promise<{ total: number; errors: number }> {
    const [total, errors] = await Promise.all([
      this.col.countDocuments({ readAt: null }),
      this.col.countDocuments({ readAt: null, level: 'error' }),
    ]);
    return { total, errors };
  }

  async markRead(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) return;
    await this.col.updateOne({ _id: new ObjectId(id) }, { $set: { readAt: new Date() } });
  }

  async markAllRead(): Promise<void> {
    await this.col.updateMany({ readAt: null }, { $set: { readAt: new Date() } });
  }
}
