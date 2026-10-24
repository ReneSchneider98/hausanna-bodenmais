import { Injectable } from '@nestjs/common';
import type { Booking } from '@hausanna/shared';
import { detectSource, parseIcs } from '../domain/ical.js';
import type {
  ChannelAdapter,
  ChannelConnectionData,
  ExternalBooking,
} from '../domain/channel.port.js';

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
export const FETCH = Symbol('FETCH');

/**
 * Kostenlose Anbindung über iCal-Feeds.
 * Push: passiert indirekt – Booking.com/Airbnb holen unseren Export-Feed ab.
 * Pull: wir holen die Export-Feeds der Portale ab.
 */
@Injectable()
export class IcalChannelAdapter implements ChannelAdapter {
  readonly provider = 'ical' as const;
  readonly pullsOwnCancellations = false;

  constructor(private readonly fetchFn: FetchFn = fetch) {}

  isConfigured(): boolean {
    return true;
  }

  canPush(): boolean {
    return false;
  }

  async pushBooking(_b: Booking): Promise<{ channelBookingId: string | null }> {
    return { channelBookingId: null };
  }

  async cancelBooking(): Promise<void> {}

  async pullBookings(conn: ChannelConnectionData, today: string): Promise<ExternalBooking[]> {
    const all: ExternalBooking[] = [];
    for (const url of conn.icalImportUrls) {
      const res = await this.fetchFn(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok)
        throw new Error(`iCal-Feed ${new URL(url).hostname} antwortet mit ${res.status}`);
      const text = await res.text();
      if (!text.includes('BEGIN:VCALENDAR'))
        throw new Error(`iCal-Feed ${new URL(url).hostname} ist kein Kalender`);
      for (const e of parseIcs(text)) {
        if (e.end <= today) continue;
        all.push({
          externalRef: e.uid,
          arrival: e.start,
          departure: e.end,
          status: e.cancelled ? 'cancelled' : 'confirmed',
          source: detectSource(e.uid, url),
          guest: null,
          adults: 0,
          children: 0,
          totalPrice: null,
          note: e.summary,
          ourReference: null,
        });
      }
    }
    return all;
  }
}
