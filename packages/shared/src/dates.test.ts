import { describe, expect, it } from 'vitest';
import { addDays, eachNight, nightsBetween, parseIsoDate, rangesOverlap } from './dates.js';

describe('dates', () => {
  it('rechnet Nächte über Monats- und Jahreswechsel', () => {
    expect(nightsBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(eachNight('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('erkennt ungültige Daten', () => {
    expect(() => parseIsoDate('2026-02-30')).toThrow('Ungültiges Datum');
  });

  it('Abreisetag = Anreisetag ist keine Überschneidung', () => {
    expect(rangesOverlap('2026-01-01', '2026-01-05', '2026-01-05', '2026-01-08')).toBe(false);
    expect(rangesOverlap('2026-01-01', '2026-01-05', '2026-01-04', '2026-01-08')).toBe(true);
  });
});
