import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { Booking, ChannelOverview, UpdateChannelConnection } from '@hausanna/shared';
import { DomainError, notFound } from '../../../common/domain-error.js';
import { DomainEvents } from '../../../common/domain-events.js';
import { ENV, type Env } from '../../../config/env.js';
import { BookingsService } from '../../bookings/application/bookings.service.js';
import {
  BookingsRepository,
  toBooking,
} from '../../bookings/infrastructure/bookings.repository.js';
import { EVENT_LOG, type EventLogPort } from '../../events/domain/event-log.port.js';
import {
  CHANNEL_ADAPTER,
  type ChannelAdapter,
  type ChannelConnectionData,
  type ExternalBooking,
} from '../domain/channel.port.js';
import {
  ChannelConnectionsRepository,
  type ConnectionRow,
} from '../infrastructure/channel-connections.repository.js';

/** Eigene Buchungen (inkl. WordPress-Altbestand) werden an den Kanal gemeldet */
const OWN_SOURCES = new Set(['website', 'admin', 'blocked', 'wordpress']);

function toConnData(c: ConnectionRow): ChannelConnectionData {
  return {
    accommodationId: c.accommodationId,
    accommodationName: c.accommodationName,
    beds24RoomId: c.beds24RoomId,
  };
}

/**
 * Hält Buchungen zwischen unserem Backend (Master) und dem Kanal synchron.
 * 1. Push: neue/geänderte eigene Buchungen sofort an den Kanal (Event "booking.changed")
 * 2. Pull: regelmäßig + per Webhook Buchungen des Kanals abholen und abgleichen
 */
