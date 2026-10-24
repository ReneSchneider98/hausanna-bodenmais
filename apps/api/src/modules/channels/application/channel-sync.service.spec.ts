import type { ExternalBooking } from '../domain/channel.port.js';
import { ChannelSyncService } from './channel-sync.service.js';
import { DomainError } from '../../../common/domain-error.js';

type Row = {
  id: string;
  accommodationId: string;
  arrival: string;
  departure: string;
  status: string;
  source: string;
  externalRef: string | null;
  channelBookingId: string | null;
};

/** In-Memory-Ersatz für das Buchungs-Repository inkl. Überschneidungs-Regel der DB */
class FakeBookings {
  rows: Row[] = [];
  async findByChannelBookingId(id: string) {
    return this.rows.find((r) => r.channelBookingId === id);
  }
  async findByExternalRef(source: string, ref: string) {
    return this.rows.find((r) => r.source === source && r.externalRef === ref);
  }
  async findActiveSameStay(acc: string, a: string, d: string, source: string) {
    return this.rows.find(
      (r) =>
        r.accommodationId === acc &&
        r.arrival === a &&
        r.departure === d &&
        r.source === source &&
        r.status !== 'cancelled',
    );
  }
  async insert(data: Omit<Row, 'id' | 'channelBookingId'>) {
    if (
      this.rows.some(
        (r) =>
          r.accommodationId === data.accommodationId &&
          r.status !== 'cancelled' &&
          r.arrival < data.departure &&
          data.arrival < r.departure,
      )
    ) {
      throw new DomainError('conflict', 'belegt');
    }
    const row = { ...data, id: String(this.rows.length + 1), channelBookingId: null } as Row;
    this.rows.push(row);
    return row;
  }
  async update(id: string, data: Partial<Row>) {
    const r = this.rows.find((x) => x.id === id)!;
    Object.assign(r, data);
    return r;
  }
  async list(f: { accommodationId: string; source: string[] }) {
    return this.rows.filter(
      (r) =>
        r.accommodationId === f.accommodationId &&
        f.source.includes(r.source) &&
        r.status !== 'cancelled',
    );
  }
}

const conn = {
  accommodationId: 'acc',
  accommodationName: 'FeWo 2',
  lastError: null,
} as never;
const ext = (o: Partial<ExternalBooking>): ExternalBooking => ({
  externalRef: '1',
  arrival: '2026-11-02',
  departure: '2026-11-05',
  status: 'confirmed',
  source: 'booking_com',
  guest: null,
  adults: 2,
  children: 0,
  totalPrice: null,
  note: '',
  ourReference: null,
  ...o,
});

function setup() {
  const bookings = new FakeBookings();
  const events: string[] = [];
  const svc = new ChannelSyncService(
    { DISABLE_JOBS: true } as never,
    { provider: 'beds24' } as never,
    { record: async (_l: string, _c: string, m: string) => void events.push(m) } as never,
    {} as never,
    bookings as never,
    {} as never,
    { on: () => undefined } as never,
  );
  return { svc, bookings, events };
}

describe('ChannelSyncService.reconcile', () => {
  it('übernimmt neue Portal-Buchungen und meldet sie', async () => {
    const { svc, bookings, events } = setup();
    await svc.reconcile(conn, [ext({})]);
    expect(bookings.rows).toHaveLength(1);
    expect(events[0]).toContain('Neue Buchung über Booking.com');
  });

  it('meldet eine Doppelbuchung laut, statt sie still zu verwerfen', async () => {
    const { svc, bookings, events } = setup();
    bookings.rows.push({
      id: 'w',
      accommodationId: 'acc',
      arrival: '2026-11-03',
      departure: '2026-11-06',
      status: 'confirmed',
      source: 'website',
      externalRef: null,
      channelBookingId: null,
    });
    await svc.reconcile(conn, [ext({ source: 'airbnb' })]);
    expect(events[0]).toContain('DOPPELBUCHUNG');
  });

  it('Kanalwechsel: aus WordPress (iCal-UID) importierte Buchung wird von Beds24 übernommen (kein Fehlalarm)', async () => {
    const { svc, bookings, events } = setup();
    bookings.rows.push({
      id: 'old',
      accommodationId: 'acc',
      arrival: '2026-11-02',
      departure: '2026-11-05',
      status: 'confirmed',
      source: 'booking_com',
      externalRef: 'abc@booking.com',
      channelBookingId: null,
    });
    await svc.reconcile(conn, [ext({ externalRef: '555' })]);
    expect(bookings.rows).toHaveLength(1);
    expect(bookings.rows[0]!.externalRef).toBe('555');
    expect(events).toHaveLength(0);
  });

  it('Doppelbuchungs-Alarm nur einmal je Kanalbuchung', async () => {
    const { svc, bookings, events } = setup();
    bookings.rows.push({
      id: 'w',
      accommodationId: 'acc',
      arrival: '2026-11-03',
      departure: '2026-11-06',
      status: 'confirmed',
      source: 'website',
      externalRef: null,
      channelBookingId: null,
    });
    await svc.reconcile(conn, [ext({ source: 'airbnb' })]);
    await svc.reconcile(conn, [ext({ source: 'airbnb' })]);
    expect(events.filter((e) => e.includes('DOPPELBUCHUNG'))).toHaveLength(1);
  });
});
