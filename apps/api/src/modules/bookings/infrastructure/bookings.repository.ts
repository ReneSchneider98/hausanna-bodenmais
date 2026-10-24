import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, gte, inArray, lt, ne, type SQL } from 'drizzle-orm';
import type { Booking, BookingSource, BookingStatus } from '@hausanna/shared';
import { DomainError } from '../../../common/domain-error.js';
import { pgErrorCode, PG_ERROR, type Database } from '../../../infrastructure/database/drizzle.js';
import { bookings } from '../../../infrastructure/database/schema.js';
import { DB } from '../../../infrastructure/database/tokens.js';

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;

export function toBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    reference: r.reference,
    accommodationId: r.accommodationId,
    arrival: r.arrival,
    departure: r.departure,
    adults: r.adults,
    children: r.children,
    status: r.status,
    source: r.source,
    externalRef: r.externalRef,
    guest: r.guest ?? null,
    note: r.note,
    internalNote: r.internalNote,
    extras: r.extras,
    totalPrice: r.totalPrice,
    channelSyncState: r.channelSyncState,
    channelSyncError: r.channelSyncError,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const OVERLAP_MESSAGE = 'Der Zeitraum ist leider bereits belegt.';

function mapWriteError(e: unknown): never {
  const code = pgErrorCode(e);
  if (code === PG_ERROR.exclusionViolation) throw new DomainError('conflict', OVERLAP_MESSAGE);
  if (code === '23514')
    throw new DomainError('validation', 'Die Abreise muss nach der Anreise liegen.');
  throw e;
}

export interface BookingFilter {
  from?: string;
  to?: string;
  accommodationId?: string;
  status?: BookingStatus[];
  source?: BookingSource[];
}

@Injectable()
export class BookingsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Insert – die DB lehnt Überschneidungen ab (EXCLUDE-Constraint) → 409 */
  async insert(data: NewBookingRow): Promise<BookingRow> {
    try {
      const [row] = await this.db.insert(bookings).values(data).returning();
      return row!;
    } catch (e) {
      mapWriteError(e);
    }
  }

  async update(id: string, data: Partial<NewBookingRow>): Promise<BookingRow | undefined> {
    try {
      const [row] = await this.db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
      return row;
    } catch (e) {
      mapWriteError(e);
    }
  }

  async findById(id: string): Promise<BookingRow | undefined> {
    const [row] = await this.db.select().from(bookings).where(eq(bookings.id, id));
    return row;
  }

  async findByExternalRef(
    source: BookingSource,
    externalRef: string,
  ): Promise<BookingRow | undefined> {
    const [row] = await this.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.source, source), eq(bookings.externalRef, externalRef)));
    return row;
  }

  async findByChannelBookingId(channelBookingId: string): Promise<BookingRow | undefined> {
    const [row] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.channelBookingId, channelBookingId));
    return row;
  }

  /** Buchungen, die den Zeitraum [from, to) berühren */
  async list(
    filter: BookingFilter,
    order: 'arrival' | 'created' = 'arrival',
  ): Promise<BookingRow[]> {
    const where: SQL[] = [];
    if (filter.from) where.push(gt(bookings.departure, filter.from));
    if (filter.to) where.push(lt(bookings.arrival, filter.to));
    if (filter.accommodationId) where.push(eq(bookings.accommodationId, filter.accommodationId));
    if (filter.status?.length) where.push(inArray(bookings.status, filter.status));
    if (filter.source?.length) where.push(inArray(bookings.source, filter.source));
    return this.db
      .select()
      .from(bookings)
      .where(and(...where))
      .orderBy(order === 'arrival' ? asc(bookings.arrival) : desc(bookings.createdAt))
      .limit(2000);
  }

  /** Aktive (nicht stornierte) Belegungen ab einem Datum */
  activeFrom(accommodationId: string, from: string, to: string): Promise<BookingRow[]> {
    return this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.accommodationId, accommodationId),
          ne(bookings.status, 'cancelled'),
          gt(bookings.departure, from),
          lt(bookings.arrival, to),
        ),
      )
      .orderBy(asc(bookings.arrival));
  }

  pendingChannelSync(): Promise<BookingRow[]> {
    return this.db
      .select()
      .from(bookings)
      .where(inArray(bookings.channelSyncState, ['pending', 'failed']))
      .orderBy(asc(bookings.updatedAt))
      .limit(100);
  }

  createdSince(since: Date): Promise<BookingRow[]> {
    return this.db.select().from(bookings).where(gte(bookings.createdAt, since));
  }
}
