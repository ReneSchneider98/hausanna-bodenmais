import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  addDays,
  type Accommodation,
  type Extra,
  formatDateDe,
  formatEuro,
  type PriceQuote,
  type PublicBookingResult,
} from '@hausanna/shared';
import { isStayFree, type Range } from '../lib/calendar';
import { CheckIcon } from './Icons';

interface GuestForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  note: string;
  acceptTerms: boolean;
  website: string;
}

const EMPTY_GUEST: GuestForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  zip: '',
  city: '',
  note: '',
  acceptTerms: false,
  website: '',
};

type Errors = Partial<Record<keyof GuestForm, string>>;

export function validateGuest(g: GuestForm): Errors {
  const e: Errors = {};
  if (!g.firstName.trim()) e.firstName = 'Bitte Vornamen angeben.';
  if (!g.lastName.trim()) e.lastName = 'Bitte Nachnamen angeben.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email.trim()))
    e.email = 'Bitte eine gültige E-Mail-Adresse angeben.';
  if (!g.phone.trim()) e.phone = 'Bitte Telefonnummer angeben (für Rückfragen).';
  if (!g.acceptTerms) e.acceptTerms = 'Bitte AGB und Datenschutzerklärung akzeptieren.';
  return e;
}

function apiMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string') return m;
  }
  return fallback;
}

/** Hunde-Pauschalen als Auswahlfeld, übrige Zusatzleistungen als Checkbox. */
function splitExtras(extras: Extra[]) {
  const dogs = extras.filter((e) => /hund/i.test(e.name)).sort((a, b) => a.price - b.price);
  return { dogs, others: extras.filter((e) => !dogs.includes(e)) };
}