@Injectable()
export class ChannelSyncService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('ChannelSync');
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private lastRunAt: Date | null = null;
  private webhookDebounce: NodeJS.Timeout | null = null;
  private rerunRequested = false;
  /** Pushes je Buchung nie parallel (sonst Duplikate bei Beds24) */
  private readonly pushing = new Set<string>();
  /** Doppelbuchungs-Alarme nur einmal melden */
  private readonly alerted = new Set<string>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(CHANNEL_ADAPTER) private readonly adapter: ChannelAdapter | null,
    @Inject(EVENT_LOG) private readonly events: EventLogPort,
    private readonly connections: ChannelConnectionsRepository,
    private readonly bookings: BookingsRepository,
    private readonly bookingsService: BookingsService,
    private readonly bus: DomainEvents,
  ) {}

  onModuleInit(): void {
    this.bus.on('booking.changed', ({ bookingId }) => this.pushOne(bookingId));
    if (this.env.DISABLE_JOBS || !this.adapter) return;
    const ms = this.env.CHANNEL_SYNC_INTERVAL_MINUTES * 60_000;
    this.timer = setInterval(() => void this.runSync(), ms);
    setTimeout(() => void this.runSync(), 10_000).unref();
    this.logger.log(
      `Kanal "${this.adapter.provider}" aktiv, Abgleich alle ${this.env.CHANNEL_SYNC_INTERVAL_MINUTES} Min.`,
    );
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.webhookDebounce) clearTimeout(this.webhookDebounce);
  }

  /** Webhook von Beds24: kurz sammeln, dann abgleichen. */
  triggerSoon(): void {
    if (this.webhookDebounce) clearTimeout(this.webhookDebounce);
    this.webhookDebounce = setTimeout(() => void this.runSync(), 3_000);
  }

  async overview(): Promise<ChannelOverview> {
    const conns = await this.connections.list();
    const pending = await this.bookings.pendingChannelSync();
    return {
      provider: this.adapter?.provider ?? 'none',
      configured: this.adapter?.isConfigured() ?? false,
      syncIntervalMinutes: this.env.CHANNEL_SYNC_INTERVAL_MINUTES,
      lastRunAt: this.lastRunAt?.toISOString() ?? null,
      pendingPushes: pending.filter((b) => b.channelSyncState === 'pending').length,
      failedPushes: pending.filter((b) => b.channelSyncState === 'failed').length,
      connections: conns
        .filter((c) => c.accommodationStatus !== 'archived')
        .map((c) => ({
          accommodationId: c.accommodationId,
          accommodationName: c.accommodationName,
          enabled: c.enabled,
          beds24RoomId: c.beds24RoomId,
          lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
          lastError: c.lastError,
        })),
    };
  }

  async updateConnection(accommodationId: string, input: UpdateChannelConnection): Promise<void> {
    const before = await this.connections.get(accommodationId);
    if (!before) throw notFound('Unterkunft');
    await this.connections.update(accommodationId, input);
    const after = (await this.connections.get(accommodationId))!;
    const activated =
      after.enabled && (!before.enabled || before.beds24RoomId !== after.beds24RoomId);
    if (activated && this.adapter?.provider === 'beds24') {
      // Alle zukünftigen eigenen Buchungen nachmelden (z. B. vor dem Go-Live angelegt)
      const own = await this.bookings.list({
        accommodationId,
        from: this.bookingsService.todayIso(),
        status: ['confirmed', 'pending'],
        source: ['website', 'admin', 'blocked', 'wordpress'],
      });
      for (const b of own) await this.bookings.update(b.id, { channelSyncState: 'pending' });
      if (own.length) {
        await this.events.record(
          'info',
          'channel',
          `${after.accommodationName}: ${own.length} bestehende Buchungen werden an Beds24 gemeldet`,
        );
        void this.runSync();
      }
    }
  }

  /** Abgleich aller aktiven Verbindungen (nie parallel; Anfragen währenddessen → ein Folgelauf). */
  runSync(): Promise<void> {
    if (this.running) {
      this.rerunRequested = true;
      return this.running;
    }
    this.running = this.doSync().finally(() => {
      this.running = null;
      this.lastRunAt = new Date();
      if (this.rerunRequested) {
        this.rerunRequested = false;
        void this.runSync();
      }
    });
    return this.running;
  }

  private async doSync(): Promise<void> {
    if (!this.adapter?.isConfigured()) return;
    const today = this.bookingsService.todayIso();
    for (const conn of (await this.connections.list()).filter((c) => c.enabled)) {
      try {
        const external = await this.adapter.pullBookings(toConnData(conn), today);
        await this.reconcile(conn, external);
        await this.connections.update(conn.accommodationId, {
          lastSyncAt: new Date(),
          lastError: null,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await this.connections.update(conn.accommodationId, { lastError: msg });
        if (conn.lastError !== msg) {
          await this.events.record(
            'error',
            'channel',
            `Abgleich ${conn.accommodationName} fehlgeschlagen: ${msg}`,
          );
        }
      }
    }
    // Fehlgeschlagene Pushes erneut versuchen
    for (const b of await this.bookings.pendingChannelSync()) await this.pushOne(b.id);
  }

  /** Kanal-Buchungen ins Backend übernehmen. Konflikte werden laut gemeldet, nie still verworfen. */
  async reconcile(conn: ConnectionRow, external: ExternalBooking[]): Promise<void> {
    for (const ext of external) {
      // Eigene Buchung, die über Beds24 zurückkommt → nichts zu tun
      if (ext.ourReference || (await this.bookings.findByChannelBookingId(ext.externalRef)))
        continue;
      let existing = await this.bookings.findByExternalRef(ext.source, ext.externalRef);
      if (!existing && ext.status === 'confirmed') {
        // Kanalwechsel: dieselbe Buchung kam früher über WordPress (iCal-UID statt Beds24-ID)
        const sameStay = await this.bookings.findActiveSameStay(
          conn.accommodationId,
          ext.arrival,
          ext.departure,
          ext.source,
        );
        if (
          sameStay &&
          sameStay.externalRef !== ext.externalRef &&
          (sameStay.externalRef ?? '').includes('@')
        ) {
          existing = (await this.bookings.update(sameStay.id, {
            externalRef: ext.externalRef,
            ...(ext.guest ? { guest: ext.guest } : {}),
          }))!;
          continue;
        }
      }
      try {
        if (!existing) {
          if (ext.status === 'cancelled') continue;
          const row = await this.bookings.insert({
            reference: `CH-${ext.externalRef}`.slice(0, 40),
            accommodationId: conn.accommodationId,
            arrival: ext.arrival,
            departure: ext.departure,
            adults: ext.adults,
            children: ext.children,
            status: 'confirmed',
            source: ext.source,
            externalRef: ext.externalRef,
            guest: ext.guest,
            note: ext.note,
            totalPrice: ext.totalPrice,
            channelSyncState: 'not_required',
          });
          await this.events.record(
            'info',
            'booking',
            `Neue Buchung über ${label(ext.source)}: ${conn.accommodationName}, ${row.arrival} – ${row.departure}`,
            { bookingId: row.id },
          );
        } else {
          const status =
            ext.status === 'cancelled'
              ? 'cancelled'
              : existing.status === 'cancelled'
                ? 'confirmed'
                : existing.status;
          const changed =
            existing.arrival !== ext.arrival ||
            existing.departure !== ext.departure ||
            existing.status !== status;
          if (!changed) continue;
          await this.bookings.update(existing.id, {
            arrival: ext.arrival,
            departure: ext.departure,
            status,
            ...(ext.guest ? { guest: ext.guest } : {}),
          });
          await this.events.record(
            status === 'cancelled' ? 'warning' : 'info',
            'booking',
            `${label(ext.source)}-Buchung ${status === 'cancelled' ? 'storniert' : 'geändert'}: ${conn.accommodationName}, ${ext.arrival} – ${ext.departure}`,
            { bookingId: existing.id },
          );
        }
      } catch (e) {
        if (e instanceof DomainError && e.code === 'conflict') {
          const key = `dup:${ext.source}:${ext.externalRef}:${ext.arrival}:${ext.departure}`;
          if (this.alerted.has(key)) continue;
          this.alerted.add(key);
          await this.events.record(
            'error',
            'booking',
            `DOPPELBUCHUNG: ${label(ext.source)} meldet ${conn.accommodationName} ${ext.arrival} – ${ext.departure}, der Zeitraum ist bei uns schon belegt! Bitte sofort prüfen.`,
            { externalRef: ext.externalRef, source: ext.source },
          );
        } else throw e;
      }
    }
  }

  /** Eigene Buchung (Webseite/Admin/Sperre) an den Kanal melden. */
  async pushOne(bookingId: string): Promise<void> {
    if (!this.adapter?.isConfigured() || this.pushing.has(bookingId)) return;
    this.pushing.add(bookingId);
    try {
      await this.pushLocked(bookingId);
    } finally {
      this.pushing.delete(bookingId);
    }
  }

  private async pushLocked(bookingId: string): Promise<void> {
    if (!this.adapter) return;
    const row = await this.bookings.findById(bookingId);
    if (!row) return;
    if (!OWN_SOURCES.has(row.source)) {
      // Portal-Buchungen werden nie zurückgemeldet
      if (row.channelSyncState === 'pending' || row.channelSyncState === 'failed') {
        await this.bookings.update(row.id, { channelSyncState: 'not_required' });
      }
      return;
    }
    const conn = await this.connections.get(row.accommodationId);
    if (!conn?.enabled || !this.adapter.canPush(toConnData(conn))) {
      if (row.channelSyncState === 'pending')
        await this.bookings.update(row.id, { channelSyncState: 'not_required' });
      return;
    }
    const booking: Booking = toBooking(row);
    try {
      if (row.status === 'cancelled') {
        if (row.channelBookingId)
          await this.adapter.cancelBooking(row.channelBookingId, toConnData(conn));
        await this.bookings.update(row.id, { channelSyncState: 'synced', channelSyncError: null });
      } else {
        const { channelBookingId } = await this.adapter.pushBooking(
          booking,
          toConnData(conn),
          row.channelBookingId,
        );
        await this.bookings.update(row.id, {
          channelSyncState: 'synced',
          channelSyncError: null,
          channelBookingId,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.bookings.update(row.id, { channelSyncState: 'failed', channelSyncError: msg });
      if (row.channelSyncState !== 'failed') {
        await this.events.record(
          'error',
          'channel',
          `Buchung ${row.reference} konnte nicht an ${this.adapter.provider} gemeldet werden: ${msg}`,
          { bookingId: row.id },
        );
      }
    }
  }
}

function label(source: string): string {
  return source === 'booking_com' ? 'Booking.com' : source === 'airbnb' ? 'Airbnb' : 'Kanal';
}
