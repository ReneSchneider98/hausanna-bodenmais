import { useMemo, useState } from 'react';
import {
  addMonths,
  monthGrid,
  monthLabel,
  monthStart,
  type Range,
  WEEKDAYS,
} from '../lib/calendar';
import { ChevronLeft, ChevronRight } from './Icons';

const STATE_LABEL = {
  past: 'vergangen',
  free: 'frei',
  booked: 'belegt',
  arrival: 'frei bis Anreise (ab Nachmittag belegt)',
  departure: 'Abreisetag – ab Nachmittag frei',
  turnover: 'Wechseltag',
} as const;

/**
 * Belegungskalender: 2 Monate nebeneinander (mobil untereinander), blätterbar.
 * Ein Klick auf einen freien Tag übernimmt ihn als An- bzw. Abreise.
 */
export function AvailabilityCalendar({
  ranges,
  today,
  arrival,
  departure,
  onPick,
  months = 2,
}: {
  ranges: Range[];
  today: string;
  arrival?: string;
  departure?: string;
  onPick?: (date: string) => void;
  months?: number;
}) {
  const [start, setStart] = useState(() => monthStart(today));
  const shown = useMemo(
    () => Array.from({ length: months }, (_, i) => addMonths(start, i)),
    [start, months],
  );
  const minStart = monthStart(today);
  const maxStart = addMonths(minStart, 18);

  return (
    <div className="calendar" aria-label="Belegungskalender">
      <div className="calendar__bar">
        <button
          type="button"
          onClick={() => setStart(addMonths(start, -1))}
          disabled={start <= minStart}
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft size={16} /> zurück
        </button>
        <button type="button" onClick={() => setStart(minStart)} className="calendar__today">
          heute
        </button>
        <button
          type="button"
          onClick={() => setStart(addMonths(start, 1))}
          disabled={start >= maxStart}
          aria-label="Nächster Monat"
        >
          vor <ChevronRight size={16} />
        </button>
      </div>
      <div className="calendar__months">
        {shown.map((m) => (
          <table key={m} className="calendar__month">
            <caption>{monthLabel(m)}</caption>
            <thead>
              <tr>
                {WEEKDAYS.map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(m, ranges, today).map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    if (!day) return <td key={di} className="calendar__empty" />;
                    const selected =
                      day.date === arrival ||
                      day.date === departure ||
                      (arrival && departure && day.date > arrival && day.date < departure);
                    const pickable = onPick && day.state !== 'past' && day.state !== 'booked';
                    return (
                      <td
                        key={di}
                        className={`calendar__day is-${day.state}${selected ? ' is-selected' : ''}`}
                      >
                        {pickable ? (
                          <button
                            type="button"
                            onClick={() => onPick(day.date)}
                            aria-label={`${day.day}. ${monthLabel(m)}: ${STATE_LABEL[day.state]}`}
                          >
                            {day.day}
                          </button>
                        ) : (
                          <span
                            aria-label={`${day.day}. ${monthLabel(m)}: ${STATE_LABEL[day.state]}`}
                          >
                            {day.day}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <p className="calendar__legend">
        <span className="legend legend--free" /> frei <span className="legend legend--booked" />{' '}
        belegt
      </p>
    </div>
  );
}
