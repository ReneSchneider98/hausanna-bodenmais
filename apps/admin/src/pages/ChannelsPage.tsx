import { useState } from 'react';
import type { ChannelConnection, ChannelOverview } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Loading,
  PageHeader,
  TextField,
  Toggle,
  useAction,
  useFeedback,
} from '../components/ui.tsx';
import { formatDateTime, relativeTime } from '../lib/dates.ts';
import { useApi } from '../lib/useApi.ts';

const PROVIDER = {
  none: { label: 'Keine Anbindung', tone: 'neutral' as const },
  beds24: { label: 'Beds24 (Echtzeit)', tone: 'success' as const },
  ical: { label: 'iCal (kostenlos, verzögert)', tone: 'info' as const },
};

function CopyField({ label, value }: { label: string; value: string }) {
  const { toast } = useFeedback();
  return (
    <div className="field">
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
      <div className="copy-field">
        <input
          className="input"
          readOnly
          value={value}
          aria-label={label}
          onFocus={(e) => e.target.select()}
        />
        <Button
          size="sm"
          onClick={() =>
            void navigator.clipboard
              .writeText(value)
              .then(() => toast('Kopiert'))
              .catch(() => toast('Kopieren nicht möglich – bitte markieren und Strg+C', 'error'))
          }
        >
          Kopieren
        </Button>
      </div>
    </div>
  );
}

function ConnectionCard({
  conn,
  provider,
  onSaved,
}: {
  conn: ChannelConnection;
  provider: ChannelOverview['provider'];
  onSaved: (o: ChannelOverview) => void;
}) {
  const [enabled, setEnabled] = useState(conn.enabled);
  const [roomId, setRoomId] = useState(conn.beds24RoomId ?? '');
  const [urls, setUrls] = useState<string[]>(conn.icalImportUrls);
  const { busy, run } = useAction();

  const save = async () => {
    const clean = urls.map((u) => u.trim()).filter(Boolean);
    const o = await run(
      () =>
        Api.updateChannel(conn.accommodationId, {
          enabled,
          beds24RoomId: roomId.trim() || null,
          icalImportUrls: clean,
        }),
      `${conn.accommodationName} gespeichert`,
    );
    if (o) onSaved(o);
  };

  return (
    <Card
      title={conn.accommodationName}
      actions={
        <Badge tone={conn.lastError ? 'danger' : conn.enabled ? 'success' : 'neutral'}>
          {conn.lastError ? 'Fehler' : conn.enabled ? 'Aktiv' : 'Aus'}
        </Badge>
      }
    >
      <div className="stack">
        <Toggle label="Mit Portalen abgleichen" checked={enabled} onChange={setEnabled} />
        {conn.lastError ? <ErrorBox message={`Letzter Fehler: ${conn.lastError}`} /> : null}
        <dl className="dl small">
          <dt>Letzter Abgleich</dt>
          <dd>
            {conn.lastSyncAt
              ? `${relativeTime(conn.lastSyncAt)} (${formatDateTime(conn.lastSyncAt)})`
              : 'noch nie'}
          </dd>
          <dt>Kalender abgeholt</dt>
          <dd>
            {conn.lastExportFetchAt
              ? `${relativeTime(conn.lastExportFetchAt)} (${formatDateTime(conn.lastExportFetchAt)})`
              : 'noch nie'}
          </dd>
        </dl>
        {provider !== 'ical' ? (
          <TextField
            label="Beds24 Room-ID"
            value={roomId}
            onChange={setRoomId}
            placeholder="z. B. 123456"
            hint="Zu finden in Beds24 unter Settings → Properties → Rooms."
          />
        ) : null}
        {provider !== 'beds24' ? (
          <div className="stack-sm">
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              iCal-Import (Export-Links von Booking.com / Airbnb)
            </span>
            {urls.map((u, i) => (
              <div className="copy-field" key={i}>
                <input
                  className="input"
                  value={u}
                  placeholder="https://admin.booking.com/…/ical.html?t=…"
                  aria-label={`iCal-Link ${i + 1}`}
                  onChange={(e) => setUrls(urls.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Link entfernen"
                  onClick={() => setUrls(urls.filter((_, j) => j !== i))}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button size="sm" onClick={() => setUrls([...urls, ''])}>
              + Link hinzufügen
            </Button>
          </div>
        ) : null}
        {provider !== 'beds24' ? (
          <div className="stack-sm">
            <CopyField
              label="Unser Kalender für Booking.com"
              value={conn.icalExportUrls.booking_com}
            />
            <CopyField label="Unser Kalender für Airbnb" value={conn.icalExportUrls.airbnb} />
          </div>
        ) : null}
        <div className="form-actions">
          <Button variant="primary" busy={busy} onClick={() => void save()}>
            Speichern
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ChannelsPage() {
  const { data, setData, error, loading, reload } = useApi(() => Api.channels());
  const { busy, run } = useAction();

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const p = PROVIDER[data.provider];

  return (
    <div className="stack">
      <PageHeader
        title="Kanäle"
        intro="Verbindung zu Booking.com und Airbnb. Unsere Webseite ist die zentrale Stelle für alle Buchungen."
        actions={
          <Button
            variant="primary"
            busy={busy}
            disabled={data.provider === 'none'}
            onClick={async () => {
              const o = await run(() => Api.syncChannels(), 'Abgleich abgeschlossen');
              if (o) setData(o);
            }}
          >
            Jetzt abgleichen
          </Button>
        }
      />
      <Card title="Status">
        <div className="grid-4">
          <div className="stat">
            <span className="stat-label">Anbindung</span>
            <Badge tone={p.tone}>{p.label}</Badge>
          </div>
          <div className="stat">
            <span className="stat-label">Eingerichtet</span>
            <Badge tone={data.configured ? 'success' : 'warning'}>
              {data.configured ? 'Ja' : 'Nein'}
            </Badge>
          </div>
          <div className="stat">
            <span className="stat-label">Letzter Lauf</span>
            <span>
              {relativeTime(data.lastRunAt)} · alle {data.syncIntervalMinutes} Min.
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Meldungen an Portale</span>
            <span>
              {data.pendingPushes} wartend ·{' '}
              <span
                style={data.failedPushes ? { color: 'var(--danger)', fontWeight: 650 } : undefined}
              >
                {data.failedPushes} fehlgeschlagen
              </span>
            </span>
          </div>
        </div>
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          <span>
            <strong>Beds24</strong> meldet Buchungen in Sekunden an Booking.com und Airbnb (ca. 11
            €/Monat). <strong>iCal</strong> ist kostenlos, Booking.com holt den Kalender aber nur
            ca. alle 2 Stunden ab. Die Anbindung wird in der Server-Konfiguration gewählt (
            <span className="mono">CHANNEL_PROVIDER</span>).
          </span>
        </div>
      </Card>
      <div className="grid-2">
        {data.connections.map((c) => (
          <ConnectionCard
            key={`${c.accommodationId}-${c.enabled}-${c.beds24RoomId}-${c.icalImportUrls.join('|')}`}
            conn={c}
            provider={data.provider}
            onSaved={setData}
          />
        ))}
      </div>
    </div>
  );
}
