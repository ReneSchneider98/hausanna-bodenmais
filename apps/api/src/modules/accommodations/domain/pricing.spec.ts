import { calculateQuote, type PricingInput } from './pricing.js';

const base: PricingInput = {
  accommodation: {
    name: 'Ferienwohnung 2',
    maxGuests: 4,
    basePricePerNight: 100,
    baseGuests: 2,
    extraGuestPricePerNight: 20,
    minNights: 3,
  },
  seasons: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Weihnachten',
      startDate: '2026-12-18',
      endDate: '2027-01-15',
    },
  ],
  seasonPrices: [
    {
      seasonId: '00000000-0000-4000-8000-000000000001',
      pricePerNight: 120,
      baseGuests: 2,
      extraGuestPricePerNight: 25,
      minNights: 5,
    },
  ],
  extras: [
    {
      id: '00000000-0000-4000-8000-0000000000e1',
      name: 'Hund',
      description: '',
      price: 20,
      chargeType: 'per_stay',
      active: true,
    },
  ],
  arrival: '2026-11-02',
  departure: '2026-11-05',
  adults: 2,
  children: 0,
  selectedExtras: [],
  today: '2026-10-24',
};

describe('calculateQuote', () => {
  it('berechnet den Grundpreis', () => {
    const q = calculateQuote(base);
    expect(q.available).toBe(true);
    expect(q.nights).toBe(3);
    expect(q.total).toBe(300);
  });

  it('berechnet Aufpreis für weitere Personen und Zusatzleistungen', () => {
    const q = calculateQuote({
      ...base,
      adults: 3,
      children: 1,
      selectedExtras: [{ extraId: '00000000-0000-4000-8000-0000000000e1', quantity: 2 }],
    });
    // 3 Nächte × (100 + 2 × 20) + 2 × 20 Hund
    expect(q.total).toBe(3 * 140 + 40);
  });

  it('wechselt den Preis an der Saisongrenze und nutzt den Mindestaufenthalt der Anreise', () => {
    const q = calculateQuote({ ...base, arrival: '2026-12-15', departure: '2026-12-20' });
    expect(q.lines).toHaveLength(2);
    expect(q.total).toBe(3 * 100 + 2 * 120);
    const xmas = calculateQuote({ ...base, arrival: '2026-12-20', departure: '2026-12-23' });
    expect(xmas.available).toBe(false);
    expect(xmas.reason).toContain('Mindestaufenthalt: 5');
  });

  it('begrenzt Aufenthaltsdauer und Vorlauf (Schutz vor Missbrauch)', () => {
    expect(calculateQuote({ ...base, departure: '9999-12-31' }).available).toBe(false);
    expect(
      calculateQuote({ ...base, arrival: '2030-01-01', departure: '2030-01-05' }).reason,
    ).toContain('Voraus');
  });

  it('lehnt zu viele Gäste, Vergangenheit und zu kurze Aufenthalte ab', () => {
    expect(calculateQuote({ ...base, adults: 5 }).available).toBe(false);
    expect(
      calculateQuote({ ...base, arrival: '2026-10-01', departure: '2026-10-05' }).available,
    ).toBe(false);
    expect(calculateQuote({ ...base, departure: '2026-11-04' }).reason).toContain(
      'Mindestaufenthalt',
    );
    expect(calculateQuote({ ...base, departure: '2026-11-02' }).available).toBe(false);
  });
});
