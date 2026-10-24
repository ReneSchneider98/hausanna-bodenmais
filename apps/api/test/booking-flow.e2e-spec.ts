import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Accommodation, PriceQuote, PublicBookingResult } from '@hausanna/shared';
import {
  createTestApp,
  type MemoryEvents,
  type MemoryMail,
  resetDatabase,
  TEST_DB,
} from './support.js';

const ADMIN = { 'X-Requested-With': 'hausanna-admin' };

describe.skipIf(!TEST_DB)('Buchungsablauf mit echter Datenbank (e2e)', () => {
  let app: INestApplication;
  let events: MemoryEvents;
  let mail: MemoryMail;
  let cookie: string;
  let acc: Accommodation;

  beforeAll(async () => {
    await resetDatabase(TEST_DB!);
    ({ app, events, mail } = await createTestApp({ now: new Date('2026-10-24T10:00:00Z') }));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('Health: Postgres up, Mongo (hier simuliert) down', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.dependencies).toEqual({ postgres: 'up', mongodb: 'down' });
  });

  it('Admin-Bereich ist ohne Login gesperrt', async () => {
    await request(app.getHttpServer()).get('/api/admin/accommodations').expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.org', password: 'falsch' })
      .expect(401);
  });

  it('Login mit dem Start-Admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.org', password: 'test-passwort-123' })
      .expect(200);
    cookie = String(res.headers['set-cookie']).split(';')[0]!;
    expect(cookie).toContain('hausanna_session=');
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.role).toBe('admin');
  });

  it('Schreibender Admin-Request ohne CSRF-Header wird abgelehnt', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/seasons')
      .set('Cookie', cookie)
      .send({ name: 'X', startDate: '2026-01-01', endDate: '2026-01-02' })
      .expect(403);
  });

  it('Unterkunft, Saison und Saisonpreis anlegen', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/accommodations')
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({
        slug: 'ferienwohnung-2-haus-anna',
        name: 'Ferienwohnung 2',
        sizeSqm: 52,
        maxGuests: 4,
        basePricePerNight: 100,
        baseGuests: 2,
        extraGuestPricePerNight: 20,
        minNights: 3,
        status: 'published',
      })
      .expect(201);
    acc = res.body;
    const season = await request(app.getHttpServer())
      .post('/api/admin/seasons')
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({ name: 'Weihnachten', startDate: '2026-12-18', endDate: '2027-01-15' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/api/admin/accommodations/${acc.id}/season-prices`)
      .set('Cookie', cookie)
      .set(ADMIN)
      .send([
        {
          seasonId: season.body.id,
          pricePerNight: 120,
          baseGuests: 2,
          extraGuestPricePerNight: 20,
          minNights: 5,
        },
      ])
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/admin/accommodations')
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({
        slug: 'ferienwohnung-2-haus-anna',
        name: 'Doppelt',
        sizeSqm: 1,
        maxGuests: 1,
        basePricePerNight: 1,
        baseGuests: 1,
      })
      .expect(409);
  });

  it('Öffentliche Seite sieht die Unterkunft und bekommt einen Preis', async () => {
    const site = await request(app.getHttpServer()).get('/api/public/site').expect(200);
    expect(site.body.accommodations).toHaveLength(1);
    const q = await request(app.getHttpServer())
      .post('/api/public/quote')
      .send({ accommodationId: acc.id, arrival: '2026-11-02', departure: '2026-11-05', adults: 3 })
      .expect(200);
    expect((q.body as PriceQuote).total).toBe(360);
  });

  const guest = { firstName: 'Max', lastName: 'Muster', email: 'max@example.org', phone: '0151' };

  it('Gast bucht → bestätigt, Mails an Gast und Vermieterin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/public/bookings')
      .send({
        accommodationId: acc.id,
        arrival: '2026-11-02',
        departure: '2026-11-05',
        adults: 2,
        guest,
        acceptTerms: true,
      })
      .expect(201);
    const b = res.body as PublicBookingResult;
    expect(b.status).toBe('confirmed');
    expect(b.reference).toMatch(/^HA-26-/);
    expect(mail.sent.map((m) => m.to).sort()).toEqual([
      'info@hausanna-bodenmais.de',
      'max@example.org',
    ]);
    expect(events.items.some((e) => e.message.includes('Neue Buchung'))).toBe(true);
  });

  it('DOPPELBUCHUNG unmöglich: überschneidender Zeitraum → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/public/bookings')
      .send({
        accommodationId: acc.id,
        arrival: '2026-11-04',
        departure: '2026-11-08',
        adults: 2,
        guest,
        acceptTerms: true,
      })
      .expect(409);
    // auch über den Admin nicht möglich (Datenbank-Constraint)
    await request(app.getHttpServer())
      .post('/api/admin/bookings')
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({
        accommodationId: acc.id,
        arrival: '2026-11-01',
        departure: '2026-11-03',
        source: 'blocked',
      })
      .expect(409);
  });

  it('Anreise am Abreisetag ist erlaubt', async () => {
    await request(app.getHttpServer())
      .post('/api/public/bookings')
      .send({
        accommodationId: acc.id,
        arrival: '2026-11-05',
        departure: '2026-11-08',
        adults: 2,
        guest,
        acceptTerms: true,
      })
      .expect(201);
  });

  it('Gleichzeitige Buchungen: genau eine gewinnt', async () => {
    const send = () =>
      request(app.getHttpServer()).post('/api/public/bookings').send({
        accommodationId: acc.id,
        arrival: '2026-11-20',
        departure: '2026-11-25',
        adults: 2,
        guest,
        acceptTerms: true,
      });
    const results = await Promise.all([send(), send(), send(), send(), send()]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });

  it('Verfügbarkeit fasst Belegungen zusammen', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/public/accommodations/${acc.id}/availability`)
      .expect(200);
    expect(res.body.blocked).toEqual([
      { from: '2026-11-02', to: '2026-11-08' },
      { from: '2026-11-20', to: '2026-11-25' },
    ]);
  });

  it('Stornierte Buchung gibt den Zeitraum frei', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/admin/bookings?from=2026-11-20&to=2026-11-21')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/admin/bookings/${list.body[0].id}`)
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({ status: 'cancelled' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/public/bookings')
      .send({
        accommodationId: acc.id,
        arrival: '2026-11-21',
        departure: '2026-11-24',
        adults: 2,
        guest,
        acceptTerms: true,
      })
      .expect(201);
  });

  it('Kalender und Dashboard', async () => {
    const cal = await request(app.getHttpServer())
      .get('/api/admin/calendar?from=2026-11-01&to=2026-12-01')
      .set('Cookie', cookie)
      .expect(200);
    expect(cal.body.bookings).toHaveLength(3);
    const dash = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Cookie', cookie)
      .expect(200);
    expect(dash.body.stats.bookingsNext30Days).toBe(3);
  });

  it('iCal-Export für Booking.com enthält die Belegungen', async () => {
    const ch = await request(app.getHttpServer())
      .get('/api/admin/channels')
      .set('Cookie', cookie)
      .expect(200);
    const url = new URL(ch.body.connections[0].icalExportUrls.booking_com);
    const ics = await request(app.getHttpServer()).get(`${url.pathname}${url.search}`).expect(200);
    expect(ics.text).toContain('DTSTART;VALUE=DATE:20261102');
    expect(ics.text.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });

  it('Benutzerverwaltung: letzter Admin kann nicht entfernt werden', async () => {
    const users = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Cookie', cookie)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${users.body[0].id}`)
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({ role: 'editor' })
      .expect(409);
    const ed = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Cookie', cookie)
      .set(ADMIN)
      .send({
        email: 'redakteur@example.org',
        name: 'Red',
        role: 'editor',
        password: 'redakteur-123',
      })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'redakteur@example.org', password: 'redakteur-123' })
      .expect(200);
    const edCookie = String(login.headers['set-cookie']).split(';')[0]!;
    await request(app.getHttpServer()).get('/api/admin/users').set('Cookie', edCookie).expect(403);
    expect(ed.body.role).toBe('editor');
  });
});
