import { useState } from 'react';
import { addDays, type Booking } from '@hausanna/shared';
import { type DayCell, formatDate } from '../lib/dates.ts';
import { guestName, SOURCE_LABEL } from '../lib/labels.ts';

const WEEK_HEADER = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** "Müller · Booking.com" – ohne Dopplung bei "Gast über Booking.com" */
function whoAndWhere(b: Booking): string {
  const name = guestName(b.guest, b.source);
  const source = SOURCE_LABEL[b.source];
  return name.includes(source) ? name : `${name} · ${source}`;
}

interface Props {
  accommodations: { id: string; name: string }[];
  bookings: Booking[];
  days: DayCell[];
  today: string;
  onSelect: (b: Booking) => void;
  onCreate: (accommodationId: string, arrival: string) => void;
}

/**
 * Handy-Kalender: eine Unterkunft wählen, ganzer Monat als Wandkalender (Mo–So),
 * darunter die Buchungen des Monats. Tippen auf einen freien Tag legt eine Buchung an,
 * auf einen belegten Tag öffnet die Buchung.
 */
export function MobileMonthCalendar({
  accommodations,
  bookings,
  days,
  today,
  onSelect,
  onCreate,
}: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const accId = accommodations.some((a) => a.id === chosen) ? chosen! : accommodations[0]!.id;
  const own = bookings
    .filter((b) => b.accommodationId === accId)
    .sort((a, b) => a.arrival.localeCompare(b.arrival));
  // Montag = erste Spalte
  const offset = (days[0]!.weekday + 6) % 7;
  const bookingOn = (date: string) => own.find((b) => b.arrival <= date && date < b.departure);

  return (
    <div className="mcal">
      <div className="mcal-tabs" role="tablist" aria-label="Unterkunft">
        {accommodations.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === accId}
            className={`mcal-tab ${a.id === accId ? 'active' : ''}`}
            onClick={() => setChosen(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="mcal-grid" role="grid">
        {WEEK_HEADER.map((w) => (
          <div key={w} className="mcal-wd">
            {w}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((d) => {
          const b = bookingOn(d.date);
          // Abrunden bei Anreise/letzter Nacht und an Zeilen- bzw. Monatsgrenzen
          const col = (d.weekday + 6) % 7;
          const starts = b && (b.arrival === d.date || d.date === days[0]!.date || col === 0);
          const ends =
            b && (addDays(d.date, 1) === b.departure || d.date === days.at(-1)!.date || col === 6);
          return (
            <button
              key={d.date}
              type="button"
              className={[
                'mcal-day',
                b ? `busy src-${b.source}` : '',
                b?.status === 'pending' ? 'pending' : '',
                starts ? 'starts' : '',
                ends ? 'ends' : '',
                d.date === today ? 'today' : '',
                d.date < today ? 'past' : '',
              ].join(' ')}
              aria-label={`${formatDate(d.date)} ${b ? `belegt: ${guestName(b.guest, b.source)}` : 'frei'}`}
              onClick={() => (b ? onSelect(b) : onCreate(accId, d.date))}
            >
              {d.day}
            </button>
          );
        })}
      </div>

      <div className="mcal-list">
        {own.length === 0 ? (
          <p className="muted small">Keine Buchungen in diesem Monat.</p>
        ) : (
          own.map((b) => (
            <button key={b.id} type="button" className="mcal-item" onClick={() => onSelect(b)}>
              <span className={`mcal-dot src-${b.source}`} aria-hidden />
              <span className="mcal-item-text">
                <strong>
                  {formatDate(b.arrival).slice(0, 6)} – {formatDate(b.departure).slice(0, 6)}
                </strong>
                <span className="muted small">{whoAndWhere(b)}</span>
              </span>
              <span aria-hidden className="muted">
                ›
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
