import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, type Booking } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { BookingDrawer, NewBookingDialog } from '../components/BookingDialogs.tsx';
import { Button, EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui.tsx';
import {
  barPosition,
  isOccupied,
  monthDays,
  monthLabel,
  monthStart,
  shiftMonth,
  todayIso,
  WEEKDAYS_SHORT,
} from '../lib/dates.ts';
import { guestName, SOURCE_LABEL, SOURCES } from '../lib/labels.ts';
import { useApi } from '../lib/useApi.ts';

const NAME_COL = 170;
const DAY_COL = 40;

export function CalendarPage() {
  const today = todayIso();
  const [month, setMonth] = useState(monthStart(today));
  const days = useMemo(() => monthDays(month), [month]);
  const from = days[0]!.date;
  const to = addDays(days.at(-1)!.date, 1);
  const { data, error, loading, reload, setData } = useApi(
    () => Api.calendar(from, to),
    [from, to],
  );

  const [selected, setSelected] = useState<Booking | null>(null);
  const [drag, setDrag] = useState<{ accId: string; start: string; end: string } | null>(null);
  const [newBooking, setNewBooking] = useState<{
    accommodationId: string;
    arrival: string;
    departure: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasData = Boolean(data);
  // Heute in den sichtbaren Bereich scrollen
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = days.findIndex((d) => d.date === today);
    el.scrollLeft = idx > 3 ? (idx - 3) * DAY_COL : 0;
  }, [days, today, hasData]);

  const accs = data?.accommodations ?? [];
  const byAcc = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of data?.bookings ?? [])
      m.set(b.accommodationId, [...(m.get(b.accommodationId) ?? []), b]);
    return m;
  }, [data]);

  const startDrag = (accId: string, date: string) => setDrag({ accId, start: date, end: date });
  const moveDrag = (accId: string, date: string) => {
    if (drag && drag.accId === accId) setDrag({ ...drag, end: date });
  };
  const endDrag = () => {
    if (!drag) return;
    const a = drag.start < drag.end ? drag.start : drag.end;
    const b = drag.start < drag.end ? drag.end : drag.start;
    setNewBooking({ accommodationId: drag.accId, arrival: a, departure: addDays(b, 1) });
    setDrag(null);
  };
  const inDrag = (accId: string, date: string) => {
    if (!drag || drag.accId !== accId) return false;
    const [a, b] = drag.start < drag.end ? [drag.start, drag.end] : [drag.end, drag.start];
    return date >= a && date <= b;
  };

  const cols = `${NAME_COL}px repeat(${days.length}, ${DAY_COL}px)`;

  return (
    <div className="stack" onMouseUp={endDrag} onMouseLeave={() => setDrag(null)}>
      <PageHeader
        title="Kalender"
        intro="Klicke auf einen freien Tag (oder ziehe über mehrere Tage), um eine Buchung oder Sperre anzulegen. Klicke auf einen Balken für Details."
        actions={
          <Button
            variant="primary"
            onClick={() =>
              setNewBooking({
                accommodationId: accs[0]?.id ?? '',
                arrival: today,
                departure: addDays(today, 1),
              })
            }
          >
            + Buchung / Sperre
          </Button>
        }
      />

      <div className="cal-toolbar">
        <Button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Vorheriger Monat">
          ←
        </Button>
        <h2>{monthLabel(month)}</h2>
        <Button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Nächster Monat">
          →
        </Button>
        <Button variant="ghost" onClick={() => setMonth(monthStart(today))}>
          Heute
        </Button>
        {loading ? <span className="muted small">lädt …</span> : null}
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {!data && loading ? <Loading /> : null}
      {data && accs.length === 0 ? (
        <EmptyState
          title="Noch keine Unterkünfte"
          hint="Lege zuerst unter „Unterkünfte“ eine Unterkunft an."
        />
      ) : null}

      {data && accs.length > 0 ? (
        <div className="cal-scroll" ref={scrollRef}>
          <div
            className="cal-grid"
            style={{ gridTemplateColumns: cols }}
            role="grid"
            aria-label={`Belegung ${monthLabel(month)}`}
          >
            <div className="cal-corner" style={{ gridRow: 1, gridColumn: 1 }} />
            {days.map((d, i) => (
              <div
                key={d.date}
                className={`cal-head ${d.weekend ? 'weekend' : ''} ${d.date === today ? 'today' : ''}`}
                style={{ gridRow: 1, gridColumn: i + 2 }}
              >
                {WEEKDAYS_SHORT[d.weekday]}
                <strong>{d.day}</strong>
              </div>
            ))}
            {accs.map((acc, r) => {
              const row = r + 2;
              const bookings = byAcc.get(acc.id) ?? [];
              return [
                <div
                  key={`n-${acc.id}`}
                  className="cal-name"
                  style={{ gridRow: row, gridColumn: 1 }}
                  title={acc.name}
                >
                  {acc.name}
                </div>,
                ...days.map((d, i) => {
                  const occupied = isOccupied(d.date, bookings);
                  return (
                    <div
                      key={`${acc.id}-${d.date}`}
                      role="gridcell"
                      aria-label={`${acc.name} ${d.date} ${occupied ? 'belegt' : 'frei'}`}
                      className={`cal-cell ${d.weekend ? 'weekend' : ''} ${d.date < today ? 'past' : ''} ${inDrag(acc.id, d.date) ? 'selecting' : ''}`}
                      style={{ gridRow: row, gridColumn: i + 2 }}
                      onMouseDown={(e) => {
                        if (e.button === 0 && !occupied) {
                          e.preventDefault();
                          startDrag(acc.id, d.date);
                        }
                      }}
                      onMouseEnter={() => moveDrag(acc.id, d.date)}
                    />
                  );
                }),
                ...bookings.map((b) => {
                  const pos = barPosition(b.arrival, b.departure, days);
                  if (!pos) return null;
                  return (
                    <button
                      type="button"
                      key={b.id}
                      className={`cal-bar src-${b.source} ${b.status === 'pending' ? 'pending' : ''} ${pos.clippedStart ? 'clip-start' : ''} ${pos.clippedEnd ? 'clip-end' : ''}`}
                      style={{ gridRow: row, gridColumn: `${pos.startCol + 2} / span ${pos.span}` }}
                      title={`${guestName(b.guest, b.source)} · ${SOURCE_LABEL[b.source]} · ${b.arrival} – ${b.departure}`}
                      onClick={() => setSelected(b)}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <span>{guestName(b.guest, b.source)}</span>
                    </button>
                  );
                }),
              ];
            })}
          </div>
        </div>
      ) : null}

      <div className="legend" aria-label="Legende">
        {SOURCES.map((s) => (
          <span key={s}>
            <i className={`src-${s}`} /> {SOURCE_LABEL[s]}
          </span>
        ))}
        <span>Gestreift = offen</span>
      </div>

      <NewBookingDialog
        open={newBooking !== null}
        onClose={() => setNewBooking(null)}
        accommodations={accs}
        initial={newBooking ?? undefined}
        onCreated={() => void reload()}
      />
      <BookingDrawer
        booking={selected}
        accommodations={accs}
        onClose={() => setSelected(null)}
        onChanged={(b) => {
          setSelected(b.status === 'cancelled' ? null : b);
          if (data)
            setData({
              ...data,
              bookings: data.bookings
                .map((x) => (x.id === b.id ? b : x))
                .filter((x) => x.status !== 'cancelled'),
            });
        }}
      />
    </div>
  );
}
