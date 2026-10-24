import { addDays, nightsBetween } from '@hausanna/shared';

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
export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function todayIso(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${MONTHS[m - 1]} ${y}`;
}

export interface DayCell {
  date: string;
  day: number;
  weekday: number;
  weekend: boolean;
}

/** Alle Tage eines Monats als Spalten des Belegungskalenders. */
export function monthDays(month: string): DayCell[] {
  const start = monthStart(month);
  const end = shiftMonth(start, 1);
  const days: DayCell[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) {
    const weekday = new Date(`${d}T00:00:00Z`).getUTCDay();
    days.push({
      date: d,
      day: Number(d.slice(8)),
      weekday,
      weekend: weekday === 0 || weekday === 6,
    });
  }
  return days;
}

export interface BarPosition {
  /** Spaltenindex (0-basiert) der ersten sichtbaren Nacht */
  startCol: number;
  /** Anzahl sichtbarer Nächte */
  span: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/**
 * Position eines Buchungsbalkens im Monatsraster.
 * Belegt sind die Nächte arrival … departure-1; liegt nichts im Monat → null.
 */
export function barPosition(
  arrival: string,
  departure: string,
  days: DayCell[],
): BarPosition | null {
  if (days.length === 0) return null;
  const first = days[0]!.date;
  const afterLast = addDays(days.at(-1)!.date, 1);
  if (departure <= first || arrival >= afterLast) return null;
  const from = arrival < first ? first : arrival;
  const to = departure > afterLast ? afterLast : departure;
  return {
    startCol: nightsBetween(first, from),
    span: nightsBetween(from, to),
    clippedStart: arrival < first,
    clippedEnd: departure > afterLast,
  };
}

/** Ist die Nacht `date` von einer der Buchungen belegt? */
export function isOccupied(
  date: string,
  bookings: { arrival: string; departure: string }[],
): boolean {
  return bookings.some((b) => b.arrival <= date && date < b.departure);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '–';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(iso));
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'noch nie';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tagen`;
}
