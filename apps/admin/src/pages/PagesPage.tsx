import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Api } from '../api/endpoints.ts';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  TextField,
  useAction,
} from '../components/ui.tsx';
import { formatDateTime } from '../lib/dates.ts';
import { useApi } from '../lib/useApi.ts';
import { slugify } from './AccommodationEditPage.tsx';

export const publicUrl = (slug: string) => (slug === 'home' ? '/' : `/${slug}/`);

export function PagesPage() {
  const { data, error, loading, reload } = useApi(() => Api.pages());
  const navigate = useNavigate();
  const [creating, setCreating] = useState<{ title: string; slug: string } | null>(null);
  const { busy, run } = useAction();

  const create = async () => {
    if (!creating?.title || !creating.slug) return;
    const page = await run(
      () =>
        Api.savePage({
          slug: creating.slug,
          title: creating.title,
          metaTitle: '',
          metaDescription: '',
          showInMenu: false,
          menuOrder: 50,
          showInFooter: false,
          blocks: [{ id: `text-${Date.now()}`, type: 'richText', html: '<p>Neuer Text</p>' }],
        }),
      'Seite angelegt',
    );
    if (page) navigate(`/inhalte/${page.slug}`);
  };

  return (
    <div className="stack">
      <PageHeader
        title="Inhalte"
        intro="Texte und Bilder der Seiten. Die Unterkunftsseiten bearbeitest du unter „Unterkünfte“."
        actions={
          <Button variant="primary" onClick={() => setCreating({ title: '', slug: '' })}>
            + Neue Seite
          </Button>
        }
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="Noch keine Seiten"
          hint="Seiten entstehen beim WordPress-Import oder über „Neue Seite“."
        />
      ) : null}
      {data && data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Seite</th>
                <th>Adresse</th>
                <th>Anzeige</th>
                <th>Geändert</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr
                  key={p.slug}
                  className="clickable"
                  onClick={() => navigate(`/inhalte/${p.slug}`)}
                >
                  <td>
                    <strong>{p.title}</strong>
                    <div className="muted small">{p.blocks.length} Blöcke</div>
                  </td>
                  <td className="small">
                    <a
                      href={publicUrl(p.slug)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {publicUrl(p.slug)}
                    </a>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      {p.slug === 'home' ? <Badge tone="accent">Startseite</Badge> : null}
                      {p.showInMenu ? <Badge tone="info">Menü</Badge> : null}
                      {p.showInFooter ? <Badge>Footer</Badge> : null}
                    </div>
                  </td>
                  <td className="small">{formatDateTime(p.updatedAt)}</td>
                  <td>
                    <Link
                      className="btn btn-sm"
                      to={`/inhalte/${p.slug}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Bearbeiten
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Dialog
        open={creating !== null}
        title="Neue Seite"
        onClose={() => setCreating(null)}
        footer={
          <>
            <Button onClick={() => setCreating(null)}>Abbrechen</Button>
            <Button
              variant="primary"
              busy={busy}
              disabled={!creating?.title || !creating?.slug}
              onClick={() => void create()}
            >
              Anlegen
            </Button>
          </>
        }
      >
        {creating ? (
          <>
            <TextField
              label="Titel"
              value={creating.title}
              onChange={(v) => setCreating({ title: v, slug: slugify(v) })}
            />
            <TextField
              label="Adresse"
              value={creating.slug}
              hint={`Webseite: /${creating.slug || '…'}/`}
              onChange={(v) => setCreating({ ...creating, slug: slugify(v) })}
            />
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
