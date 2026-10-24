import { useMemo, useState } from 'react';
import type { MediaItem } from '@hausanna/shared';
import { Api } from '../api/endpoints.ts';
import {
  Button,
  Dialog,
  EmptyState,
  ErrorBox,
  Loading,
  PageHeader,
  TextField,
  useAction,
  useFeedback,
} from '../components/ui.tsx';
import { formatDateTime } from '../lib/dates.ts';
import { useApi } from '../lib/useApi.ts';

const kb = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n ? `${Math.round(n / 1024)} KB` : '';

export function MediaPage() {
  const { data, error, loading, reload } = useApi(() => Api.media());
  const [filter, setFilter] = useState('');
  const [drag, setDrag] = useState(false);
  const [edit, setEdit] = useState<MediaItem | null>(null);
  const [alt, setAlt] = useState('');
  const { busy, run } = useAction();
  const { confirm, toast } = useFeedback();

  const items = useMemo(
    () =>
      (data ?? []).filter(
        (m) =>
          !filter ||
          `${m.filename} ${m.alt} ${m.folder}`.toLowerCase().includes(filter.toLowerCase()),
      ),
    [data, filter],
  );

  const upload = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    await run(
      async () => {
        for (const f of list) await Api.uploadMedia(f);
      },
      `${list.length} ${list.length === 1 ? 'Bild' : 'Bilder'} hochgeladen`,
    );
    await reload();
  };

  const remove = async (m: MediaItem) => {
    if (
      !(await confirm({
        title: 'Bild löschen?',
        text: `„${m.filename}“ wird endgültig gelöscht. Wird es noch auf einer Seite verwendet, fehlt es dort.`,
        confirmLabel: 'Löschen',
        danger: true,
      }))
    )
      return;
    await run(() => Api.deleteMedia(m.id), 'Bild gelöscht');
    setEdit(null);
    await reload();
  };

  return (
    <div className="stack">
      <PageHeader
        title="Medien"
        intro="Alle Bilder der Webseite. Hochladen per Klick oder einfach hierher ziehen."
      />
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload(e.dataTransfer.files);
        }}
      >
        <p>Bilder hierher ziehen oder</p>
        <label className="btn btn-primary" style={{ marginTop: 10 }} aria-busy={busy}>
          Bilder auswählen
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
        <p className="small" style={{ marginTop: 8 }}>
          JPG, PNG, WebP, GIF, SVG · max. 15 MB
        </p>
      </div>
      <TextField
        label="Suchen"
        placeholder="Dateiname oder Ordner"
        value={filter}
        onChange={setFilter}
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && items.length === 0 ? <EmptyState title="Keine Bilder gefunden" /> : null}
      <p className="muted small">{items.length} Bilder</p>
      <div className="media-grid">
        {items.map((m) => (
          <button
            type="button"
            key={m.id}
            className="media-tile"
            onClick={() => {
              setEdit(m);
              setAlt(m.alt);
            }}
          >
            <img src={m.url} alt={m.alt} loading="lazy" />
            <span className="media-meta" title={m.filename}>
              {m.filename}
            </span>
          </button>
        ))}
      </div>
      <Dialog
        open={edit !== null}
        title="Bild"
        onClose={() => setEdit(null)}
        footer={
          edit ? (
            <>
              <Button
                variant="danger"
                onClick={() => void remove(edit)}
                style={{ marginRight: 'auto' }}
              >
                Löschen
              </Button>
              <Button onClick={() => setEdit(null)}>Schließen</Button>
              <Button
                variant="primary"
                busy={busy}
                onClick={async () => {
                  await run(() => Api.updateMedia(edit.id, alt), 'Gespeichert');
                  setEdit(null);
                  await reload();
                }}
              >
                Speichern
              </Button>
            </>
          ) : null
        }
      >
        {edit ? (
          <>
            <img
              src={edit.url}
              alt={edit.alt}
              style={{
                width: '100%',
                maxHeight: 340,
                objectFit: 'contain',
                background: '#f2f0ea',
                borderRadius: 8,
              }}
            />
            <TextField
              label="Bildbeschreibung (Alt-Text)"
              value={alt}
              onChange={setAlt}
              hint="Wichtig für Google und blinde Besucher. Kurz beschreiben, was zu sehen ist."
            />
            <div className="copy-field">
              <input className="input" readOnly value={edit.url} aria-label="Bild-Adresse" />
              <Button
                size="sm"
                onClick={() =>
                  void navigator.clipboard.writeText(edit.url).then(() => toast('Adresse kopiert'))
                }
              >
                Adresse kopieren
              </Button>
            </div>
            <p className="muted small">
              {edit.filename} · {kb(edit.size)} · {formatDateTime(edit.uploadedAt)}
            </p>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
