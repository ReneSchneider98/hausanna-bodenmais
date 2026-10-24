import { useMemo, useState } from 'react';
import {
  addDays,
  type Booking,
  type BookingSource,
  type BookingStatus,
  nightsBetween,
} from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import { BookingDrawer, NewBookingDialog } from '../components/BookingDialogs.tsx';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  SelectField,
  TextField,
} from '../components/ui.tsx';
import { formatDate, todayIso } from '../lib/dates.ts';
import {
  euro,
  guestName,
  SOURCE_LABEL,
  SOURCES,
  STATUS_LABEL,
  STATUS_TONE,
  SYNC_LABEL,
} from '../lib/labels.ts';
import { useApi } from '../lib/useApi.ts';

export function BookingsPage() {
  const today = todayIso();
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(addDays(today, 365));
  const [accommodationId, setAccommodationId] = useState('');
  const [status, setStatus] = useState<'' | BookingStatus>('');
  const [source, setSource] = useState<'' | BookingSource>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);

  const accsQ = useApi(() => Api.accommodations());
  const accs = (accsQ.data ?? []).map((a) => ({ id: a.id, name: a.name }));
  const accName = (id: string) => accs.find((a) => a.id === id)?.name ?? '–';

  const { data, error, loading, reload } = useApi(
    () =>
      Api.bookings({
        from,
        to,
        accommodationId: accommodationId || undefined,
        status: status || undefined,
        source: source || undefined,
      }),
    [from, to, accommodationId, status, source],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (b) =>
        !q ||
        `${b.reference} ${b.guest?.firstName ?? ''} ${b.guest?.lastName ?? ''} ${b.guest?.email ?? ''}`
          .toLowerCase()
          .includes(q),
    );
  }, [data, search]);

  return (
    <div className="stack">
      <PageHeader
        title="Buchungen"
        intro="Alle Buchungen und Sperren. Klicke auf eine Zeile für Details."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            + Buchung / Sperre
          </Button>
        }
      />

      <div className="card">
        <div className="grid-3">
          <TextField label="Von" type="date" value={from} onChange={setFrom} />
          <TextField label="Bis" type="date" value={to} onChange={setTo} />
          <TextField
            label="Suche"
            placeholder="Name, E-Mail, Buchungsnr."
            value={search}
            onChange={setSearch}
          />
          <SelectField
            label="Unterkunft"
            value={accommodationId}
            onChange={setAccommodationId}
            options={[
              { value: '', label: 'Alle' },
              ...accs.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <SelectField
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'Alle' },
              ...(['confirmed', 'pending', 'cancelled'] as const).map((s) => ({
                value: s,
                label: STATUS_LABEL[s],
              })),
            ]}
          />
          <SelectField
            label="Quelle"
            value={source}
            onChange={setSource}
            options={[
              { value: '', label: 'Alle' },
              ...SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] })),
            ]}
          />
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && rows.length === 0 ? (
        <EmptyState
          title="Keine Buchungen gefunden"
          hint="Passe die Filter an oder lege eine Buchung an."
        />
      ) : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Zeitraum</th>
                <th>Unterkunft</th>
                <th>Gast</th>
                <th>Quelle</th>
                <th>Status</th>
                <th className="num">Preis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="clickable"
                  onClick={() => setSelected(b)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(b)}
                >
                  <td className="nowrap">
                    {formatDate(b.arrival)} – {formatDate(b.departure)}
                    <div className="muted small">
                      {nightsBetween(b.arrival, b.departure)} Nächte
                    </div>
                  </td>
                  <td>{accName(b.accommodationId)}</td>
                  <td>
                    {guestName(b.guest, b.source)}
                    <div className="muted small mono">{b.reference}</div>
                  </td>
                  <td>{SOURCE_LABEL[b.source]}</td>
                  <td>
                    <div className="stack-sm" style={{ gap: 4, alignItems: 'flex-start' }}>
                      <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                      {b.channelSyncState === 'failed' || b.channelSyncState === 'pending' ? (
                        <Badge tone={SYNC_LABEL[b.channelSyncState].tone}>
                          {SYNC_LABEL[b.channelSyncState].label}
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="num">{euro(b.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {data ? <p className="muted small">{rows.length} Einträge</p> : null}

      <NewBookingDialog
        open={creating}
        onClose={() => setCreating(false)}
        accommodations={accs}
        onCreated={(b) => {
          void reload();
          setSelected(b);
        }}
      />
      <BookingDrawer
        booking={selected}
        accommodations={accs}
        onClose={() => setSelected(null)}
        onChanged={(b) => {
          setSelected(b);
          void reload();
        }}
      />
    </div>
  );
}