export function BookingWidget({
  acc,
  extras,
  ranges,
  today,
  arrival,
  departure,
  setArrival,
  setDeparture,
  onBooked,
}: {
  acc: Accommodation;
  extras: Extra[];
  ranges: Range[];
  today: string;
  arrival: string;
  departure: string;
  setArrival: (d: string) => void;
  setDeparture: (d: string) => void;
  onBooked: () => void;
}) {
  const [adults, setAdults] = useState(Math.min(2, acc.maxGuests));
  const [children, setChildren] = useState(0);
  const { dogs, others } = useMemo(
    () => splitExtras(acc.petsAllowed ? extras : extras.filter((e) => !/hund/i.test(e.name))),
    [acc.petsAllowed, extras],
  );
  const [dogExtra, setDogExtra] = useState('');
  const [otherExtras, setOtherExtras] = useState<string[]>([]);
  const [quoteState, setQuoteState] = useState<{
    key: string;
    quote: PriceQuote | null;
    error: string | null;
    loading: boolean;
  }>({ key: '', quote: null, error: null, loading: false });
  const [step, setStep] = useState<'dates' | 'guest' | 'done'>('dates');
  const [guest, setGuest] = useState<GuestForm>(EMPTY_GUEST);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PublicBookingResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const guestRef = useRef<HTMLFieldSetElement>(null);

  const selectedExtras = useMemo(
    () => [
      ...(dogExtra ? [{ extraId: dogExtra, quantity: 1 }] : []),
      ...otherExtras.map((id) => ({ extraId: id, quantity: 1 })),
    ],
    [dogExtra, otherExtras],
  );
  const datesValid = Boolean(arrival && departure && departure > arrival);
  const localConflict = datesValid && !isStayFree(arrival, departure, ranges);
  const guests = adults + children;
  const quoteKey = JSON.stringify([acc.id, arrival, departure, adults, children, selectedExtras]);
  const wantQuote = datesValid && !localConflict;
  const current = wantQuote && quoteState.key === quoteKey ? quoteState : null;
  const quote = current?.quote ?? null;
  const quoteError = current?.error ?? null;
  const quoteLoading = wantQuote && (!current || current.loading);

  useEffect(() => {
    if (!wantQuote) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setQuoteState({ key: quoteKey, quote: null, error: null, loading: true });
      fetch('/api/public/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accommodationId: acc.id,
          arrival,
          departure,
          adults,
          children,
          extras: selectedExtras,
        }),
        signal: ctrl.signal,
      })
        .then(async (res) => {
          const body: unknown = await res.json().catch(() => null);
          if (!res.ok) throw new Error(apiMessage(body, 'Preis konnte nicht berechnet werden.'));
          setQuoteState({ key: quoteKey, quote: body as PriceQuote, error: null, loading: false });
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== 'AbortError') {
            setQuoteState({
              key: quoteKey,
              quote: null,
              error: (e as Error).message,
              loading: false,
            });
          }
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [acc.id, arrival, departure, adults, children, selectedExtras, wantQuote, quoteKey]);

  useEffect(() => {
    if (step === 'done') resultRef.current?.focus();
    if (step === 'guest') guestRef.current?.querySelector('input')?.focus();
  }, [step]);

  const set = <K extends keyof GuestForm>(k: K, v: GuestForm[K]) => {
    setGuest((g) => ({ ...g, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'dates') {
      if (quote?.available) setStep('guest');
      return;
    }
    const errs = validateGuest(guest);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accommodationId: acc.id,
          arrival,
          departure,
          adults,
          children,
          extras: selectedExtras,
          guest: {
            firstName: guest.firstName.trim(),
            lastName: guest.lastName.trim(),
            email: guest.email.trim(),
            phone: guest.phone.trim(),
            street: guest.street.trim(),
            zip: guest.zip.trim(),
            city: guest.city.trim(),
            country: 'DE',
          },
          note: guest.note,
          acceptTerms: true,
          website: guest.website,
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (res.status === 409) {
        setSubmitError(
          apiMessage(body, 'Der Zeitraum ist leider bereits belegt.') +
            ' Bitte wählen Sie andere Daten.',
        );
        setStep('dates');
        onBooked();
        return;
      }
      if (!res.ok) {
        setSubmitError(
          apiMessage(
            body,
            'Die Buchung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.',
          ),
        );
        return;
      }
      setResult(body as PublicBookingResult);
      setStep('done');
      onBooked();
    } catch {
      setSubmitError(
        'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done' && result) {
    return (
      <div className="box box--form booking-success" ref={resultRef} tabIndex={-1} role="status">
        <CheckIcon className="booking-success__icon" />
        <h3 className="box__title">Vielen Dank für Ihre Buchung!</h3>
        <p>
          Ihre Buchung ist <strong>bestätigt</strong>. Buchungsnummer:{' '}
          <strong className="booking-success__ref">{result.reference}</strong>
        </p>
        <p>
          {result.accommodationName}, {formatDateDe(result.arrival)} –{' '}
          {formatDateDe(result.departure)}
          <br />
          Gesamtpreis: <strong>{formatEuro(result.total)}</strong>
        </p>
        <p>Eine Bestätigung mit allen Details haben wir Ihnen per E-Mail geschickt.</p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setResult(null);
            setGuest(EMPTY_GUEST);
            setArrival('');
            setDeparture('');
            setStep('dates');
          }}
        >
          Weitere Buchung
        </button>
      </div>
    );
  }

  const maxDeparture = arrival ? addDays(arrival, 60) : undefined;
  const fieldError = (k: keyof GuestForm) =>
    errors[k] ? (
      <span className="form__error" id={`err-${k}`}>
        {errors[k]}
      </span>
    ) : null;
  const guestInput = (
    k: 'firstName' | 'lastName' | 'email' | 'phone' | 'street' | 'zip' | 'city',
    label: string,
    opts: { required?: boolean; type?: string; autoComplete?: string } = {},
  ) => (
    <p className={`form__field form__field--${k}`}>
      <label htmlFor={`g-${k}`}>
        {label}
        {opts.required && <abbr title="Pflichtfeld"> *</abbr>}
      </label>
      <input
        id={`g-${k}`}
        type={opts.type ?? 'text'}
        value={guest[k]}
        autoComplete={opts.autoComplete}
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `err-${k}` : undefined}
        onChange={(e) => set(k, e.target.value)}
      />
      {fieldError(k)}
    </p>
  );

  return (
    <form
      className="box box--form booking"
      onSubmit={submit}
      noValidate
      aria-labelledby="booking-title"
    >
      <h3 id="booking-title" className="visually-hidden">
        {acc.name} buchen
      </h3>
      <fieldset className="booking__dates" disabled={step === 'guest'}>
        <legend className="visually-hidden">Reisedaten</legend>
        <p className="form__field">
          <label htmlFor="b-arrival">
            Anreisedatum<abbr title="Pflichtfeld"> *</abbr>
          </label>
          <input
            id="b-arrival"
            type="date"
            value={arrival}
            min={today}
            onChange={(e) => {
              setArrival(e.target.value);
              if (departure && e.target.value >= departure) setDeparture('');
            }}
            required
          />
        </p>
        <p className="form__field">
          <label htmlFor="b-departure">
            Abreisedatum<abbr title="Pflichtfeld"> *</abbr>
          </label>
          <input
            id="b-departure"
            type="date"
            value={departure}
            min={arrival ? addDays(arrival, 1) : addDays(today, 1)}
            max={maxDeparture}
            onChange={(e) => setDeparture(e.target.value)}
            required
          />
        </p>
        <p className="form__field form__field--half">
          <label htmlFor="b-adults">Erwachsene</label>
          <select id="b-adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
            {Array.from({ length: acc.maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </p>
        <p className="form__field form__field--half">
          <label htmlFor="b-children">Kinder</label>
          <select
            id="b-children"
            value={children}
            onChange={(e) => setChildren(Number(e.target.value))}
          >
            {Array.from({ length: acc.maxGuests }, (_, i) => i).map((n) => (
              <option key={n} value={n} disabled={adults + n > acc.maxGuests}>
                {n}
              </option>
            ))}
          </select>
        </p>
        {dogs.length > 0 && (
          <p className="form__field">
            <label htmlFor="b-dog">Hund</label>
            <select id="b-dog" value={dogExtra} onChange={(e) => setDogExtra(e.target.value)}>
              <option value="">kein Hund</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({formatEuro(d.price)})
                </option>
              ))}
            </select>
          </p>
        )}
        {others.map((x) => (
          <p key={x.id} className="form__check">
            <label>
              <input
                type="checkbox"
                checked={otherExtras.includes(x.id)}
                onChange={(e) =>
                  setOtherExtras((o) =>
                    e.target.checked ? [...o, x.id] : o.filter((id) => id !== x.id),
                  )
                }
              />{' '}
              {x.name} ({formatEuro(x.price)}
              {x.chargeType === 'per_night' ? ' pro Nacht' : ''})
            </label>
          </p>
        ))}
      </fieldset>

      <div className="booking__quote" aria-live="polite">
        {!datesValid && (
          <p className="booking__hint">
            Bitte An- und Abreisedatum wählen – gern auch direkt im Kalender.
          </p>
        )}
        {guests > acc.maxGuests && (
          <p className="form__error">Höchstens {acc.maxGuests} Personen.</p>
        )}
        {localConflict && (
          <p className="booking__unavailable">Der gewählte Zeitraum ist leider bereits belegt.</p>
        )}
        {quoteLoading && <p className="booking__hint">Preis wird berechnet …</p>}
        {quoteError && <p className="booking__unavailable">{quoteError}</p>}
        {quote && !quote.available && <p className="booking__unavailable">{quote.reason}</p>}
        {quote?.available && (
          <div className="price-lines">
            <p className="price-lines__nights">
              {quote.nights} {quote.nights === 1 ? 'Nacht' : 'Nächte'}, {formatDateDe(arrival)} –{' '}
              {formatDateDe(departure)}
            </p>
            <table>
              <tbody>
                {quote.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.label}</td>
                    <td>{formatEuro(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Gesamtpreis</th>
                  <td>{formatEuro(quote.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {submitError && (
        <p className="booking__unavailable" role="alert">
          {submitError}
        </p>
      )}

      {step === 'dates' && (
        <button type="submit" className="btn" disabled={!quote?.available}>
          Weiter zur Buchung
        </button>
      )}

      {step === 'guest' && (
        <fieldset className="booking__guest" ref={guestRef}>
          <legend>Ihre Kontaktdaten</legend>
          <div className="form__grid">
            {guestInput('firstName', 'Vorname', { required: true, autoComplete: 'given-name' })}
            {guestInput('lastName', 'Nachname', { required: true, autoComplete: 'family-name' })}
            {guestInput('email', 'E-Mail', {
              required: true,
              type: 'email',
              autoComplete: 'email',
            })}
            {guestInput('phone', 'Telefon', { required: true, type: 'tel', autoComplete: 'tel' })}
            {guestInput('street', 'Straße und Hausnummer', { autoComplete: 'street-address' })}
            {guestInput('zip', 'PLZ', { autoComplete: 'postal-code' })}
            {guestInput('city', 'Ort', { autoComplete: 'address-level2' })}
          </div>
          <p className="form__field">
            <label htmlFor="g-note">Nachricht (optional)</label>
            <textarea
              id="g-note"
              rows={3}
              value={guest.note}
              onChange={(e) => set('note', e.target.value)}
              maxLength={2000}
            />
          </p>
          <p className="booking__honeypot" aria-hidden="true">
            <label htmlFor="g-website">Webseite</label>
            <input
              id="g-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={guest.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </p>
          <p className="form__check">
            <label>
              <input
                type="checkbox"
                checked={guest.acceptTerms}
                aria-invalid={Boolean(errors.acceptTerms)}
                aria-describedby={errors.acceptTerms ? 'err-acceptTerms' : undefined}
                onChange={(e) => set('acceptTerms', e.target.checked)}
              />{' '}
              Ich akzeptiere die{' '}
              <Link to="/agb/" target="_blank">
                AGB
              </Link>{' '}
              und habe die{' '}
              <Link to="/datenschutz/" target="_blank">
                Datenschutzerklärung
              </Link>{' '}
              gelesen.<abbr title="Pflichtfeld"> *</abbr>
            </label>
            {fieldError('acceptTerms')}
          </p>
          <div className="booking__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('dates')}>
              Zurück
            </button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting
                ? 'Wird gebucht …'
                : `Verbindlich buchen${quote?.available ? ` (${formatEuro(quote.total)})` : ''}`}
            </button>
          </div>
        </fieldset>
      )}
    </form>
  );
}
