import {
  eachNight,
  type Extra,
  formatDateDe,
  nightsBetween,
  type PriceQuote,
  type Season,
  type SeasonPrice,
  type SelectedExtra,
} from '@hausanna/shared';

export interface PricingAccommodation {
  name: string;
  maxGuests: number;
  basePricePerNight: number;
  baseGuests: number;
  extraGuestPricePerNight: number;
  minNights: number;
}

export interface PricingInput {
  accommodation: PricingAccommodation;
  seasons: Season[];
  seasonPrices: SeasonPrice[];
  extras: Extra[];
  arrival: string;
  departure: string;
  adults: number;
  children: number;
  selectedExtras: SelectedExtra[];
  /** heutiges Datum (für Tests injizierbar) */
  today: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Schutz vor Missbrauch: max. Aufenthalt und max. Vorlauf für Buchungen */
export const MAX_NIGHTS = 60;
export const MAX_ADVANCE_DAYS = 730;

/**
 * Reine Preisberechnung (ohne Datenbank).
 * Pro Nacht gilt der Saisonpreis der Saison, in der die Nacht liegt, sonst der Grundpreis.
 * Mindestaufenthalt: Saison der Anreisenacht, sonst Unterkunft.
 */
export function calculateQuote(input: PricingInput): PriceQuote {
  const { accommodation: acc, arrival, departure } = input;
  const guests = input.adults + input.children;
  const nights = arrival < departure ? nightsBetween(arrival, departure) : 0;
  if (
    nights > MAX_NIGHTS ||
    (arrival >= input.today && nightsBetween(input.today, arrival) > MAX_ADVANCE_DAYS)
  ) {
    return {
      available: false,
      reason:
        nights > MAX_NIGHTS
          ? `Online sind höchstens ${MAX_NIGHTS} Nächte buchbar – bitte fragen Sie uns direkt.`
          : 'So weit im Voraus ist noch keine Buchung möglich.',
      nights,
      minNights: acc.minNights,
      lines: [],
      total: 0,
    };
  }

  const seasonFor = (night: string) =>
    input.seasons.find((s) => s.startDate <= night && night <= s.endDate);
  const priceFor = (night: string) => {
    const season = seasonFor(night);
    const sp = season && input.seasonPrices.find((p) => p.seasonId === season.id);
    return sp
      ? {
          season,
          perNight: sp.pricePerNight,
          base: sp.baseGuests,
          extra: sp.extraGuestPricePerNight,
          min: sp.minNights,
        }
      : {
          season: undefined,
          perNight: acc.basePricePerNight,
          base: acc.baseGuests,
          extra: acc.extraGuestPricePerNight,
          min: null,
        };
  };

  const minNights = nights > 0 ? (priceFor(arrival).min ?? acc.minNights) : acc.minNights;
  const fail = (reason: string): PriceQuote => ({
    available: false,
    reason,
    nights,
    minNights,
    lines: [],
    total: 0,
  });

  if (nights <= 0) return fail('Die Abreise muss nach der Anreise liegen.');
  if (arrival < input.today) return fail('Die Anreise liegt in der Vergangenheit.');
  if (guests > acc.maxGuests)
    return fail(`${acc.name} ist für höchstens ${acc.maxGuests} Personen.`);
  if (nights < minNights) return fail(`Mindestaufenthalt: ${minNights} Nächte.`);

  // Nächte mit gleichem Preis zu Zeilen zusammenfassen
  const lines: { label: string; amount: number }[] = [];
  let group: { from: string; count: number; perNight: number; name: string } | null = null;
  const flush = () => {
    if (!group) return;
    lines.push({
      label: `${group.count} ${group.count === 1 ? 'Nacht' : 'Nächte'} ab ${formatDateDe(group.from)}${group.name ? ` (${group.name})` : ''} à ${group.perNight.toFixed(2).replace('.', ',')} €`,
      amount: round2(group.count * group.perNight),
    });
  };
  for (const night of eachNight(arrival, departure)) {
    const p = priceFor(night);
    const perNight = round2(p.perNight + Math.max(0, guests - p.base) * p.extra);
    const name = p.season?.name ?? '';
    if (group && group.perNight === perNight && group.name === name) group.count++;
    else {
      flush();
      group = { from: night, count: 1, perNight, name };
    }
  }
  flush();

  for (const sel of input.selectedExtras) {
    const extra = input.extras.find((e) => e.id === sel.extraId && e.active);
    if (!extra) return fail('Eine gewählte Zusatzleistung ist nicht verfügbar.');
    const amount = round2(
      extra.price * sel.quantity * (extra.chargeType === 'per_night' ? nights : 1),
    );
    lines.push({ label: `${sel.quantity} × ${extra.name}`, amount });
  }

  return {
    available: true,
    reason: null,
    nights,
    minNights,
    lines,
    total: round2(lines.reduce((sum, l) => sum + l.amount, 0)),
  };
}
