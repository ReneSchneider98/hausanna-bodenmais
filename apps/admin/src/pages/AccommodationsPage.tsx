import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { AccommodationStatus } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  Toggle,
  type Tone,
} from '../components/ui.tsx';
import { euro } from '../lib/labels.ts';
import { useApi } from '../lib/useApi.ts';

export const ACC_STATUS: Record<AccommodationStatus, { label: string; tone: Tone }> = {
  published: { label: 'Veröffentlicht', tone: 'success' },
  draft: { label: 'Entwurf', tone: 'warning' },
  archived: { label: 'Archiviert', tone: 'neutral' },
};

export function AccommodationsPage() {
  const [archived, setArchived] = useState(false);
  const { data, error, loading, reload } = useApi(() => Api.accommodations(archived), [archived]);
  const navigate = useNavigate();

  return (
    <div className="stack">
      <PageHeader
        title="Unterkünfte"
        intro="Ferienwohnungen und Apartments, die auf der Webseite gebucht werden können."
        actions={
          <Link className="btn btn-primary" to="/unterkuenfte/neu">
            + Neue Unterkunft
          </Link>
        }
      />
      <Toggle label="Archivierte anzeigen" checked={archived} onChange={setArchived} />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="Noch keine Unterkünfte"
          hint="Lege die erste Unterkunft an."
          action={
            <Link className="btn btn-primary" to="/unterkuenfte/neu">
              Unterkunft anlegen
            </Link>
          }
        />
      ) : null}
      {data && data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Reihenfolge</th>
                <th>Name</th>
                <th>Größe / Personen</th>
                <th className="num">Grundpreis</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr
                  key={a.id}
                  className="clickable"
                  onClick={() => navigate(`/unterkuenfte/${a.id}`)}
                >
                  <td>{a.sortOrder}</td>
                  <td>
                    <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                      {a.coverImage ? (
                        <img
                          src={a.coverImage.url}
                          alt=""
                          style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ) : null}
                      <div>
                        <strong>{a.name}</strong>
                        <div className="muted small">/{a.slug}/</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {a.sizeSqm} m² · bis {a.maxGuests} Pers.
                  </td>
                  <td className="num nowrap">
                    {euro(a.basePricePerNight)}{' '}
                    <span className="muted small">/ Nacht für {a.baseGuests}</span>
                  </td>
                  <td>
                    <Badge tone={ACC_STATUS[a.status].tone}>{ACC_STATUS[a.status].label}</Badge>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/unterkuenfte/${a.id}`);
                      }}
                    >
                      Bearbeiten
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
