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

const OWN_SOURCES = new Set(['website', 'admin', 'blocked']);

function toConnData(c: ConnectionRow): ChannelConnectionData {
  return {
    accommodationId: c.accommodationId,
    accommodationName: c.accommodationName,
    beds24RoomId: c.beds24RoomId,
    icalImportUrls: c.icalImportUrls,
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
        .map((c) => {
          const base = `${this.env.PUBLIC_BASE_URL}/api/channels/ical/${c.icalExportToken}.ics`;
          return {
            accommodationId: c.accommodationId,
            accommodationName: c.accommodationName,
            enabled: c.enabled,
            beds24RoomId: c.beds24RoomId,
            icalImportUrls: c.icalImportUrls,
            icalExportUrls: {
              booking_com: `${base}?for=booking_com`,
              airbnb: `${base}?for=airbnb`,
            },
            lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
            lastError: c.lastError,
            lastExportFetchAt: c.lastExportFetchAt?.toISOString() ?? null,
          };
        }),
    };
  }

  async updateConnection(accommodationId: string, input: UpdateChannelConnection): Promise<void> {
    if (!(await this.connections.get(accommodationId))) throw notFound('Unterkunft');
    await this.connections.update(accommodationId, input);
  }

  /** Abgleich aller aktiven Verbindungen (nie parallel). */
  runSync(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.doSync().finally(() => {
      this.running = null;
      this.lastRunAt = new Date();
    });
    return this.running;
  }

  private async doSync(): Promise<void> {
    if (!this.adapter?.isConfigured()) return;
    const today = this.bookingsService.todayIso();
    for (const conn of (await this.connections.list()).filter((c) => c.enabled)) {
      try {
        const external = await this.adapter.pullBookings(toConnData(conn), today);
        await this.reconcile(conn, external, today);
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
  async reconcile(conn: ConnectionRow, external: ExternalBooking[], today: string): Promise<void> {
    const seen = new Set<string>();
    for (const ext of external) {
      // Eigene Buchung, die über Beds24 zurückkommt → nichts zu tun
      if (ext.ourReference || (await this.bookings.findByChannelBookingId(ext.externalRef)))
        continue;
      seen.add(`${ext.source}:${ext.externalRef}`);
      const existing = await this.bookings.findByExternalRef(ext.source, ext.externalRef);
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
          await this.events.record(
            'error',
            'booking',
            `DOPPELBUCHUNG: ${label(ext.source)} meldet ${conn.accommodationName} ${ext.arrival} – ${ext.departure}, der Zeitraum ist bei uns schon belegt! Bitte sofort prüfen.`,
            { externalRef: ext.externalRef, source: ext.source },
          );
        } else throw e;
      }
    }

    // iCal kennt keine Stornos: verschwundene zukünftige Buchungen = storniert
    if (!this.adapter?.pullsOwnCancellations) {
      const active = await this.bookings.list({
        accommodationId: conn.accommodationId,
        from: today,
        status: ['confirmed', 'pending'],
        source: ['booking_com', 'airbnb', 'channel_other'],
      });
      for (const b of active) {
        if (b.externalRef && !seen.has(`${b.source}:${b.externalRef}`)) {
          await this.bookings.update(b.id, { status: 'cancelled' });
          await this.events.record(
            'warning',
            'booking',
            `${label(b.source)}-Buchung nicht mehr im Kalender → storniert: ${conn.accommodationName}, ${b.arrival} – ${b.departure}`,
            { bookingId: b.id },
          );
        }
      }
    }
  }

  /** Eigene Buchung (Webseite/Admin/Sperre) an den Kanal melden. */
  async pushOne(bookingId: string): Promise<void> {
    if (!this.adapter?.isConfigured()) return;
    const row = await this.bookings.findById(bookingId);
    if (!row || !OWN_SOURCES.has(row.source)) return;
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
