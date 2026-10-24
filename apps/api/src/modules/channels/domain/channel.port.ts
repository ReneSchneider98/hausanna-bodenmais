import type { Booking, Guest } from '@hausanna/shared';

/** Buchung, wie sie von einem Kanal (Beds24, iCal-Feed) gemeldet wird. */
export interface ExternalBooking {
  externalRef: string;
  arrival: string;
  departure: string;
  status: 'confirmed' | 'cancelled';
  source: 'booking_com' | 'airbnb' | 'channel_other';
  guest: Partial<Guest> | null;
  adults: number;
  children: number;
  totalPrice: number | null;
  note: string;
  /** Beds24: unsere Buchungsnummer, falls die Buchung ursprünglich von uns kam */
  ourReference: string | null;
}

export interface ChannelConnectionData {
  accommodationId: string;
  accommodationName: string;
  beds24RoomId: string | null;
  icalImportUrls: string[];
}

/**
 * Port für Buchungsportale. Neue Anbindung = neuer Adapter, sonst keine Änderung.
 * - pushBooking: unsere Buchung/Sperre an den Kanal melden (sperrt dort den Zeitraum)
 * - cancelBooking: Stornierung melden
 * - pullBookings: Buchungen des Kanals abholen (Abgleich)
 * - pullsOwnCancellations: liefert der Kanal Stornos explizit (true) oder verschwinden
 *   Buchungen einfach aus dem Feed (iCal, false)?
 */
export interface ChannelAdapter {
  readonly provider: 'beds24' | 'ical';
  readonly pullsOwnCancellations: boolean;
  isConfigured(): boolean;
  canPush(conn: ChannelConnectionData): boolean;
  pushBooking(
    booking: Booking,
    conn: ChannelConnectionData,
    channelBookingId: string | null,
  ): Promise<{ channelBookingId: string | null }>;
  cancelBooking(channelBookingId: string, conn: ChannelConnectionData): Promise<void>;
  pullBookings(conn: ChannelConnectionData, today: string): Promise<ExternalBooking[]>;
}

export const CHANNEL_ADAPTER = Symbol('CHANNEL_ADAPTER');
