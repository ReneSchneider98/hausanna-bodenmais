/** Minimaler iCalendar-Parser/-Generator (RFC 5545) für Belegungs-Feeds. */

export interface IcsEvent {
  uid: string;
  /** erste Nacht, YYYY-MM-DD */
  start: string;
  /** Abreisetag (DTEND ist bei Ganztages-Events exklusiv), YYYY-MM-DD */
  end: string;
  summary: string;
  description: string;
  cancelled: boolean;
}

function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

function toDate(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT' && cur) {
      const start = toDate(cur.DTSTART ?? '');
      const end = toDate(cur.DTEND ?? '') ?? null;
      if (start) {
        events.push({
          uid: cur.UID ?? `${start}-${end}`,
          start,
          end: end && end > start ? end : nextDay(start),
          summary: unescape(cur.SUMMARY ?? ''),
          description: unescape(cur.DESCRIPTION ?? ''),
          cancelled: (cur.STATUS ?? '').toUpperCase() === 'CANCELLED',
        });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const name = line.slice(0, idx).split(';')[0]!.toUpperCase();
        cur[name] = line.slice(idx + 1);
      }
    }
  }
  return events;
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function escape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(
  calName: string,
  events: { uid: string; start: string; end: string; summary: string }[],
  now = new Date(),
): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Haus Anna Bodenmais//Buchungskalender//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calName)}`,
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${e.start.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${e.end.replace(/-/g, '')}`,
      `SUMMARY:${escape(e.summary)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Aus welchem Portal stammt ein iCal-Event? */
export function detectSource(
  uid: string,
  feedUrl: string,
): 'booking_com' | 'airbnb' | 'channel_other' {
  const s = `${uid} ${feedUrl}`.toLowerCase();
  if (s.includes('booking.com')) return 'booking_com';
  if (s.includes('airbnb')) return 'airbnb';
  return 'channel_other';
}
