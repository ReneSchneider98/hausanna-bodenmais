import { Link } from 'react-router';
import type { Dashboard, DashboardEvent } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  useAction,
} from '../components/ui.tsx';
import { formatDate, formatDateTime } from '../lib/dates.ts';
import { SOURCE_LABEL } from '../lib/labels.ts';
import { useApi } from '../lib/useApi.ts';
import type { BookingSource } from '@hausanna/shared';

const LEVEL_ICON = { error: '!', warning: '▲', info: 'i' } as const;
const LEVEL_LABEL = { error: 'Fehler', warning: 'Warnung', info: 'Info' } as const;
const CATEGORY_LABEL: Record<DashboardEvent['category'], string> = {
  booking: 'Buchung',
  channel: 'Kanal',
  system: 'System',
  auth: 'Benutzer',
  content: 'Inhalt',
};

function Stat({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`card stat ${alert ? 'stat-alert' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Movements({
  title,
  items,
  empty,
}: {
  title: string;
  items: Dashboard['arrivals'];
  empty: string;
}) {
  return (
    <Card title={title}>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="list">
          {items.map((a) => (
            <li key={`${a.bookingId}-${a.date}`}>
              <div>
                <strong>{a.accommodationName}</strong>
                <div className="muted small">
                  {a.guestName} · {SOURCE_LABEL[a.source as BookingSource] ?? a.source}
                </div>
              </div>
              <span className="nowrap">{formatDate(a.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const { data, error, loading, reload } = useApi(() => Api.dashboard());
  const { run, busy } = useAction();

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;

  const { stats, events, health } = data;
  const markRead = async (id: string) => {
    await run(() => Api.readEvent(id));
    await reload();
  };

  return (
    <div className="stack">
      <PageHeader
        title="Dashboard"
        intro="Das Wichtigste auf einen Blick."
        actions={
          <Link className="btn btn-primary" to="/kalender">
            Zum Kalender
          </Link>
        }
      />

      <div className="grid-4">
        <Stat label="Buchungen nächste 30 Tage" value={stats.bookingsNext30Days} />
        <Stat label="Auslastung nächste 30 Tage" value={`${stats.occupancyNext30DaysPercent} %`} />
        <Stat label="Neue Buchungen (7 Tage)" value={stats.newBookingsLast7Days} />
        <Stat
          label={
            stats.unreadErrors > 0
              ? `Ungelesene Meldungen, davon ${stats.unreadErrors} Fehler`
              : 'Ungelesene Meldungen'
          }
          value={stats.unreadEvents}
          alert={stats.unreadErrors > 0}
        />
      </div>

      <div className="grid-2">
        <Movements
          title="Anreisen (7 Tage)"
          items={data.arrivals}
          empty="Keine Anreisen in den nächsten 7 Tagen."
        />
        <Movements
          title="Abreisen (7 Tage)"
          items={data.departures}
          empty="Keine Abreisen in den nächsten 7 Tagen."
        />
      </div>

      <Card
        title="Meldungen"
        actions={
          events.some((e) => !e.readAt) ? (
            <Button
              size="sm"
              busy={busy}
              onClick={async () => {
                await run(() => Api.readAllEvents(), 'Alle als gelesen markiert');
                await reload();
              }}
            >
              Alle gelesen
            </Button>
          ) : null
        }
      >
        {events.length === 0 ? (
          <EmptyState
            title="Keine Meldungen"
            hint="Hier erscheinen neue Buchungen, Abgleich-Fehler und Warnungen."
          />
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} className={`event event-${e.level} ${e.readAt ? 'read' : ''}`}>
                <span className="event-icon" aria-label={LEVEL_LABEL[e.level]}>
                  {LEVEL_ICON[e.level]}
                </span>
                <div className="stack-sm" style={{ gap: 2 }}>
                  <span>{e.message}</span>
                  <span className="muted small">
                    {formatDateTime(e.createdAt)} · {CATEGORY_LABEL[e.category]}
                  </span>
                </div>
                {e.readAt ? (
                  <span className="muted small">gelesen</span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => void markRead(e.id)}>
                    Gelesen
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="System-Status">
        <div className="row">
          {Object.entries(health).map(([name, status]) => (
            <span key={name} className="row" style={{ gap: 0 }}>
              <span className={`status-dot ${status}`} aria-hidden />
              <span>
                {name === 'postgres'
                  ? 'Datenbank (PostgreSQL)'
                  : name === 'mongodb'
                    ? 'Inhalte (MongoDB)'
                    : name}
                :{' '}
                <Badge tone={status === 'up' ? 'success' : 'danger'}>
                  {status === 'up' ? 'läuft' : 'gestört'}
                </Badge>
              </span>
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
