import type { Booking } from '@hausanna/shared';
import { Beds24ChannelAdapter, mapBeds24Booking, toBeds24Booking } from './beds24.adapter.js';

const conn = {
  accommodationId: 'a',
  accommodationName: 'FeWo 2',
  beds24RoomId: '12345',
  icalImportUrls: [],
};
const booking: Booking = {
  id: 'b',
  reference: 'HA-26-ABCDEF',
  accommodationId: 'a',
  arrival: '2026-11-02',
  departure: '2026-11-05',
  adults: 2,
  children: 0,
  status: 'confirmed',
  source: 'website',
  externalRef: null,
  guest: { firstName: 'Max', lastName: 'Muster', email: 'max@example.org' },
  note: '',
  internalNote: '',
  extras: [],
  totalPrice: 300,
  channelSyncState: 'pending',
  channelSyncError: null,
  createdAt: '',
  updatedAt: '',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Beds24ChannelAdapter', () => {
  it('mappt Buchungen inkl. Portal und eigener Referenz', () => {
    expect(
      mapBeds24Booking({
        id: 9,
        arrival: '2026-11-02',
        departure: '2026-11-05',
        channel: 'booking',
        status: 'confirmed',
      }),
    ).toMatchObject({
      externalRef: '9',
      source: 'booking_com',
      status: 'confirmed',
      ourReference: null,
    });
    expect(
      mapBeds24Booking({
        id: 10,
        arrival: '2026-11-02',
        departure: '2026-11-05',
        referer: 'Airbnb',
        status: 'cancelled',
        apiReference: 'HA-26-ABCDEF',
      }),
    ).toMatchObject({ source: 'airbnb', status: 'cancelled', ourReference: 'HA-26-ABCDEF' });
    expect(
      toBeds24Booking({ ...booking, source: 'blocked', guest: null }, '12345', null),
    ).toMatchObject({ status: 'black', roomId: 12345 });
  });

  it('holt Token, meldet Buchung und liefert die Beds24-ID', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.endsWith('/authentication/token')) return json({ token: 'tok', expiresIn: 86400 });
      return json([{ success: true, new: { id: 777 } }]);
    };
    const adapter = new Beds24ChannelAdapter('https://api.test/v2', 'refresh', fetchFn);
    await expect(adapter.pushBooking(booking, conn, null)).resolves.toEqual({
      channelBookingId: '777',
    });
    const post = calls[1]!;
    expect(post.init?.method).toBe('POST');
    expect(new Headers(post.init?.headers).get('token')).toBe('tok');
    expect(JSON.parse(String(post.init?.body))[0]).toMatchObject({
      roomId: 12345,
      apiReference: 'HA-26-ABCDEF',
      arrival: '2026-11-02',
    });
  });

  it('meldet Ablehnung als Fehler', async () => {
    const fetchFn = async (url: string) =>
      url.endsWith('/token')
        ? json({ token: 't', expiresIn: 60 })
        : json([{ success: false, errors: ['not available'] }]);
    const adapter = new Beds24ChannelAdapter('https://api.test/v2', 'r', fetchFn);
    await expect(adapter.pushBooking(booking, conn, null)).rejects.toThrow('abgelehnt');
  });

  it('liest mehrere Seiten', async () => {
    let page = 0;
    const fetchFn = async (url: string) => {
      if (url.endsWith('/token')) return json({ token: 't', expiresIn: 3600 });
      page++;
      return json({
        success: true,
        data: [{ id: page, arrival: '2026-12-01', departure: '2026-12-03', channel: 'airbnb' }],
        pages: { nextPageExists: page < 2 },
      });
    };
    const adapter = new Beds24ChannelAdapter('https://api.test/v2', 'r', fetchFn);
    const res = await adapter.pullBookings(conn, '2026-10-24');
    expect(res.map((b) => b.externalRef)).toEqual(['1', '2']);
  });
});
