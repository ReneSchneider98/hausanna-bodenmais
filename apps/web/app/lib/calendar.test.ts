import { describe, expect, it } from 'vitest';
import { addMonths, dayState, isStayFree, monthGrid, monthLabel } from './calendar';
import { plural, truncateWords } from './format';

const ranges = [
  { from: '2026-11-02', to: '2026-11-05' },
  { from: '2026-11-05', to: '2026-11-08' },
];

describe('calendar', () => {
  it('erkennt An-, Abreise- und Wechseltage', () => {
    expect(dayState('2026-11-01', ranges, '2026-10-24')).toBe('free');
    expect(dayState('2026-11-02', ranges, '2026-10-24')).toBe('arrival');
    expect(dayState('2026-11-03', ranges, '2026-10-24')).toBe('booked');
    expect(dayState('2026-11-05', ranges, '2026-10-24')).toBe('booked');
    expect(dayState('2026-11-08', ranges, '2026-10-24')).toBe('departure');
    expect(dayState('2026-10-01', ranges, '2026-10-24')).toBe('past');
  });

  it('baut ein Monatsraster ab Montag', () => {
    const grid = monthGrid('2026-11-01', [], '2026-10-24');
    // 1. November 2026 ist ein Sonntag → 6 Leerfelder
    expect(grid[0]!.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid[0]![6]!.day).toBe(1);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });

  it('rechnet Monate und Beschriftungen', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(monthLabel('2027-03-01')).toBe('März 2027');
  });

  it('prüft freie Aufenthalte (Abreisetag = neue Anreise ok)', () => {
    expect(isStayFree('2026-11-08', '2026-11-10', ranges)).toBe(true);
    expect(isStayFree('2026-10-30', '2026-11-03', ranges)).toBe(false);
  });
});

describe('format', () => {
  it('Mehrzahl und Kürzen', () => {
    expect(plural(1, 'Nacht', 'Nächte')).toBe('1 Nacht');
    expect(plural(3, 'Nacht', 'Nächte')).toBe('3 Nächte');
    expect(truncateWords('Das ist ein ziemlich langer Satz für den Test', 20)).toBe(
      'Das ist ein ziemlich …',
    );
  });
});
