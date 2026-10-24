import { Inject, Injectable } from '@nestjs/common';
import {
  addDays,
  type Availability,
  type Booking,
  type BookingStatus,
  type CalendarResponse,
  type CreateAdminBooking,
  type CreatePublicBooking,
  type PriceQuote,
  type PublicBookingResult,
  type QuoteRequest,
  toIsoDate,
  type UpdateBooking,
} from '@hausanna/shared';
import { DomainError, notFound } from '../../../common/domain-error.js';
import { DomainEvents } from '../../../common/domain-events.js';
import type { SessionUser } from '../../../common/auth.decorators.js';
import { ENV, type Env } from '../../../config/env.js';
import { MAIL, type MailPort } from '../../../infrastructure/mail/mail.port.js';
import { calculateQuote } from '../../accommodations/domain/pricing.js';
import {
  ACCOMMODATION_CATALOG,
  type AccommodationCatalog,
} from '../../accommodations/infrastructure/accommodations.repository.js';
import { SiteSettingsService } from '../../content/application/site-settings.service.js';
import { EVENT_LOG, type EventLogPort } from '../../events/domain/event-log.port.js';
import { guestConfirmationMail, ownerNotificationMail } from '../domain/booking-mails.js';
import { newBookingReference } from '../domain/reference.js';
import {
  type BookingFilter,
  BookingsRepository,
  toBooking,
} from '../infrastructure/bookings.repository.js';

export const CLOCK = Symbol('CLOCK');

/** Eigene Buchungen, die an den Kanal (Beds24) gemeldet werden */
const OWN_SOURCES: string[] = ['website', 'admin', 'blocked', 'wordpress'];
export type Clock = () => Date;

@Injectable()
export class BookingsService {
  constructor(
    private readonly repo: BookingsRepository,
    @Inject(ACCOMMODATION_CATALOG) private readonly catalog: AccommodationCatalog,
    @Inject(EVENT_LOG) private readonly events: EventLogPort,
    @Inject(MAIL) private readonly mail: MailPort,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bus: DomainEvents,
    private readonly settings: SiteSettingsService,
  ) {}

  private today(): string {
    // Kalendertag in Deutschland
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(this.clock());
  }

  /** Belegte Zeiträume für den öffentlichen Kalender (ohne Gastdaten). */
  async availability(accommodationId: string, from?: string, to?: string): Promise<Availability> {
    const start = from ?? this.today();
    const end = to ?? addDays(start, 550);
    const rows = await this.repo.activeFrom(accommodationId, start, end);
    // aneinandergrenzende Buchungen zusammenfassen
    const blocked: { from: string; to: string }[] = [];
    for (const r of rows) {
      const last = blocked.at(-1);
      if (last && r.arrival <= last.to) last.to = r.departure > last.to ? r.departure : last.to;
      else blocked.push({ from: r.arrival, to: r.departure });
    }
    return { accommodationId, blocked };
  }

  async quote(req: QuoteRequest): Promise<PriceQuote> {
    const acc = await this.catalog.findById(req.accommodationId);
    if (!acc || acc.status !== 'published') throw notFound('Unterkunft');
    const [seasons, seasonPrices, extras] = await Promise.all([
      this.catalog.listSeasons(),
      this.catalog.listSeasonPrices(acc.id),
      this.catalog.listExtras(true),
    ]);
    const quote = calculateQuote({
      accommodation: acc,
      seasons,
      seasonPrices,
      extras,
      arrival: req.arrival,
      departure: req.departure,
      adults: req.adults,
      children: req.children,
      selectedExtras: req.extras,
      today: this.today(),
    });
    if (!quote.available) return quote;
    const overlapping = await this.repo.activeFrom(acc.id, req.arrival, req.departure);
    if (overlapping.length > 0) {
      return { ...quote, available: false, reason: 'Der Zeitraum ist leider bereits belegt.' };
    }
    return quote;
  }

