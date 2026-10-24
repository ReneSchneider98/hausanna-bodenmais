import { describe, expect, it } from 'vitest';
import { barPosition, isOccupied, monthDays, shiftMonth } from './dates.ts';

describe('Kalender-Raster', () => {
  it('liefert alle Tage eines Monats (auch Schaltjahr)', () => {
    expect(monthDays('2028-02-01')).toHaveLength(29);
    const nov = monthDays('2026-11-01');
    expect(nov).toHaveLength(30);
    expect(nov[0]).toMatchObject({ date: '2026-11-01', weekday: 0, weekend: true });
  });

  it('wechselt Monate über Jahresgrenzen', () => {
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01');
  });

  it('positioniert Balken inkl. Abschneiden am Monatsrand', () => {
    const days = monthDays('2026-11-01');
    expect(barPosition('2026-11-02', '2026-11-05', days)).toEqual({
      startCol: 1,
      span: 3,
      clippedStart: false,
      clippedEnd: false,
    });
    expect(barPosition('2026-10-28', '2026-11-03', days)).toEqual({
      startCol: 0,
      span: 2,
      clippedStart: true,
      clippedEnd: false,
    });
    expect(barPosition('2026-11-29', '2026-12-04', days)).toEqual({
      startCol: 28,
      span: 2,
      clippedStart: false,
      clippedEnd: true,
    });
    expect(barPosition('2026-10-01', '2026-11-01', days)).toBeNull();
  });

  it('Abreisetag ist frei', () => {
    const b = [{ arrival: '2026-11-02', departure: '2026-11-05' }];
    expect(isOccupied('2026-11-04', b)).toBe(true);
    expect(isOccupied('2026-11-05', b)).toBe(false);
  });
});
