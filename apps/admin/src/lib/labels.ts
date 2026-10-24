import type { BookingSource, BookingStatus, ChannelSyncState } from '@hausanna/shared';
import type { Tone } from '../components/ui.tsx';

export const SOURCE_LABEL: Record<BookingSource, string> = {
  website: 'Webseite',
  admin: 'Manuell',
  blocked: 'Sperre',
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  channel_other: 'Anderes Portal',
  wordpress: 'Alte Webseite',
};

export const SOURCES = Object.keys(SOURCE_LABEL) as BookingSource[];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Offen',
  confirmed: 'Bestätigt',
  cancelled: 'Storniert',
};

export const STATUS_TONE: Record<BookingStatus, Tone> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'neutral',
};

export const SYNC_LABEL: Record<ChannelSyncState, { label: string; tone: Tone }> = {
  not_required: { label: 'Kein Abgleich nötig', tone: 'neutral' },
  pending: { label: 'Wird an Portale gemeldet …', tone: 'info' },
  synced: { label: 'An Portale gemeldet', tone: 'success' },
  failed: { label: 'Meldung an Portale fehlgeschlagen', tone: 'danger' },
};

export function guestName(
  guest: { firstName?: string; lastName?: string } | null | undefined,
  source: BookingSource,
): string {
  if (source === 'blocked') return 'Sperre';
  const n = [guest?.firstName, guest?.lastName].filter(Boolean).join(' ');
  return (
    n ||
    (source === 'booking_com'
      ? 'Gast über Booking.com'
      : source === 'airbnb'
        ? 'Gast über Airbnb'
        : 'ohne Namen')
  );
}

export function euro(n: number | null | undefined): string {
  if (n == null) return '–';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}