  /** Buchung über die Webseite: sofort bestätigt, Kanäle werden direkt informiert. */
  async createPublic(input: CreatePublicBooking): Promise<PublicBookingResult> {
    if (input.website) throw new DomainError('validation', 'Ungültige Anfrage');
    const quote = await this.quote(input);
    if (!quote.available) throw new DomainError('conflict', quote.reason ?? 'Nicht verfügbar');
    const acc = (await this.catalog.findById(input.accommodationId))!;
    const syncNeeded = this.env.CHANNEL_PROVIDER === 'beds24';

    // Die Datenbank garantiert: keine Überschneidung (sonst 409)
    const row = await this.repo.insert({
      reference: newBookingReference(this.clock()),
      accommodationId: acc.id,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      status: 'confirmed',
      source: 'website',
      guest: input.guest,
      note: input.note,
      extras: input.extras,
      totalPrice: quote.total,
      channelSyncState: syncNeeded ? 'pending' : 'not_required',
    });

    this.bus.emit('booking.changed', { bookingId: row.id, reason: 'created' });
    await this.events.record(
      'info',
      'booking',
      `Neue Buchung ${row.reference}: ${acc.name}, ${row.arrival} – ${row.departure}`,
      {
        bookingId: row.id,
      },
    );

    const site = await this.settings.get();
    const mailData = {
      reference: row.reference,
      accommodationName: acc.name,
      arrival: row.arrival,
      departure: row.departure,
      adults: row.adults,
      children: row.children,
      guestName: `${input.guest.firstName} ${input.guest.lastName}`,
      guestEmail: input.guest.email,
      guestPhone: input.guest.phone,
      note: input.note,
      quote,
      checkInFrom: site.info.checkInFrom,
      checkOutUntil: site.info.checkOutUntil,
      contactPhone: site.info.contact.phone,
      contactEmail: site.info.contact.email,
    };
    // Mails im Hintergrund: ein langsamer Mailserver darf die Antwort an den Gast nicht verzögern
    void Promise.all([
      this.mail.send(guestConfirmationMail(mailData)),
      this.mail.send(ownerNotificationMail(mailData, this.env.MAIL_OWNER_TO)),
    ]).catch((e: unknown) =>
      this.events.record('error', 'booking', `E-Mail zu Buchung ${row.reference} fehlgeschlagen`, {
        error: String(e),
      }),
    );

    return {
      reference: row.reference,
      status: row.status,
      arrival: row.arrival,
      departure: row.departure,
      total: quote.total,
      accommodationName: acc.name,
    };
  }

  async createAdmin(input: CreateAdminBooking, by: SessionUser): Promise<Booking> {
    const acc = await this.catalog.findById(input.accommodationId);
    if (!acc) throw notFound('Unterkunft');
    const row = await this.repo.insert({
      reference: newBookingReference(this.clock()),
      accommodationId: acc.id,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
      status: input.status,
      source: input.source,
      guest: input.guest,
      note: input.note,
      internalNote: input.internalNote,
      extras: input.extras,
      totalPrice: input.totalPrice,
      channelSyncState: this.env.CHANNEL_PROVIDER === 'beds24' ? 'pending' : 'not_required',
    });
    this.bus.emit('booking.changed', { bookingId: row.id, reason: 'created' });
    await this.events.record(
      'info',
      'booking',
      `${input.source === 'blocked' ? 'Sperre' : 'Buchung'} ${row.reference} angelegt von ${by.email}: ${acc.name}, ${row.arrival} – ${row.departure}`,
      { bookingId: row.id },
    );
    return toBooking(row);
  }

  async update(id: string, input: UpdateBooking, by: SessionUser): Promise<Booking> {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound('Buchung');
    const row = await this.repo.update(id, {
      ...input,
      guest: input.guest === undefined ? undefined : input.guest,
      channelSyncState:
        this.env.CHANNEL_PROVIDER === 'beds24' && OWN_SOURCES.includes(existing.source)
          ? 'pending'
          : existing.channelSyncState,
    });
    const cancelled = input.status === 'cancelled' && existing.status !== 'cancelled';
    this.bus.emit('booking.changed', {
      bookingId: id,
      reason: cancelled ? 'cancelled' : 'updated',
    });
    await this.events.record(
      cancelled ? 'warning' : 'info',
      'booking',
      `Buchung ${existing.reference} ${cancelled ? 'storniert' : 'geändert'} von ${by.email}`,
      { bookingId: id },
    );
    return toBooking(row!);
  }

  async get(id: string): Promise<Booking> {
    const row = await this.repo.findById(id);
    if (!row) throw notFound('Buchung');
    return toBooking(row);
  }

  async list(filter: BookingFilter): Promise<Booking[]> {
    return (await this.repo.list(filter)).map(toBooking);
  }

  async calendar(
    from: string,
    to: string,
    accommodations: { id: string; name: string }[],
  ): Promise<CalendarResponse> {
    const rows = await this.repo.list({
      from,
      to,
      status: ['pending', 'confirmed'] as BookingStatus[],
    });
    return { from, to, accommodations, bookings: rows.map(toBooking) };
  }

  todayIso(): string {
    return this.today();
  }

  static isoToday(d: Date): string {
    return toIsoDate(d);
  }
}
