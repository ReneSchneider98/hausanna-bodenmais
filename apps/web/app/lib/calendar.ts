import { addDays, parseIsoDate, toIsoDate } from '@hausanna/shared';

export type DayState = 'past' | 'free' | 'booked' | 'arrival' | 'departure' | 'turnover';

export interface CalendarDay {
  date: string;
  day: number;
  state: DayState;
}

export interface Range {
  from: string;
  to: string;
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const MONTHS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** Erster Tag des Monats von `date` (YYYY-MM-01). */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(month: string, n: number): string {
  const d = parseIsoDate(monthStart(month));
  d.setUTCMonth(d.getUTCMonth() + n);
  return toIsoDate(d);
}

export function monthLabel(month: string): string {
  const d = parseIsoDate(monthStart(month));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Belegungsstatus eines Tages.
 * Ein Bereich {from,to} belegt die Nächte from … to-1. "arrival" = Anreisetag einer Belegung
 * (Nacht davor frei), "departure" = Abreisetag (Nacht frei), "turnover" = Wechseltag.
 */
export function dayState(date: string, ranges: Range[], today: string): DayState {
  if (date < today) return 'past';
  const nightBooked = ranges.some((r) => r.from <= date && date < r.to);
  const prevBooked = ranges.some((r) => r.from <= addDays(date, -1) && addDays(date, -1) < r.to);
  if (nightBooked && prevBooked) return 'booked';
  if (nightBooked) return 'arrival';
  if (prevBooked) return 'departure';
  return 'free';
}

/** Raster eines Monats (Mo–So) mit Leerfeldern (null) vorne/hinten. */
export function monthGrid(month: string, ranges: Range[], today: string): (CalendarDay | null)[][] {
  const first = parseIsoDate(monthStart(month));
  const offset = (first.getUTCDay() + 6) % 7; // Montag = 0
  const cells: (CalendarDay | null)[] = Array.from({ length: offset }, () => null);
  const m = first.getUTCMonth();
  for (let d = new Date(first); d.getUTCMonth() === m; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = toIsoDate(d);
    cells.push({ date, day: d.getUTCDate(), state: dayState(date, ranges, today) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Ist der Aufenthalt [arrival, departure) frei? */
export function isStayFree(arrival: string, departure: string, ranges: Range[]): boolean {
  return !ranges.some((r) => arrival < r.to && r.from < departure);
}

/** Heutiges Datum in Deutschland (YYYY-MM-DD). */
export function todayBerlin(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now);
}
