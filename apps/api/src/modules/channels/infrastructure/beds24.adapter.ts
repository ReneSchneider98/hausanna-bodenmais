import { Logger } from '@nestjs/common';
import type { Booking } from '@hausanna/shared';
import type {
  ChannelAdapter,
  ChannelConnectionData,
  ExternalBooking,
} from '../domain/channel.port.js';
import type { FetchFn } from './ical.adapter.js';

/**
 * Beds24 API v2 (https://api.beds24.com/v2) – Channel-Manager für Booking.com + Airbnb.
 *
 * Authentifizierung: Im Beds24-Konto unter Settings → Apps & Integrations → API einen
 * Invite-Code erzeugen und daraus einmalig einen Refresh-Token holen (siehe README).
 * Mit dem Refresh-Token holt dieser Adapter kurzlebige Access-Tokens.
 *
 * WICHTIG: Feldnamen gemäß Beds24-API-v2-Dokumentation. Vor dem Go-Live mit dem
 * Beds24-Testzugang prüfen (siehe docs/beds24.md). Getestet nur gegen Mocks.
 */
export interface Beds24Booking {
  id?: number;
  roomId?: number;
  status?: string;
  arrival?: string;
  departure?: string;
  numAdult?: number;
  numChild?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  price?: number;
  notes?: string;
  comments?: string;
  referer?: string;
  channel?: string;
  apiReference?: string;
}

const REFERENCE_RE = /^HA-\d{2}-[A-Z0-9]{6}$/;

export function mapBeds24Source(b: Beds24Booking): ExternalBooking['source'] {
  const s = `${b.channel ?? ''} ${b.referer ?? ''}`.toLowerCase();
  if (s.includes('booking')) return 'booking_com';
  if (s.includes('airbnb')) return 'airbnb';
  return 'channel_other';
}

export function mapBeds24Booking(b: Beds24Booking): ExternalBooking | null {
  if (!b.id || !b.arrival || !b.departure) return null;
  const status = (b.status ?? '').toLowerCase();
  // "black" = Sperre, "request"/"inquiry" = Anfrage → blockiert trotzdem
  const cancelled = status === 'cancelled';
  return {
    externalRef: String(b.id),
    arrival: b.arrival,
    departure: b.departure,
    status: cancelled ? 'cancelled' : 'confirmed',
    source: mapBeds24Source(b),
    guest:
      b.firstName || b.lastName || b.email
        ? {
            firstName: b.firstName ?? '',
            lastName: b.lastName ?? '',
            email: b.email ?? '',
            phone: b.phone || b.mobile || '',
            street: b.address ?? '',
            zip: b.postcode ?? '',
            city: b.city ?? '',
            country: (b.country ?? '').slice(0, 2).toUpperCase(),
          }
        : null,
    adults: b.numAdult ?? 0,
    children: b.numChild ?? 0,
    totalPrice: typeof b.price === 'number' ? b.price : null,
    note: [b.comments, b.notes].filter(Boolean).join('\n'),
    ourReference: b.apiReference && REFERENCE_RE.test(b.apiReference) ? b.apiReference : null,
  };
}

export function toBeds24Booking(
  booking: Booking,
  roomId: string,
  channelBookingId: string | null,
): Beds24Booking {
  const g = booking.guest ?? {};
  return {
    ...(channelBookingId ? { id: Number(channelBookingId) } : {}),
    roomId: Number(roomId),
    status:
      booking.status === 'cancelled'
        ? 'cancelled'
        : booking.source === 'blocked'
          ? 'black'
          : 'confirmed',
    arrival: booking.arrival,
    departure: booking.departure,
    numAdult: Math.max(booking.adults, booking.source === 'blocked' ? 0 : 1),
    numChild: booking.children,
    firstName: g.firstName ?? (booking.source === 'blocked' ? 'Sperre' : ''),
    lastName: g.lastName ?? '',
    email: g.email ?? '',
    phone: g.phone ?? '',
    ...(booking.totalPrice != null ? { price: booking.totalPrice } : {}),
    referer: 'Webseite hausanna-bodenmais.de',
    apiReference: booking.reference,
    notes: booking.note,
  };
}

export class Beds24ChannelAdapter implements ChannelAdapter {
  readonly provider = 'beds24' as const;
  readonly pullsOwnCancellations = true;
  private readonly logger = new Logger('Beds24');
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly refreshToken: string | undefined,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.refreshToken);
  }

  canPush(conn: ChannelConnectionData): boolean {
    return Boolean(conn.beds24RoomId);
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    if (!this.refreshToken) throw new Error('BEDS24_REFRESH_TOKEN fehlt');
    const res = await this.fetchFn(`${this.baseUrl}/authentication/token`, {
      headers: { refreshToken: this.refreshToken, accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      token?: string;
      expiresIn?: number;
      error?: string;
    };
    if (!res.ok || !body.token)
      throw new Error(`Beds24-Login fehlgeschlagen: ${body.error ?? res.status}`);
    this.token = { value: body.token, expiresAt: Date.now() + (body.expiresIn ?? 3600) * 1000 };
    return body.token;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        token: await this.accessToken(),
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || json == null) throw new Error(`Beds24 ${method} ${path}: HTTP ${res.status}`);
    return json;
  }

  async pushBooking(
    booking: Booking,
    conn: ChannelConnectionData,
    channelBookingId: string | null,
  ): Promise<{ channelBookingId: string | null }> {
    if (!conn.beds24RoomId)
      throw new Error(`${conn.accommodationName}: keine Beds24-Room-ID hinterlegt`);
    const payload = [toBeds24Booking(booking, conn.beds24RoomId, channelBookingId)];
    const result = await this.request<
      Array<{
        success?: boolean;
        new?: { id?: number };
        modified?: { id?: number };
        errors?: unknown;
        warnings?: unknown;
      }>
    >('POST', '/bookings', payload);
    const r = result[0];
    if (!r?.success)
      throw new Error(`Beds24 hat die Buchung abgelehnt: ${JSON.stringify(r?.errors ?? r)}`);
    if (r.warnings)
      this.logger.warn(`Beds24-Hinweis zu ${booking.reference}: ${JSON.stringify(r.warnings)}`);
    const id =
      r.new?.id ?? r.modified?.id ?? (channelBookingId ? Number(channelBookingId) : undefined);
    return { channelBookingId: id ? String(id) : channelBookingId };
  }

  async cancelBooking(channelBookingId: string): Promise<void> {
    const result = await this.request<Array<{ success?: boolean; errors?: unknown }>>(
      'POST',
      '/bookings',
      [{ id: Number(channelBookingId), status: 'cancelled' }],
    );
    if (!result[0]?.success)
      throw new Error(`Beds24-Storno fehlgeschlagen: ${JSON.stringify(result[0]?.errors)}`);
  }

  async pullBookings(conn: ChannelConnectionData, today: string): Promise<ExternalBooking[]> {
    if (!conn.beds24RoomId) return [];
    const out: ExternalBooking[] = [];
    let page = 1;
    for (;;) {
      const q = new URLSearchParams({
        roomId: conn.beds24RoomId,
        departureFrom: today,
        page: String(page),
      });
      const res = await this.request<{
        success?: boolean;
        data?: Beds24Booking[];
        pages?: { nextPageExists?: boolean };
      }>('GET', `/bookings?${q}`);
      for (const b of res.data ?? []) {
        const mapped = mapBeds24Booking(b);
        if (mapped) out.push(mapped);
      }
      if (!res.pages?.nextPageExists || page >= 20) break;
      page++;
    }
    return out;
  }
}
