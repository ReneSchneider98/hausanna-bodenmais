import { buildIcs, detectSource, parseIcs } from './ical.js';

const SAMPLE = [
  'BEGIN:VCALENDAR',
  'PRODID:-//admin.booking.com, b.v.//NONSGML v1.0//EN',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261102',
  'DTEND;VALUE=DATE:20261115',
  'UID:40d47c1ffd5c0aa8abc832cb16b4a50e@booking.com',
  'SUMMARY:CLOSED - Not available',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261201',
  'UID:einzel',
  'SUMMARY:Lang',
  ' er Titel',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('iCal', () => {
  it('liest Ganztages-Events, gefaltete Zeilen und fehlendes DTEND', () => {
    const events = parseIcs(SAMPLE);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ start: '2026-11-02', end: '2026-11-15', cancelled: false });
    expect(events[1]).toMatchObject({
      start: '2026-12-01',
      end: '2026-12-02',
      summary: 'Langer Titel',
    });
  });

  it('erzeugt einen Feed, den der Parser wieder liest', () => {
    const ics = buildIcs('FeWo 2', [
      { uid: 'a@hausanna', start: '2026-11-02', end: '2026-11-05', summary: 'Belegt' },
    ]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261102');
    expect(parseIcs(ics)[0]).toMatchObject({
      uid: 'a@hausanna',
      start: '2026-11-02',
      end: '2026-11-05',
    });
  });

  it('erkennt das Portal', () => {
    expect(detectSource('x@booking.com', '')).toBe('booking_com');
    expect(detectSource('abc', 'https://www.airbnb.de/calendar/ical/1.ics')).toBe('airbnb');
  });
});
