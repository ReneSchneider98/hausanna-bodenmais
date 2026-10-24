/** Hilfsfunktionen für Kalenderdaten (immer UTC, keine Zeitzonen-Fallen). */

export function parseIsoDate(date: string): Date {
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
    throw new Error(`Ungültiges Datum: ${date}`);
  }
  return d;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function nightsBetween(arrival: string, departure: string): number {
  return Math.round(
    (parseIsoDate(departure).getTime() - parseIsoDate(arrival).getTime()) / 86_400_000,
  );
}

/** Alle Nächte (Datum der Nacht) eines Aufenthalts: arrival … departure-1 */
export function eachNight(arrival: string, departure: string): string[] {
  const nights: string[] = [];
  for (let d = arrival; d < departure; d = addDays(d, 1)) nights.push(d);
  return nights;
}

/** Überschneiden sich zwei halboffene Zeiträume [a1,a2) und [b1,b2)? */
export function rangesOverlap(a1: string, a2: string, b1: string, b2: string): boolean {
  return a1 < b2 && b1 < a2;
}

export function formatDateDe(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
}
